import {
  and,
  eq,
  gte,
  isNull,
  like,
  lte,
  SQLWrapper,
  desc,
  inArray,
} from "drizzle-orm";
import { db } from "../../../..";
import {
  athleteQueryFilterSchema,
  createAthleteSchema,
  transferAthleteSchema,
} from "./model";
import { athleteCareer, athletes, teams } from "../../../../db/schema";
import z from "zod";
import { status } from "elysia";

abstract class Athlete {
  static async fetchByTeam(
    teamId: string,
    filter: z.infer<typeof athleteQueryFilterSchema>,
  ) {
    const filters: SQLWrapper[] = [];

    if (filter.current) {
      filters.push(isNull(athleteCareer.finishedAt));
    }

    if (filter.from) {
      filters.push(gte(athleteCareer.startedAt, filter.from));
    }

    if (filter.to) {
      filters.push(lte(athleteCareer.finishedAt, filter.to));
    }

    if (filter.position) {
      filters.push(eq(athleteCareer.position, filter.position));
    }

    if (filter.name) {
      filters.push(like(athletes.name, filter.name));
    }

    return await db
      .select({
        teamId: athleteCareer.teamId,
        athleteId: athleteCareer.athleteId,
        name: athletes.name,
        birthdate: athletes.birthdate,
        position: athleteCareer.position,
        goals: athleteCareer.goals,
        assists: athleteCareer.assists,
        redCards: athleteCareer.redCards,
        yellowCards: athleteCareer.yellowCards,
        matches: athleteCareer.matches,
      })
      .from(athleteCareer)
      .innerJoin(athletes, eq(athleteCareer.athleteId, athletes.id))
      .where(and(eq(athleteCareer.teamId, teamId), ...filters));
  }

  static async create(
    teamId: string,
    ownerId: string,
    payload: z.infer<typeof createAthleteSchema>,
  ) {
    // 1. Validate team ownership
    const team = await db.query.teams.findFirst({
      where: (row) => and(eq(row.id, teamId), eq(row.createdBy, ownerId)),
      columns: { id: true },
    });

    if (!team) {
      throw status(
        403,
        "Você não tem permissão para adicionar atletas a este time.",
      );
    }

    // 2. Check if shirt number is already taken in this team
    const existingShirtNumber = await db.query.athleteCareer.findFirst({
      where: (row) =>
        and(
          eq(row.teamId, teamId),
          eq(row.shirtNumber, payload.shirtNumber),
          isNull(row.finishedAt),
        ),
      columns: { athleteId: true },
    });

    if (existingShirtNumber) {
      throw status(
        409,
        "Este número de camisa já está sendo utilizado por outro atleta.",
      );
    }

    // 3. Atomic creation using transaction
    return await db.transaction(async (tx) => {
      const [athlete] = await tx
        .insert(athletes)
        .values({
          name: payload.name,
          birthdate: payload.birthdate,
        })
        .returning();

      const [career] = await tx
        .insert(athleteCareer)
        .values({
          athleteId: athlete.id,
          teamId: teamId,
          shirtNumber: payload.shirtNumber,
          position: payload.position,
        })
        .returning();

      return {
        ...athlete,
        ...career,
      };
    });
  }

  static async transfer(
    athleteId: string,
    sourceTeamId: string,
    ownerId: string,
    payload: z.infer<typeof transferAthleteSchema>,
  ) {
    const targetTeamId = payload.targetTeamId;

    // 1. Validate both teams are owned by the user
    const userTeams = await db.query.teams.findMany({
      where: (row) =>
        and(
          inArray(row.id, [sourceTeamId, targetTeamId]),
          eq(row.createdBy, ownerId),
        ),
      columns: { id: true },
    });

    if (userTeams.length !== 2) {
      throw status(
        403,
        "Você não tem permissão para transferir atletas entre estes times.",
      );
    }

    // 2. Validate source and target are different
    if (sourceTeamId === targetTeamId) {
      throw status(400, "O time de origem e destino devem ser diferentes.");
    }

    // 3. Check athlete has active career with source team
    const currentCareer = await db.query.athleteCareer.findFirst({
      where: (row) =>
        and(
          eq(row.athleteId, athleteId),
          eq(row.teamId, sourceTeamId),
          isNull(row.finishedAt),
        ),
    });

    if (!currentCareer) {
      throw status(
        404,
        "Atleta não encontrado no time de origem ou já foi transferido.",
      );
    }

    // 4. Check athlete doesn't already have career with target team
    const existingTargetCareer = await db.query.athleteCareer.findFirst({
      where: (row) =>
        and(
          eq(row.athleteId, athleteId),
          eq(row.teamId, targetTeamId),
          isNull(row.finishedAt),
        ),
      columns: { athleteId: true },
    });

    if (existingTargetCareer) {
      throw status(
        409,
        "Atleta já possui vínculo ativo com o time de destino.",
      );
    }

    // 5. If shirt number provided, check if it's taken in target team
    const newShirtNumber = payload.shirtNumber ?? currentCareer.shirtNumber;
    if (payload.shirtNumber !== undefined) {
      const takenShirtNumber = await db.query.athleteCareer.findFirst({
        where: (row) =>
          and(
            eq(row.teamId, targetTeamId),
            eq(row.shirtNumber, newShirtNumber),
            isNull(row.finishedAt),
          ),
        columns: { athleteId: true },
      });

      if (takenShirtNumber) {
        throw status(
          409,
          "Este número de camisa já está sendo utilizado por outro atleta no time de destino.",
        );
      }
    }

    // 6. Perform transfer in transaction
    return await db.transaction(async (tx) => {
      // Close current career
      await tx
        .update(athleteCareer)
        .set({ finishedAt: new Date().toISOString().split("T")[0] })
        .where(
          and(
            eq(athleteCareer.athleteId, athleteId),
            eq(athleteCareer.teamId, sourceTeamId),
          ),
        );

      // Create new career with same or new position/shirt number, reset stats
      const [newCareer] = await tx
        .insert(athleteCareer)
        .values({
          athleteId: athleteId,
          teamId: targetTeamId,
          shirtNumber: newShirtNumber,
          position: payload.position ?? currentCareer.position,
        })
        .returning();

      return newCareer;
    });
  }

  static async fetchDetailed(
    athleteId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const athlete = await db.query.athletes.findFirst({
      where: (row) => eq(row.id, athleteId),
      with: {
        teams: {
          with: {
            team: {
              columns: {
                id: true,
                fullName: true,
                shortName: true,
                iconUrl: true,
                mainColorHex: true,
                secondaryColorHex: true,
              },
            },
          },
        },
        matchPerformances: {
          with: {
            match: {
              with: {
                homeTeam: {
                  columns: {
                    id: true,
                    fullName: true,
                    shortName: true,
                  },
                },
                awayTeam: {
                  columns: {
                    id: true,
                    fullName: true,
                    shortName: true,
                  },
                },
              },
            },
            team: {
              columns: {
                id: true,
                fullName: true,
                shortName: true,
              },
            },
          },
        },
      },
    });

    if (!athlete) {
      throw status(404, "Atleta não encontrado.");
    }

    // Sort career history by startedAt descending
    const sortedTeams = [...athlete.teams].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    // Sort match performances by match timestamp descending and apply pagination
    const sortedPerformances = [...athlete.matchPerformances]
      .sort(
        (a, b) =>
          new Date(b.match.timestamp).getTime() -
          new Date(a.match.timestamp).getTime(),
      )
      .slice(offset, offset + limit);

    // Calculate aggregated statistics
    const careerTotals = {
      matches: athlete.teams.reduce((sum, career) => sum + career.matches, 0),
      goals: athlete.teams.reduce((sum, career) => sum + career.goals, 0),
      assists: athlete.teams.reduce((sum, career) => sum + career.assists, 0),
      yellowCards: athlete.teams.reduce(
        (sum, career) => sum + career.yellowCards,
        0,
      ),
      redCards: athlete.teams.reduce((sum, career) => sum + career.redCards, 0),
    };

    return {
      ...athlete,
      teams: sortedTeams,
      matchPerformances: sortedPerformances,
      careerTotals,
    };
  }
}

export { Athlete };

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
  sql,
} from "drizzle-orm";
import { db } from "../../../..";
import {
  athleteQueryFilterSchema,
  createAthleteSchema,
  transferAthleteSchema,
} from "./model";
import {
  athleteCareer,
  athletes,
  teams,
  trainings,
  trainingClasses,
  athleteTrainingClassStats,
} from "../../../../db/schema";
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
        shirtNumber: athleteCareer.shirtNumber,
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

  static async fetchStats(teamId: string, athleteId: string) {
    // 1. Fetch athlete basic info and career data for this team
    const athlete = await db.query.athletes.findFirst({
      where: (row) => eq(row.id, athleteId),
      columns: {
        id: true,
        name: true,
        birthdate: true,
      },
    });

    if (!athlete) {
      throw status(404, "Atleta não encontrado.");
    }

    // 2. Fetch career info for this specific team
    const career = await db.query.athleteCareer.findFirst({
      where: (row) => and(eq(row.athleteId, athleteId), eq(row.teamId, teamId)),
      columns: {
        shirtNumber: true,
        position: true,
        matches: true,
        goals: true,
        assists: true,
        yellowCards: true,
        redCards: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    if (!career) {
      throw status(404, "Atleta não possui vínculo com este time.");
    }

    // 3. Calculate derived statistics
    const goalsPerMatch =
      career.matches > 0 ? career.goals / career.matches : 0;
    const assistsPerMatch =
      career.matches > 0 ? career.assists / career.matches : 0;

    return {
      athlete: {
        id: athlete.id,
        name: athlete.name,
        birthdate: athlete.birthdate,
      },
      career: {
        shirtNumber: career.shirtNumber,
        position: career.position,
        startedAt: career.startedAt,
        finishedAt: career.finishedAt,
        isActive: career.finishedAt === null,
      },
      stats: {
        matches: career.matches,
        goals: career.goals,
        assists: career.assists,
        yellowCards: career.yellowCards,
        redCards: career.redCards,
        goalsPerMatch: Number(goalsPerMatch.toFixed(2)),
        assistsPerMatch: Number(assistsPerMatch.toFixed(2)),
      },
    };
  }

  static async fetchTrainings(
    teamId: string,
    athleteId: string,
    filter: { from?: string; to?: string; limit?: number; offset?: number },
  ) {
    const { from, to, limit = 20, offset = 0 } = filter;

    // 1. Validate athlete belongs to team
    const career = await db.query.athleteCareer.findFirst({
      where: (row) => and(eq(row.athleteId, athleteId), eq(row.teamId, teamId)),
      columns: { athleteId: true },
    });

    if (!career) {
      throw status(404, "Atleta não possui vínculo com este time.");
    }

    // 2. Build filters for trainings
    const trainingFilters: SQLWrapper[] = [eq(trainings.teamId, teamId)];

    if (from) {
      trainingFilters.push(gte(trainings.date, from));
    }

    if (to) {
      trainingFilters.push(lte(trainings.date, to));
    }

    // 3. Query trainings with athlete participation
    const athleteTrainings = await db
      .select({
        trainingId: trainings.id,
        trainingDate: trainings.date,
        trainingConcluded: trainings.concluded,
        trainingConcludedAt: trainings.concludedAt,
        classId: trainingClasses.id,
        classTitle: trainingClasses.title,
        classDescription: trainingClasses.description,
        classConcluded: trainingClasses.concluded,
        present: athleteTrainingClassStats.present,
        notes: athleteTrainingClassStats.notes,
        stats: athleteTrainingClassStats.stats,
      })
      .from(athleteTrainingClassStats)
      .innerJoin(
        trainingClasses,
        eq(athleteTrainingClassStats.trainingClassId, trainingClasses.id),
      )
      .innerJoin(trainings, eq(trainingClasses.trainingId, trainings.id))
      .where(
        and(
          eq(athleteTrainingClassStats.athleteId, athleteId),
          ...trainingFilters,
        ),
      )
      .orderBy(desc(trainings.date))
      .limit(limit)
      .offset(offset);

    // 4. Group by training
    const trainingMap = new Map<
      string,
      {
        id: string;
        date: string;
        concluded: boolean;
        concludedAt: Date | string | null;
        classes: Array<{
          id: string;
          title: string;
          description: string | null;
          concluded: boolean;
          present: boolean;
          notes: string | null;
          stats: any;
        }>;
      }
    >();

    for (const row of athleteTrainings) {
      if (!trainingMap.has(row.trainingId)) {
        trainingMap.set(row.trainingId, {
          id: row.trainingId,
          date: row.trainingDate,
          concluded: row.trainingConcluded ?? false,
          concludedAt: row.trainingConcludedAt,
          classes: [],
        });
      }

      trainingMap.get(row.trainingId)!.classes.push({
        id: row.classId,
        title: row.classTitle,
        description: row.classDescription,
        concluded: row.classConcluded ?? false,
        present: row.present ?? false,
        notes: row.notes,
        stats: row.stats,
      });
    }

    const trainingsArray = Array.from(trainingMap.values());

    // 5. Calculate summary statistics
    const totalTrainings = trainingsArray.length;
    const attendedClasses = athleteTrainings.filter((t) => t.present).length;
    const totalClasses = athleteTrainings.length;
    const missedClasses = totalClasses - attendedClasses;

    return {
      trainings: trainingsArray,
      summary: {
        totalTrainings,
        totalClasses,
        attendedClasses,
        missedClasses,
        attendanceRate:
          totalClasses > 0
            ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
            : 0,
      },
    };
  }
}

export { Athlete };

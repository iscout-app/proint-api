import z from "zod";
import {
  createMatchSchema,
  updateMatchSchema,
  matchQueryFilterSchema,
} from "./model";
import { db } from "../..";
import { matches, matchAthletes, athleteCareer, teams } from "../../db/schema";
import {
  and,
  eq,
  or,
  gte,
  lte,
  SQLWrapper,
  inArray,
  sql,
  desc,
  isNull,
} from "drizzle-orm";
import { status } from "elysia";

abstract class Match {
  /**
   * List matches with optional filters (team, date range)
   */
  static async index(filter: z.infer<typeof matchQueryFilterSchema>) {
    const filters: SQLWrapper[] = [];

    if (filter.teamId) {
      filters.push(
        or(
          eq(matches.homeTeamId, filter.teamId),
          eq(matches.awayTeamId, filter.teamId),
        )!,
      );
    }

    if (filter.from) {
      filters.push(gte(matches.timestamp, new Date(filter.from)));
    }

    if (filter.to) {
      filters.push(lte(matches.timestamp, new Date(filter.to)));
    }

    return await db.query.matches.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      with: {
        homeTeam: {
          columns: {
            id: true,
            fullName: true,
            shortName: true,
            iconUrl: true,
            mainColorHex: true,
            secondaryColorHex: true,
          },
        },
        awayTeam: {
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
      orderBy: desc(matches.timestamp),
    });
  }

  /**
   * Fetch single match with all details including athlete performances
   */
  static async fetch(matchId: string) {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      throw status(404, "Partida não encontrada.");
    }

    // Fetch all athlete performances for this match
    const athletePerformances = await db.query.matchAthletes.findMany({
      where: eq(matchAthletes.matchId, matchId),
      with: {
        athlete: {
          columns: {
            id: true,
            name: true,
            birthdate: true,
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
    });

    return {
      ...match,
      athletes: athletePerformances,
    };
  }

  /**
   * Create match with atomic stats update
   */
  static async create(
    userId: string,
    payload: z.infer<typeof createMatchSchema>,
  ) {
    // 1. Validate user owns at least one of the teams
    await this.validateOwnership(userId, [
      payload.homeTeamId,
      payload.awayTeamId,
    ]);

    // 2. Validate all athletes belong to their specified teams
    if (payload.athletes && payload.athletes.length > 0) {
      await this.validateAthletes(payload.athletes);
    }

    // 3. Create match and update stats in transaction
    return await db.transaction(async (tx) => {
      // Create match record
      const [match] = await tx
        .insert(matches)
        .values({
          homeTeamId: payload.homeTeamId,
          awayTeamId: payload.awayTeamId,
          timestamp: new Date(payload.timestamp),
          homeScore: payload.homeScore,
          awayScore: payload.awayScore,
        })
        .returning();

      // Insert athlete performances
      if (payload.athletes && payload.athletes.length > 0) {
        await tx.insert(matchAthletes).values(
          payload.athletes.map((athlete) => ({
            matchId: match.id,
            athleteId: athlete.athleteId,
            teamId: athlete.teamId,
            position: athlete.position,
            goals: athlete.goals,
            assists: athlete.assists,
            yellowCards: athlete.yellowCards,
            redCards: athlete.redCards,
          })),
        );

        // Update denormalized stats in athleteCareer
        await this.incrementCareerStats(tx, payload.athletes);
      }

      return match;
    });
  }

  /**
   * Update match with stats recalculation
   */
  static async update(
    userId: string,
    matchId: string,
    payload: z.infer<typeof updateMatchSchema>,
  ) {
    // 1. Fetch existing match
    const existingMatch = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!existingMatch) {
      throw status(404, "Partida não encontrada.");
    }

    // 2. Validate ownership
    await this.validateOwnership(userId, [
      existingMatch.homeTeamId,
      existingMatch.awayTeamId,
    ]);

    // 3. If updating athletes, validate them
    if (payload.athletes) {
      await this.validateAthletes(payload.athletes);
    }

    // 4. Update in transaction
    return await db.transaction(async (tx) => {
      // Update match basic info
      const updateData: any = {};
      if (payload.timestamp) updateData.timestamp = new Date(payload.timestamp);
      if (payload.homeScore !== undefined)
        updateData.homeScore = payload.homeScore;
      if (payload.awayScore !== undefined)
        updateData.awayScore = payload.awayScore;

      let updatedMatch = existingMatch;
      if (Object.keys(updateData).length > 0) {
        [updatedMatch] = await tx
          .update(matches)
          .set(updateData)
          .where(eq(matches.id, matchId))
          .returning();
      }

      // If updating athletes, recalculate stats
      if (payload.athletes) {
        // Get old athlete performances
        const oldPerformances = await tx.query.matchAthletes.findMany({
          where: eq(matchAthletes.matchId, matchId),
        });

        // Decrement old stats
        if (oldPerformances.length > 0) {
          await this.decrementCareerStats(
            tx,
            oldPerformances.map((p) => ({
              athleteId: p.athleteId,
              teamId: p.teamId,
              position: p.position,
              goals: p.goals,
              assists: p.assists,
              yellowCards: p.yellowCards,
              redCards: p.redCards,
            })),
          );
        }

        // Delete old performances
        await tx
          .delete(matchAthletes)
          .where(eq(matchAthletes.matchId, matchId));

        // Insert new performances
        if (payload.athletes.length > 0) {
          await tx.insert(matchAthletes).values(
            payload.athletes.map((athlete) => ({
              matchId: matchId,
              athleteId: athlete.athleteId,
              teamId: athlete.teamId,
              position: athlete.position,
              goals: athlete.goals,
              assists: athlete.assists,
              yellowCards: athlete.yellowCards,
              redCards: athlete.redCards,
            })),
          );

          // Increment new stats
          await this.incrementCareerStats(tx, payload.athletes);
        }
      }

      return updatedMatch;
    });
  }

  /**
   * Validate user owns at least one of the teams
   */
  private static async validateOwnership(userId: string, teamIds: string[]) {
    const userTeams = await db.query.teams.findMany({
      where: (row) => and(inArray(row.id, teamIds), eq(row.createdBy, userId)),
      columns: { id: true },
    });

    if (userTeams.length === 0) {
      throw status(
        403,
        "Você não tem permissão para criar partidas para estes times.",
      );
    }
  }

  /**
   * Validate all athletes have active careers with their specified teams
   */
  private static async validateAthletes(
    athletes: Array<{
      athleteId: string;
      teamId: string;
      position: string;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }>,
  ) {
    // Check each athlete has active career with specified team
    for (const athlete of athletes) {
      const career = await db.query.athleteCareer.findFirst({
        where: (row) =>
          and(
            eq(row.athleteId, athlete.athleteId),
            eq(row.teamId, athlete.teamId),
            isNull(row.finishedAt),
          ),
        columns: { athleteId: true },
      });

      if (!career) {
        throw status(
          400,
          `Atleta ${athlete.athleteId} não possui vínculo ativo com o time ${athlete.teamId}.`,
        );
      }
    }
  }

  /**
   * Increment career stats for athletes (after match creation)
   */
  private static async incrementCareerStats(
    tx: any,
    athletes: Array<{
      athleteId: string;
      teamId: string;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }>,
  ) {
    // Group by athlete-team to handle duplicates
    const statsMap = new Map<
      string,
      {
        athleteId: string;
        teamId: string;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
      }
    >();

    for (const athlete of athletes) {
      const key = `${athlete.athleteId}-${athlete.teamId}`;
      const existing = statsMap.get(key);

      if (existing) {
        // Accumulate stats if athlete appears multiple times
        existing.goals += athlete.goals;
        existing.assists += athlete.assists;
        existing.yellowCards += athlete.yellowCards;
        existing.redCards += athlete.redCards;
      } else {
        statsMap.set(key, { ...athlete });
      }
    }

    // Update each athlete's career stats
    for (const athlete of statsMap.values()) {
      await tx
        .update(athleteCareer)
        .set({
          matches: sql`${athleteCareer.matches} + 1`,
          goals: sql`${athleteCareer.goals} + ${athlete.goals}`,
          assists: sql`${athleteCareer.assists} + ${athlete.assists}`,
          yellowCards: sql`${athleteCareer.yellowCards} + ${athlete.yellowCards}`,
          redCards: sql`${athleteCareer.redCards} + ${athlete.redCards}`,
        })
        .where(
          and(
            eq(athleteCareer.athleteId, athlete.athleteId),
            eq(athleteCareer.teamId, athlete.teamId),
          ),
        );
    }
  }

  /**
   * Decrement career stats for athletes (before updating match)
   */
  private static async decrementCareerStats(
    tx: any,
    athletes: Array<{
      athleteId: string;
      teamId: string;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }>,
  ) {
    // Group by athlete-team to handle duplicates
    const statsMap = new Map<
      string,
      {
        athleteId: string;
        teamId: string;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
      }
    >();

    for (const athlete of athletes) {
      const key = `${athlete.athleteId}-${athlete.teamId}`;
      const existing = statsMap.get(key);

      if (existing) {
        existing.goals += athlete.goals;
        existing.assists += athlete.assists;
        existing.yellowCards += athlete.yellowCards;
        existing.redCards += athlete.redCards;
      } else {
        statsMap.set(key, { ...athlete });
      }
    }

    // Update each athlete's career stats
    for (const athlete of statsMap.values()) {
      await tx
        .update(athleteCareer)
        .set({
          matches: sql`${athleteCareer.matches} - 1`,
          goals: sql`${athleteCareer.goals} - ${athlete.goals}`,
          assists: sql`${athleteCareer.assists} - ${athlete.assists}`,
          yellowCards: sql`${athleteCareer.yellowCards} - ${athlete.yellowCards}`,
          redCards: sql`${athleteCareer.redCards} - ${athlete.redCards}`,
        })
        .where(
          and(
            eq(athleteCareer.athleteId, athlete.athleteId),
            eq(athleteCareer.teamId, athlete.teamId),
          ),
        );
    }
  }
}

export { Match };

import { z } from "zod";
import { createStatsSchema, listStatsQuerySchema } from "./model";
import { db } from "../..";
import {
  matchAthletes,
  athleteCareer,
  matches,
  athletes,
} from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";

abstract class Stats {
  static async create(data: z.infer<typeof createStatsSchema>) {
    // Insert match athlete stats
    const [result] = await db.insert(matchAthletes).values(data).returning();

    // Update denormalized stats in athleteCareer
    await db.execute(sql`
      UPDATE athlete_career
      SET
        matches = matches + 1,
        goals = goals + ${data.goals},
        assists = assists + ${data.assists},
        yellow_cards = yellow_cards + ${data.yellowCards},
        red_cards = red_cards + ${data.redCards}
      WHERE athlete_id = ${data.athleteId} AND team_id = ${data.teamId}
    `);

    return result;
  }

  static async getByPlayer(athleteId: string) {
    const result = await db
      .select({
        id: matchAthletes.matchId,
        athleteId: matchAthletes.athleteId,
        matchId: matchAthletes.matchId,
        teamId: matchAthletes.teamId,
        position: matchAthletes.position,
        minutesPlayed: matchAthletes.minutesPlayed,
        // Offensive stats
        goals: matchAthletes.goals,
        assists: matchAthletes.assists,
        shots: matchAthletes.shots,
        shotsOnTarget: matchAthletes.shotsOnTarget,
        // Passing stats
        accuratePasses: matchAthletes.accuratePasses,
        inaccuratePasses: matchAthletes.inaccuratePasses,
        // Defensive stats
        tackles: matchAthletes.tackles,
        interceptions: matchAthletes.interceptions,
        foulsCommitted: matchAthletes.foulsCommitted,
        foulsSuffered: matchAthletes.foulsSuffered,
        // Cards
        yellowCards: matchAthletes.yellowCards,
        redCards: matchAthletes.redCards,
        // Performance
        performanceRating: matchAthletes.performanceRating,
        observations: matchAthletes.observations,
        // Match info
        matchDate: matches.timestamp,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matchAthletes)
      .innerJoin(matches, eq(matchAthletes.matchId, matches.id))
      .where(eq(matchAthletes.athleteId, athleteId))
      .orderBy(sql`${matches.timestamp} DESC`);

    return result;
  }

  static async getEvolution(athleteId: string) {
    const stats = await this.getByPlayer(athleteId);

    // Calculate evolution metrics
    const evolution = stats.map((stat, index) => {
      const cumulativeGoals = stats
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.goals, 0);
      const cumulativeAssists = stats
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.assists, 0);
      const cumulativeYellowCards = stats
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.yellowCards, 0);
      const cumulativeRedCards = stats
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.redCards, 0);

      return {
        date: stat.matchDate,
        goals: stat.goals,
        assists: stat.assists,
        yellowCards: stat.yellowCards,
        redCards: stat.redCards,
        cumulativeGoals,
        cumulativeAssists,
        cumulativeYellowCards,
        cumulativeRedCards,
        matchId: stat.matchId,
      };
    });

    // Return in chronological order for charts
    return evolution.reverse();
  }

  static async list(filters: z.infer<typeof listStatsQuerySchema>) {
    const conditions = [];

    if (filters.athleteId) {
      conditions.push(eq(matchAthletes.athleteId, filters.athleteId));
    }

    if (filters.matchId) {
      conditions.push(eq(matchAthletes.matchId, filters.matchId));
    }

    if (filters.teamId) {
      conditions.push(eq(matchAthletes.teamId, filters.teamId));
    }

    const result = await db
      .select()
      .from(matchAthletes)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result;
  }
}

export { Stats };

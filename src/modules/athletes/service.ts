import { Athlete as AthleteSubmodule } from "../team/submodules/athlete/service";
import { db } from "../..";
import { matchAthletes, matches, teams } from "../../db/schema";
import { and, desc, eq, gte, lte, SQLWrapper } from "drizzle-orm";
import { status } from "elysia";

abstract class Athlete {
  /**
   * Delegates to the detailed fetch method in the athlete submodule
   */
  static async fetch(athleteId: string, limit: number, offset: number) {
    return AthleteSubmodule.fetchDetailed(athleteId, limit, offset);
  }

  /**
   * Fetch match history for a specific athlete with filters
   */
  static async fetchMatches(
    athleteId: string,
    filter: {
      teamId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { teamId, from, to, limit = 20, offset = 0 } = filter;

    // Build filter conditions
    const filters: SQLWrapper[] = [eq(matchAthletes.athleteId, athleteId)];

    if (teamId) {
      filters.push(eq(matchAthletes.teamId, teamId));
    }

    if (from) {
      filters.push(gte(matches.timestamp, from));
    }

    if (to) {
      filters.push(lte(matches.timestamp, to));
    }

    // Query matches with athlete performance
    const athleteMatches = await db
      .select({
        // Match info
        matchId: matches.id,
        timestamp: matches.timestamp,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        // Athlete performance
        teamId: matchAthletes.teamId,
        position: matchAthletes.position,
        goals: matchAthletes.goals,
        assists: matchAthletes.assists,
        yellowCards: matchAthletes.yellowCards,
        redCards: matchAthletes.redCards,
        // Team info
        teamName: teams.fullName,
        teamShortName: teams.shortName,
      })
      .from(matchAthletes)
      .innerJoin(matches, eq(matchAthletes.matchId, matches.id))
      .innerJoin(teams, eq(matchAthletes.teamId, teams.id))
      .where(and(...filters))
      .orderBy(desc(matches.timestamp))
      .limit(limit)
      .offset(offset);

    // For each match, fetch opponent team info
    const matchesWithDetails = await Promise.all(
      athleteMatches.map(async (match) => {
        // Determine if athlete's team was home or away
        const isHome = match.teamId === match.homeTeamId;
        const opponentId = isHome ? match.awayTeamId : match.homeTeamId;

        // Fetch opponent team info
        const opponent = await db.query.teams.findFirst({
          where: (row) => eq(row.id, opponentId),
          columns: {
            id: true,
            fullName: true,
            shortName: true,
          },
        });

        // Determine match result
        let result: "win" | "draw" | "loss";
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;

        if (teamScore > opponentScore) result = "win";
        else if (teamScore < opponentScore) result = "loss";
        else result = "draw";

        return {
          matchId: match.matchId,
          timestamp: match.timestamp,
          teamId: match.teamId,
          team: {
            name: match.teamName,
            shortName: match.teamShortName,
          },
          opponent: {
            id: opponent?.id || opponentId,
            name: opponent?.fullName || "Unknown",
            shortName: opponent?.shortName || "???",
          },
          homeAway: isHome ? ("home" as const) : ("away" as const),
          result,
          score: {
            home: match.homeScore,
            away: match.awayScore,
            team: teamScore,
            opponent: opponentScore,
          },
          performance: {
            position: match.position,
            goals: match.goals,
            assists: match.assists,
            yellowCards: match.yellowCards,
            redCards: match.redCards,
          },
        };
      }),
    );

    return matchesWithDetails;
  }
}

export { Athlete };

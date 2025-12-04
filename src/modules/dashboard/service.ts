import { db } from "../..";
import {
  athletes,
  athleteCareer,
  matches,
  matchAthletes,
} from "../../db/schema";
import { sql, desc, eq } from "drizzle-orm";

abstract class Dashboard {
  static async getSummary(teamId?: string) {
    // Total players
    const totalPlayersQuery = teamId
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(athleteCareer)
          .where(eq(athleteCareer.teamId, teamId))
      : db.select({ count: sql<number>`count(*)` }).from(athletes);

    const [{ count: totalPlayers }] = await totalPlayersQuery;

    // Total matches
    const totalMatchesQuery = teamId
      ? db
          .select({
            count: sql<number>`count(DISTINCT ${matchAthletes.matchId})`,
          })
          .from(matchAthletes)
          .where(eq(matchAthletes.teamId, teamId))
      : db.select({ count: sql<number>`count(*)` }).from(matches);

    const [{ count: totalMatches }] = await totalMatchesQuery;

    // Total goals
    const totalGoalsQuery = teamId
      ? db
          .select({ total: sql<number>`sum(${athleteCareer.goals})` })
          .from(athleteCareer)
          .where(eq(athleteCareer.teamId, teamId))
      : db
          .select({ total: sql<number>`sum(${athleteCareer.goals})` })
          .from(athleteCareer);

    const [{ total: totalGoals }] = await totalGoalsQuery;

    // Average performance (goals per match)
    const avgPerformance =
      totalMatches > 0 ? ((totalGoals ?? 0) / totalMatches).toFixed(2) : "0.00";

    // Top performers
    const topPerformersQuery = teamId
      ? db
          .select({
            id: athletes.id,
            name: athletes.name,
            goals: athleteCareer.goals,
            assists: athleteCareer.assists,
            matches: athleteCareer.matches,
            position: athleteCareer.position,
          })
          .from(athletes)
          .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId))
          .where(eq(athleteCareer.teamId, teamId))
          .orderBy(desc(athleteCareer.goals))
          .limit(10)
      : db
          .select({
            id: athletes.id,
            name: athletes.name,
            goals: sql<number>`sum(${athleteCareer.goals})`.as("goals"),
            assists: sql<number>`sum(${athleteCareer.assists})`.as("assists"),
            matches: sql<number>`sum(${athleteCareer.matches})`.as("matches"),
            position:
              sql<string>`string_agg(DISTINCT ${athleteCareer.position}, ', ')`.as(
                "position",
              ),
          })
          .from(athletes)
          .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId))
          .groupBy(athletes.id, athletes.name)
          .orderBy(desc(sql`sum(${athleteCareer.goals})`))
          .limit(10);

    const topPerformers = await topPerformersQuery;

    // Recent matches
    const recentMatchesQuery = teamId
      ? db
          .select({
            id: matches.id,
            timestamp: matches.timestamp,
            homeTeamId: matches.homeTeamId,
            awayTeamId: matches.awayTeamId,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
          })
          .from(matches)
          .where(
            sql`${matches.homeTeamId} = ${teamId} OR ${matches.awayTeamId} = ${teamId}`,
          )
          .orderBy(desc(matches.timestamp))
          .limit(5)
      : db.select().from(matches).orderBy(desc(matches.timestamp)).limit(5);

    const recentMatches = await recentMatchesQuery;

    // Position distribution
    const positionDistribution = await db
      .select({
        position: athleteCareer.position,
        count: sql<number>`count(*)`,
      })
      .from(athleteCareer)
      .where(teamId ? eq(athleteCareer.teamId, teamId) : undefined)
      .groupBy(athleteCareer.position)
      .orderBy(desc(sql`count(*)`));

    return {
      totalPlayers: Number(totalPlayers),
      eventsThisWeek: Number(totalMatches), // TODO: Filter by week
      overallAverage: Number(avgPerformance),
      goalsThisWeek: Number(totalGoals ?? 0), // TODO: Filter by week
      topPerformers: topPerformers.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position || "N/A",
        average: Number(p.goals) / (Number(p.matches) || 1), // Goals per match
      })),
      recentMatches: recentMatches.map((m) => ({
        id: m.id,
        playerId: "", // TODO: Get from matchAthletes
        playerName: "", // TODO: Get from matchAthletes
        eventType: "partida" as const,
        date: m.timestamp?.toISOString() || new Date().toISOString(),
        goals: Number(m.homeScore) + Number(m.awayScore),
        assists: 0, // TODO: Get from matchAthletes
        rating: 0, // TODO: Calculate rating
      })),
      activityData: {
        labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
        training: [0, 0, 0, 0, 0, 0, 0], // TODO: Get real data
        matches: [0, 0, 0, 0, 0, 0, 0], // TODO: Get real data
      },
      positionDistribution: positionDistribution.map((p) => ({
        position: p.position,
        count: Number(p.count),
      })),
      categoryPerformance: [], // TODO: Implement category performance
    };
  }
}

export { Dashboard };

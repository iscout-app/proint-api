import { and, eq, gte, isNull, like, lte, SQLWrapper } from "drizzle-orm";
import { db } from "../../../..";
import { athleteQueryFilterSchema } from "./model";
import { athleteCareer, athletes } from "../../../../db/schema";
import z from "zod";

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
}

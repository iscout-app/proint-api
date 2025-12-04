import { z } from "zod";
import {
  createPlayerSchema,
  updatePlayerSchema,
  listPlayersQuerySchema,
} from "./model";
import { db } from "../..";
import { athletes, athleteCareer } from "../../db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";

abstract class Player {
  static async list(filters: z.infer<typeof listPlayersQuerySchema>) {
    const conditions = [];

    if (filters.teamId) {
      conditions.push(eq(athleteCareer.teamId, filters.teamId));
    }

    if (filters.position) {
      conditions.push(eq(athleteCareer.position, filters.position));
    }

    if (filters.name) {
      conditions.push(ilike(athletes.name, `%${filters.name}%`));
    }

    const result = await db
      .select({
        id: athletes.id,
        name: athletes.name,
        birthdate: athletes.birthdate,
        teamId: athleteCareer.teamId,
        shirtNumber: athleteCareer.shirtNumber,
        position: athleteCareer.position,
        matches: athleteCareer.matches,
        goals: athleteCareer.goals,
        assists: athleteCareer.assists,
        yellowCards: athleteCareer.yellowCards,
        redCards: athleteCareer.redCards,
        startedAt: athleteCareer.startedAt,
        finishedAt: athleteCareer.finishedAt,
      })
      .from(athletes)
      .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(athletes.name);

    return result;
  }

  static async getById(id: string) {
    const result = await db
      .select({
        id: athletes.id,
        name: athletes.name,
        birthdate: athletes.birthdate,
        teamId: athleteCareer.teamId,
        shirtNumber: athleteCareer.shirtNumber,
        position: athleteCareer.position,
        matches: athleteCareer.matches,
        goals: athleteCareer.goals,
        assists: athleteCareer.assists,
        yellowCards: athleteCareer.yellowCards,
        redCards: athleteCareer.redCards,
        startedAt: athleteCareer.startedAt,
        finishedAt: athleteCareer.finishedAt,
      })
      .from(athletes)
      .innerJoin(athleteCareer, eq(athletes.id, athleteCareer.athleteId))
      .where(eq(athletes.id, id))
      .limit(1);

    return result[0];
  }

  static async create(data: z.infer<typeof createPlayerSchema>) {
    // Create athlete first
    const [athlete] = await db
      .insert(athletes)
      .values({
        name: data.name,
        birthdate: data.birthdate,
      })
      .returning();

    // Then create career record
    await db.insert(athleteCareer).values({
      athleteId: athlete.id,
      teamId: data.teamId,
      shirtNumber: data.shirtNumber,
      position: data.position,
    });

    // Return combined data
    return {
      id: athlete.id,
      name: athlete.name,
      birthdate: athlete.birthdate,
      teamId: data.teamId,
      shirtNumber: data.shirtNumber,
      position: data.position,
      matches: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    };
  }

  static async update(
    id: string,
    teamId: string,
    data: z.infer<typeof updatePlayerSchema>,
  ) {
    // Update athlete table
    if (data.name || data.birthdate) {
      await db
        .update(athletes)
        .set({
          ...(data.name && { name: data.name }),
          ...(data.birthdate && { birthdate: data.birthdate }),
        })
        .where(eq(athletes.id, id));
    }

    // Update athleteCareer table
    if (data.shirtNumber || data.position) {
      await db
        .update(athleteCareer)
        .set({
          ...(data.shirtNumber && { shirtNumber: data.shirtNumber }),
          ...(data.position && { position: data.position }),
        })
        .where(
          and(
            eq(athleteCareer.athleteId, id),
            eq(athleteCareer.teamId, teamId),
          ),
        );
    }

    return await Player.getById(id);
  }

  static async delete(id: string, teamId: string) {
    // Delete career record first (due to foreign key)
    await db
      .delete(athleteCareer)
      .where(
        and(eq(athleteCareer.athleteId, id), eq(athleteCareer.teamId, teamId)),
      );

    // Check if athlete has other teams
    const otherTeams = await db
      .select()
      .from(athleteCareer)
      .where(eq(athleteCareer.athleteId, id));

    // If no other teams, delete athlete
    if (otherTeams.length === 0) {
      await db.delete(athletes).where(eq(athletes.id, id));
    }

    return { success: true };
  }
}

export { Player };

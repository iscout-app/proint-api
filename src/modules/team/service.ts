import z from "zod";
import { createTeamSchema, updateTeamSchema } from "./model";
import { db } from "../..";
import { teams } from "../../db/schema";
import { asc, eq } from "drizzle-orm";

abstract class Team {
  static async create(
    ownerId: string,
    payload: z.infer<typeof createTeamSchema>,
  ) {
    const [record] = await db
      .insert(teams)
      .values({
        ...payload,
        createdBy: ownerId,
      })
      .returning();

    return record;
  }

  static async own(ownerId: string) {
    const record = await db.query.teams.findMany({
      where: (row) => eq(row.createdBy, ownerId),
      orderBy: asc(teams.fullName),
    });

    return record;
  }

  static async fetch(teamId: string) {
    const [record] = await db.query.teams.findMany({
      where: (row) => eq(row.id, teamId),
      with: {
        owner: {
          columns: {
            password: false,
          },
        },
        athletes: true,
        awayMatches: true,
        homeMatches: true,
        trainings: true,
      },
    });

    return record;
  }

  static async patch(
    teamId: string,
    payload: z.infer<typeof updateTeamSchema>,
  ) {
    const [result] = await db
      .update(teams)
      .set(payload)
      .where(eq(teams.id, teamId))
      .returning();

    return result;
  }

  static async index() {
    const record = await db.query.teams.findMany({
      with: {
        owner: {
          columns: {
            password: false,
          },
        },
      },
      orderBy: asc(teams.fullName),
    });

    return record;
  }
}

export { Team };

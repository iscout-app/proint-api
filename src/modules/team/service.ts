import z from "zod";
import { createTeamSchema, updateTeamSchema } from "./model";
import { db } from "../..";
import { teams } from "../../db/schema";
import { and, asc, eq } from "drizzle-orm";

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
    const record = await db.query.teams.findFirst({
      where: (row) => eq(row.id, teamId),
      with: {
        owner: {
          columns: {
            password: false,
          },
        },
        athletes: true,
        homeMatches: {
          with: {
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
        },
        awayMatches: {
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
          },
        },
        trainings: true,
      },
    });

    // Sort matches by timestamp in JavaScript
    if (record) {
      record.homeMatches = record.homeMatches.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      record.awayMatches = record.awayMatches.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    }

    return record;
  }

  static async patch(
    teamId: string,
    ownerId: string,
    payload: z.infer<typeof updateTeamSchema>,
  ) {
    const permissionRecord = await db.query.teams.findFirst({
      columns: {
        id: true,
      },
      where: (row) => and(eq(row.id, teamId), eq(row.createdBy, ownerId)),
    });

    if (!permissionRecord) {
      throw new Error("Sem permissão.");
    }

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

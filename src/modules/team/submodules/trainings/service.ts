import z from "zod";
import {
  createTrainingSchema,
  updateTrainingSchema,
  trainingQueryFilterSchema,
  createTrainingClassSchema,
  updateTrainingClassSchema,
  createAthleteStatsSchema,
  updateAthleteStatsSchema,
} from "./model";
import { db } from "../../../..";
import {
  trainings,
  trainingClasses,
  athleteTrainingClassStats,
  teams,
  athleteCareer,
} from "../../../../db/schema";
import { and, eq, gte, lte, SQLWrapper, isNull, desc } from "drizzle-orm";
import { status } from "elysia";

abstract class Training {
  /**
   * List all trainings for a team with optional filters
   */
  static async fetchByTeam(
    userId: string,
    teamId: string,
    filter: z.infer<typeof trainingQueryFilterSchema>,
  ) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    // Build filters
    const filters: SQLWrapper[] = [eq(trainings.teamId, teamId)];

    if (filter.from) {
      filters.push(gte(trainings.date, filter.from));
    }

    if (filter.to) {
      filters.push(lte(trainings.date, filter.to));
    }

    if (filter.concluded !== undefined) {
      filters.push(eq(trainings.concluded, filter.concluded));
    }

    return await db.query.trainings.findMany({
      where: and(...filters),
      orderBy: desc(trainings.date),
      with: {
        classes: {
          with: {
            athleteStats: {
              with: {
                athlete: {
                  columns: {
                    id: true,
                    name: true,
                    birthdate: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new training for a team
   */
  static async create(
    userId: string,
    teamId: string,
    payload: z.infer<typeof createTrainingSchema>,
  ) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    const [training] = await db
      .insert(trainings)
      .values({
        teamId,
        date: payload.date,
      })
      .returning();

    return training;
  }

  /**
   * Fetch single training with all classes and athlete stats
   */
  static async fetch(userId: string, teamId: string, trainingId: string) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    const training = await db.query.trainings.findFirst({
      where: and(eq(trainings.id, trainingId), eq(trainings.teamId, teamId)),
      with: {
        classes: {
          with: {
            athleteStats: {
              with: {
                athlete: {
                  columns: {
                    id: true,
                    name: true,
                    birthdate: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!training) {
      throw status(404, "Treino n�o encontrado.");
    }

    return training;
  }

  /**
   * Update training date
   */
  static async update(
    userId: string,
    teamId: string,
    trainingId: string,
    payload: z.infer<typeof updateTrainingSchema>,
  ) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    // Validate training exists and belongs to team
    await this.validateTrainingOwnership(teamId, trainingId);

    const updateData: any = {};
    if (payload.date) updateData.date = new Date(payload.date);

    const [updated] = await db
      .update(trainings)
      .set(updateData)
      .where(and(eq(trainings.id, trainingId), eq(trainings.teamId, teamId)))
      .returning();

    if (!updated) {
      throw status(404, "Treino n�o encontrado.");
    }

    return updated;
  }

  /**
   * Delete training (cascade deletes classes and athlete stats)
   */
  static async delete(userId: string, teamId: string, trainingId: string) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    // Validate training exists and belongs to team
    await this.validateTrainingOwnership(teamId, trainingId);

    await db.transaction(async (tx) => {
      await tx
        .delete(trainings)
        .where(and(eq(trainings.id, trainingId), eq(trainings.teamId, teamId)));
    });
  }

  /**
   * Create a new class within a training
   */
  static async createClass(
    userId: string,
    teamId: string,
    trainingId: string,
    payload: z.infer<typeof createTrainingClassSchema>,
  ) {
    // Validate ownership
    await this.validateOwnership(userId, teamId);

    // Validate training exists and belongs to team
    await this.validateTrainingOwnership(teamId, trainingId);

    const [trainingClass] = await db
      .insert(trainingClasses)
      .values({
        trainingId,
        title: payload.title,
        description: payload.description,
        notes: payload.notes,
      })
      .returning();

    return trainingClass;
  }

  /**
   * Fetch single training class with all athlete stats
   */
  static async fetchClass(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);

    const trainingClass = await db.query.trainingClasses.findFirst({
      where: and(
        eq(trainingClasses.id, classId),
        eq(trainingClasses.trainingId, trainingId),
      ),
      with: {
        athleteStats: {
          with: {
            athlete: {
              columns: {
                id: true,
                name: true,
                birthdate: true,
              },
            },
          },
        },
      },
    });

    if (!trainingClass) {
      throw status(404, "Classe de treino n�o encontrada.");
    }

    return trainingClass;
  }

  /**
   * Update training class
   */
  static async updateClass(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
    payload: z.infer<typeof updateTrainingClassSchema>,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);
    await this.validateClassHierarchy(trainingId, classId);

    const updateData: any = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined)
      updateData.description = payload.description;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.concluded !== undefined)
      updateData.concluded = payload.concluded;

    if (Object.keys(updateData).length === 0) {
      throw status(400, "Nenhum campo para atualizar foi fornecido.");
    }

    const [updated] = await db
      .update(trainingClasses)
      .set(updateData)
      .where(
        and(
          eq(trainingClasses.id, classId),
          eq(trainingClasses.trainingId, trainingId),
        ),
      )
      .returning();

    if (!updated) {
      throw status(404, "Classe de treino n�o encontrada.");
    }

    return updated;
  }

  /**
   * Delete training class (cascade deletes athlete stats)
   */
  static async deleteClass(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);
    await this.validateClassHierarchy(trainingId, classId);

    await db.transaction(async (tx) => {
      await tx
        .delete(trainingClasses)
        .where(
          and(
            eq(trainingClasses.id, classId),
            eq(trainingClasses.trainingId, trainingId),
          ),
        );
    });
  }

  /**
   * Add athlete stats to a training class
   */
  static async addAthlete(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
    payload: z.infer<typeof createAthleteStatsSchema>,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);
    await this.validateClassHierarchy(trainingId, classId);

    // Validate athlete has active career with team
    const career = await db.query.athleteCareer.findFirst({
      where: (row) =>
        and(
          eq(row.athleteId, payload.athleteId),
          eq(row.teamId, teamId),
          isNull(row.finishedAt),
        ),
      columns: { athleteId: true },
    });

    if (!career) {
      throw status(
        400,
        `Atleta ${payload.athleteId} n�o possui v�nculo ativo com o time.`,
      );
    }

    // Check if athlete already added to this class
    const existing = await db.query.athleteTrainingClassStats.findFirst({
      where: (row) =>
        and(
          eq(row.athleteId, payload.athleteId),
          eq(row.trainingClassId, classId),
        ),
      columns: { athleteId: true },
    });

    if (existing) {
      throw status(409, "Atleta j� adicionado a esta classe de treino.");
    }

    const [athleteStats] = await db
      .insert(athleteTrainingClassStats)
      .values({
        trainingClassId: classId,
        athleteId: payload.athleteId,
        present: payload.present ?? true,
        notes: payload.notes,
        stats: payload.stats,
      })
      .returning();

    return athleteStats;
  }

  /**
   * Update athlete stats in a training class
   */
  static async updateAthlete(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
    athleteId: string,
    payload: z.infer<typeof updateAthleteStatsSchema>,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);
    await this.validateClassHierarchy(trainingId, classId);

    const updateData: any = {};
    if (payload.present !== undefined) updateData.present = payload.present;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.stats !== undefined) updateData.stats = payload.stats;

    if (Object.keys(updateData).length === 0) {
      throw status(400, "Nenhum campo para atualizar foi fornecido.");
    }

    const [updated] = await db
      .update(athleteTrainingClassStats)
      .set(updateData)
      .where(
        and(
          eq(athleteTrainingClassStats.athleteId, athleteId),
          eq(athleteTrainingClassStats.trainingClassId, classId),
        ),
      )
      .returning();

    if (!updated) {
      throw status(404, "Estat�sticas do atleta n�o encontradas.");
    }

    return updated;
  }

  /**
   * Remove athlete from training class
   */
  static async removeAthlete(
    userId: string,
    teamId: string,
    trainingId: string,
    classId: string,
    athleteId: string,
  ) {
    // Validate ownership and hierarchy
    await this.validateOwnership(userId, teamId);
    await this.validateTrainingOwnership(teamId, trainingId);
    await this.validateClassHierarchy(trainingId, classId);

    await db
      .delete(athleteTrainingClassStats)
      .where(
        and(
          eq(athleteTrainingClassStats.athleteId, athleteId),
          eq(athleteTrainingClassStats.trainingClassId, classId),
        ),
      );
  }

  /**
   * Validate user owns the team
   */
  private static async validateOwnership(userId: string, teamId: string) {
    const team = await db.query.teams.findFirst({
      where: (row) => and(eq(row.id, teamId), eq(row.createdBy, userId)),
      columns: { id: true },
    });

    if (!team) {
      throw status(
        403,
        "Voc� n�o tem permiss�o para gerenciar treinos deste time.",
      );
    }
  }

  /**
   * Validate training exists and belongs to team
   */
  private static async validateTrainingOwnership(
    teamId: string,
    trainingId: string,
  ) {
    const training = await db.query.trainings.findFirst({
      where: (row) => and(eq(row.id, trainingId), eq(row.teamId, teamId)),
      columns: { id: true },
    });

    if (!training) {
      throw status(404, "Treino n�o encontrado ou n�o pertence ao time.");
    }
  }

  /**
   * Validate training class belongs to training
   */
  private static async validateClassHierarchy(
    trainingId: string,
    classId: string,
  ) {
    const trainingClass = await db.query.trainingClasses.findFirst({
      where: (row) => and(eq(row.id, classId), eq(row.trainingId, trainingId)),
      columns: { id: true },
    });

    if (!trainingClass) {
      throw status(
        404,
        "Classe de treino n�o encontrada ou n�o pertence ao treino.",
      );
    }
  }
}

export { Training };

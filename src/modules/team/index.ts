import { ElysiaProtectedServer } from "../..";
import { Team } from "./service";
import { createTeamSchema, teamIdSchema, updateTeamSchema } from "./model";
import {
  athleteQueryFilterSchema,
  createAthleteSchema,
  transferAthleteSchema,
  athleteIdSchema,
} from "./submodules/athlete/model";
import { Athlete } from "./submodules/athlete/service";
import {
  trainingQueryFilterSchema,
  createTrainingSchema,
  updateTrainingSchema,
  createTrainingClassSchema,
  updateTrainingClassSchema,
  createAthleteStatsSchema,
  updateAthleteStatsSchema,
} from "./submodules/trainings/model";
import { Training } from "./submodules/trainings/service";
import z from "zod";

const team = (app: ElysiaProtectedServer) =>
  app.group("/teams", (controller) =>
    controller
      .get("/", ({ user }) => Team.own(user.id))
      .post("/", ({ user, body }) => Team.create(user.id, body), {
        body: createTeamSchema,
      })
      .get("/:id", ({ params: { id } }) => Team.fetch(id), {
        params: teamIdSchema,
      })
      .patch(
        "/:id",
        ({ user, params: { id }, body }) => Team.patch(id, user.id, body),
        {
          params: teamIdSchema,
          body: updateTeamSchema,
        },
      )
      .get("/all", () => Team.index())
      .get(
        "/:id/athletes",
        ({ params: { id }, query }) => Athlete.fetchByTeam(id, query),
        {
          params: teamIdSchema,
          query: athleteQueryFilterSchema,
        },
      )
      .post(
        "/:id/athletes",
        ({ user, params: { id }, body }) => Athlete.create(id, user.id, body),
        {
          params: teamIdSchema,
          body: createAthleteSchema,
        },
      )
      .post(
        "/:id/athletes/:athleteId/transfer",
        ({ user, params: { id, athleteId }, body }) =>
          Athlete.transfer(athleteId, id, user.id, body),
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            athleteId: z
              .string({ message: "O identificador do atleta é obrigatório." })
              .uuid("O identificador do atleta deve ser um UUID."),
          }),
          body: transferAthleteSchema,
        },
      )

      // ============= TRAINING ROUTES =============
      .get(
        "/:id/trainings",
        ({ user, params: { id }, query }) =>
          Training.fetchByTeam(user.id, id, query),
        {
          params: teamIdSchema,
          query: trainingQueryFilterSchema,
        },
      )
      .post(
        "/:id/trainings",
        async ({ user, params: { id }, body }) => {
          const training = await Training.create(user.id, id, body);
          return { success: true, data: training };
        },
        {
          params: teamIdSchema,
          body: createTrainingSchema,
        },
      )
      .get(
        "/:id/trainings/:trainingId",
        ({ user, params: { id, trainingId } }) =>
          Training.fetch(user.id, id, trainingId),
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
          }),
        },
      )
      .patch(
        "/:id/trainings/:trainingId",
        async ({ user, params: { id, trainingId }, body }) => {
          const updated = await Training.update(user.id, id, trainingId, body);
          return { success: true, data: updated };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
          }),
          body: updateTrainingSchema,
        },
      )
      .delete(
        "/:id/trainings/:trainingId",
        async ({ user, params: { id, trainingId } }) => {
          await Training.delete(user.id, id, trainingId);
          return { success: true, message: "Treino excluído com sucesso." };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
          }),
        },
      )

      // ============= TRAINING CLASS ROUTES =============
      .post(
        "/:id/trainings/:trainingId/classes",
        async ({ user, params: { id, trainingId }, body }) => {
          const trainingClass = await Training.createClass(
            user.id,
            id,
            trainingId,
            body,
          );
          return { success: true, data: trainingClass };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
          }),
          body: createTrainingClassSchema,
        },
      )
      .get(
        "/:id/trainings/:trainingId/classes/:classId",
        ({ user, params: { id, trainingId, classId } }) =>
          Training.fetchClass(user.id, id, trainingId, classId),
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
          }),
        },
      )
      .patch(
        "/:id/trainings/:trainingId/classes/:classId",
        async ({ user, params: { id, trainingId, classId }, body }) => {
          const updated = await Training.updateClass(
            user.id,
            id,
            trainingId,
            classId,
            body,
          );
          return { success: true, data: updated };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
          }),
          body: updateTrainingClassSchema,
        },
      )
      .delete(
        "/:id/trainings/:trainingId/classes/:classId",
        async ({ user, params: { id, trainingId, classId } }) => {
          await Training.deleteClass(user.id, id, trainingId, classId);
          return {
            success: true,
            message: "Classe de treino excluída com sucesso.",
          };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
          }),
        },
      )

      // ============= ATHLETE STATS ROUTES =============
      .post(
        "/:id/trainings/:trainingId/classes/:classId/athletes",
        async ({ user, params: { id, trainingId, classId }, body }) => {
          const athleteStats = await Training.addAthlete(
            user.id,
            id,
            trainingId,
            classId,
            body,
          );
          return { success: true, data: athleteStats };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
          }),
          body: createAthleteStatsSchema,
        },
      )
      .patch(
        "/:id/trainings/:trainingId/classes/:classId/athletes/:athleteId",
        async ({
          user,
          params: { id, trainingId, classId, athleteId },
          body,
        }) => {
          const updated = await Training.updateAthlete(
            user.id,
            id,
            trainingId,
            classId,
            athleteId,
            body,
          );
          return { success: true, data: updated };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
            athleteId: z
              .string({ message: "O identificador do atleta é obrigatório." })
              .uuid("O identificador do atleta deve ser um UUID."),
          }),
          body: updateAthleteStatsSchema,
        },
      )
      .delete(
        "/:id/trainings/:trainingId/classes/:classId/athletes/:athleteId",
        async ({ user, params: { id, trainingId, classId, athleteId } }) => {
          await Training.removeAthlete(
            user.id,
            id,
            trainingId,
            classId,
            athleteId,
          );
          return {
            success: true,
            message: "Atleta removido da classe de treino com sucesso.",
          };
        },
        {
          params: z.object({
            id: z
              .string({ message: "O identificador do time é obrigatório." })
              .uuid("O identificador do time deve ser um UUID."),
            trainingId: z
              .string({ message: "O identificador do treino é obrigatório." })
              .uuid("O identificador do treino deve ser um UUID."),
            classId: z
              .string({ message: "O identificador da classe é obrigatório." })
              .uuid("O identificador da classe deve ser um UUID."),
            athleteId: z
              .string({ message: "O identificador do atleta é obrigatório." })
              .uuid("O identificador do atleta deve ser um UUID."),
          }),
        },
      ),
  );

export { team };

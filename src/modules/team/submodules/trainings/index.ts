import { ElysiaProtectedServer } from "../../../..";
import { Training } from "./service";
import {
  trainingQueryFilterSchema,
  createTrainingSchema,
  updateTrainingSchema,
  trainingParamsSchema,
  createTrainingClassSchema,
  updateTrainingClassSchema,
  trainingClassParamsSchema,
  createAthleteStatsSchema,
  updateAthleteStatsSchema,
  athleteStatsParamsSchema,
} from "./model";

const trainings = (app: ElysiaProtectedServer) =>
  app.group("/trainings", (controller) =>
    controller
      // ============= TRAINING ROUTES =============
      .get(
        "/",
        async function listTrainings({ user, params, query }) {
          const { teamId } = trainingParamsSchema
            .pick({ teamId: true })
            .parse(params);
          const filter = trainingQueryFilterSchema.parse(query);
          return await Training.fetchByTeam(user.id, teamId, filter);
        },
        {
          query: trainingQueryFilterSchema,
        },
      )
      .post(
        "/",
        async function createTraining({ user, params, body }) {
          const { teamId } = trainingParamsSchema
            .pick({ teamId: true })
            .parse(params);
          const training = await Training.create(user.id, teamId, body);
          return {
            success: true,
            data: training,
          };
        },
        {
          body: createTrainingSchema,
        },
      )
      .get(
        "/:trainingId",
        async function fetchTraining({ user, params }) {
          const { teamId, trainingId } = trainingParamsSchema.parse(params);
          return await Training.fetch(user.id, teamId, trainingId);
        },
        {
          params: trainingParamsSchema,
        },
      )
      .patch(
        "/:trainingId",
        async function updateTraining({ user, params, body }) {
          const { teamId, trainingId } = trainingParamsSchema.parse(params);
          const updated = await Training.update(
            user.id,
            teamId,
            trainingId,
            body,
          );
          return {
            success: true,
            data: updated,
          };
        },
        {
          params: trainingParamsSchema,
          body: updateTrainingSchema,
        },
      )
      .delete(
        "/:trainingId",
        async function deleteTraining({ user, params }) {
          const { teamId, trainingId } = trainingParamsSchema.parse(params);
          await Training.delete(user.id, teamId, trainingId);
          return {
            success: true,
            message: "Treino excluído com sucesso.",
          };
        },
        {
          params: trainingParamsSchema,
        },
      )

      // ============= TRAINING CLASS ROUTES =============
      .post(
        "/:trainingId/classes",
        async function createTrainingClass({ user, params, body }) {
          const { teamId, trainingId } = trainingParamsSchema.parse(params);
          const trainingClass = await Training.createClass(
            user.id,
            teamId,
            trainingId,
            body,
          );
          return {
            success: true,
            data: trainingClass,
          };
        },
        {
          params: trainingParamsSchema,
          body: createTrainingClassSchema,
        },
      )
      .get(
        "/:trainingId/classes/:classId",
        async function fetchTrainingClass({ user, params }) {
          const { teamId, trainingId, classId } =
            trainingClassParamsSchema.parse(params);
          return await Training.fetchClass(
            user.id,
            teamId,
            trainingId,
            classId,
          );
        },
        {
          params: trainingClassParamsSchema,
        },
      )
      .patch(
        "/:trainingId/classes/:classId",
        async function updateTrainingClass({ user, params, body }) {
          const { teamId, trainingId, classId } =
            trainingClassParamsSchema.parse(params);
          const updated = await Training.updateClass(
            user.id,
            teamId,
            trainingId,
            classId,
            body,
          );
          return {
            success: true,
            data: updated,
          };
        },
        {
          params: trainingClassParamsSchema,
          body: updateTrainingClassSchema,
        },
      )
      .delete(
        "/:trainingId/classes/:classId",
        async function deleteTrainingClass({ user, params }) {
          const { teamId, trainingId, classId } =
            trainingClassParamsSchema.parse(params);
          await Training.deleteClass(user.id, teamId, trainingId, classId);
          return {
            success: true,
            message: "Classe de treino excluída com sucesso.",
          };
        },
        {
          params: trainingClassParamsSchema,
        },
      )

      // ============= ATHLETE STATS ROUTES =============
      .post(
        "/:trainingId/classes/:classId/athletes",
        async function addAthleteToClass({ user, params, body }) {
          const { teamId, trainingId, classId } =
            trainingClassParamsSchema.parse(params);
          const athleteStats = await Training.addAthlete(
            user.id,
            teamId,
            trainingId,
            classId,
            body,
          );
          return {
            success: true,
            data: athleteStats,
          };
        },
        {
          params: trainingClassParamsSchema,
          body: createAthleteStatsSchema,
        },
      )
      .patch(
        "/:trainingId/classes/:classId/athletes/:athleteId",
        async function updateAthleteStats({ user, params, body }) {
          const { teamId, trainingId, classId, athleteId } =
            athleteStatsParamsSchema.parse(params);
          const updated = await Training.updateAthlete(
            user.id,
            teamId,
            trainingId,
            classId,
            athleteId,
            body,
          );
          return {
            success: true,
            data: updated,
          };
        },
        {
          params: athleteStatsParamsSchema,
          body: updateAthleteStatsSchema,
        },
      )
      .delete(
        "/:trainingId/classes/:classId/athletes/:athleteId",
        async function removeAthleteFromClass({ user, params }) {
          const { teamId, trainingId, classId, athleteId } =
            athleteStatsParamsSchema.parse(params);
          await Training.removeAthlete(
            user.id,
            teamId,
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
          params: athleteStatsParamsSchema,
        },
      ),
  );

export { trainings };

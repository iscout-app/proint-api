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
      ),
  );

export { team };

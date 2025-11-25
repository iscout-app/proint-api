import { ElysiaProtectedServer } from "../..";
import { Team } from "./service";
import { createTeamSchema, teamIdSchema, updateTeamSchema } from "./model";

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
      .get("/all", () => Team.index()),
  );

export { team };

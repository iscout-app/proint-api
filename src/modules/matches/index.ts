import { ElysiaProtectedServer } from "../..";
import { Match } from "./service";
import {
  createMatchSchema,
  updateMatchSchema,
  matchIdSchema,
  matchQueryFilterSchema,
} from "./model";

const match = (app: ElysiaProtectedServer) =>
  app.group("/matches", (controller) =>
    controller
      // List matches with filters
      .get("/", ({ query }) => Match.index(query), {
        query: matchQueryFilterSchema,
      })
      // Get single match
      .get("/:id", ({ params: { id } }) => Match.fetch(id), {
        params: matchIdSchema,
      })
      // Create match
      .post("/", ({ user, body }) => Match.create(user.id, body), {
        body: createMatchSchema,
      })
      // Update match
      .patch(
        "/:id",
        ({ user, params: { id }, body }) => Match.update(user.id, id, body),
        {
          params: matchIdSchema,
          body: updateMatchSchema,
        },
      ),
  );

export { match };

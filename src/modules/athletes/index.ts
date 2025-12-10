import { ElysiaProtectedServer } from "../..";
import { Athlete } from "./service";
import {
  athleteParamSchema,
  athleteQuerySchema,
  athleteMatchesQuerySchema,
} from "./model";

const athletes = (app: ElysiaProtectedServer) =>
  app.group("/athletes", (controller) =>
    controller
      .get(
        "/:id",
        ({ params: { id }, query }) =>
          Athlete.fetch(id, query.limit, query.offset),
        {
          params: athleteParamSchema,
          query: athleteQuerySchema,
        },
      )
      .get(
        "/:id/matches",
        ({ params: { id }, query }) => Athlete.fetchMatches(id, query),
        {
          params: athleteParamSchema,
          query: athleteMatchesQuerySchema,
        },
      ),
  );

export { athletes };

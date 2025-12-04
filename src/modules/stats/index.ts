import { Elysia } from "elysia";
import { auth } from "../auth";
import { Stats } from "./service";
import { createStatsSchema, listStatsQuerySchema } from "./model";

const stats = new Elysia({ prefix: "/stats" })
  .use(auth)
  .get(
    "/",
    async function listStats({ query, user }) {
      const result = await Stats.list(query);
      return result;
    },
    {
      query: listStatsQuerySchema,
    },
  )
  .post(
    "/",
    async function createStats({ body, user }) {
      const result = await Stats.create(body);
      return {
        success: true,
        data: result,
      };
    },
    {
      body: createStatsSchema,
    },
  )
  .get("/player/:id", async function getPlayerStats({ params: { id }, user }) {
    const result = await Stats.getByPlayer(id);
    return result;
  })
  .get(
    "/player/:id/evolution",
    async function getPlayerEvolution({ params: { id }, user }) {
      const result = await Stats.getEvolution(id);
      return result;
    },
  );

export { stats };

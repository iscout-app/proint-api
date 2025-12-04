import { Elysia } from "elysia";
import { auth } from "../auth";
import { Dashboard } from "./service";
import { z } from "zod";

const dashboard = new Elysia({ prefix: "/dashboard" })
  .use(auth)
  .get("/", async function getDashboard({ query, user }) {
    const teamId = (query as any).teamId;
    const result = await Dashboard.getSummary(teamId);
    return result;
  });

export { dashboard };

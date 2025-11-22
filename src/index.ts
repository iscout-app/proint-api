import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { logger } from "./logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { usersTable } from "./db/schema";

const db = drizzle(Bun.env.DATABASE_URL!, {
  schema: {
    usersTable,
  },
});
const port = Bun.env.PORT ?? 3000;
const server = new Elysia({ prefix: "/v1" })
  .use(openapi())
  .trace(function traceRequest(call) {
    call.onRequest((result) => {
      result.onStop(({ elapsed }) =>
        logger.info(
          `[${call.id}] [${call.context.request.url}] request in ${elapsed}ms`,
        ),
      );
    });

    call.onHandle((result) => {
      result.onStop(({ elapsed }) =>
        logger.info(
          `[${call.id}] [${call.context.request.url}] handled in ${elapsed}ms`,
        ),
      );
    });

    call.onError(({ error }) =>
      logger.error(`[${call.id}] [${call.context.request.url}] error`, error),
    );
  })
  .get("/users", async function listUsers() {
    const users = await db.query.usersTable.findMany();

    return users;
  });

try {
  server.listen(port);

  console.log(`Server listening on ${port}`);
} catch (err) {
  console.error(err);
}

export { server };

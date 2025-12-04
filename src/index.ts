import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { logger } from "./logger";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { auth } from "./modules/auth";
import { team } from "./modules/team";
import { athletes } from "./modules/athletes";
import { match } from "./modules/matches";

const db = drizzle(Bun.env.DATABASE_URL!, { schema });

const port = Bun.env.PORT ?? 3000;
const server = new Elysia({ prefix: "/api/v1" })
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

    call.onError(() => {
      logger.error(`[${call.id}] [${call.context.request.url}] error`);
    });
  })
  .use(auth);

type ElysiaProtectedServer = typeof server;

server.use(team).use(athletes).use(match);

try {
  server.listen(port);

  console.log(`Server listening on ${port}`);
} catch (err) {
  console.error(err);
}

export { server, db };
export type { ElysiaProtectedServer };

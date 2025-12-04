import Elysia, { t } from "elysia";
import { Athletes } from "./service";
import { createAthleteSchema, updateAthleteSchema } from "./model";

const athletesModule = new Elysia({ prefix: "/athletes" })
  .get("/", async ({ query }) => {
    const { teamId } = query;
    const athletes = await Athletes.getAll(teamId);
    return { success: true, data: athletes };
  })
  .get("/:id", async ({ params, query }) => {
    const { id } = params;
    const { teamId } = query;
    const athlete = await Athletes.getById(id, teamId);

    if (!athlete) {
      return { success: false, error: "Atleta não encontrado" };
    }

    return { success: true, data: athlete };
  })
  .post(
    "/",
    async ({ body }) => {
      const athlete = await Athletes.create(body);
      return { success: true, data: athlete };
    },
    {
      body: t.Object({
        name: t.String(),
        birthdate: t.String(),
        teamId: t.String(),
        position: t.String(),
        shirtNumber: t.Number(),
      }),
      beforeHandle: ({ body, set }) => {
        const result = createAthleteSchema.safeParse(body);
        if (!result.success) {
          set.status = 400;
          return {
            success: false,
            error: result.error.errors[0].message,
          };
        }
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, query }) => {
      const { id } = params;
      const { teamId } = query;

      if (!teamId) {
        return { success: false, error: "teamId é obrigatório" };
      }

      const athlete = await Athletes.update(id, teamId, body);
      return { success: true, data: athlete };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        birthdate: t.Optional(t.String()),
        position: t.Optional(t.String()),
        shirtNumber: t.Optional(t.Number()),
      }),
      beforeHandle: ({ body, set }) => {
        const result = updateAthleteSchema.safeParse(body);
        if (!result.success) {
          set.status = 400;
          return {
            success: false,
            error: result.error.errors[0].message,
          };
        }
      },
    },
  )
  .delete("/:id", async ({ params, query }) => {
    const { id } = params;
    const { teamId } = query;

    if (!teamId) {
      return { success: false, error: "teamId é obrigatório" };
    }

    await Athletes.delete(id, teamId);
    return { success: true, message: "Atleta removido com sucesso" };
  });

export { athletesModule };

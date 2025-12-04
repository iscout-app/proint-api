import { Elysia, status } from "elysia";
import { auth } from "../auth";
import { Player } from "./service";
import {
  createPlayerSchema,
  updatePlayerSchema,
  listPlayersQuerySchema,
} from "./model";

const players = new Elysia({ prefix: "/players" })
  .use(auth)
  .get(
    "/",
    async function listPlayers({ query, user }) {
      const result = await Player.list(query);
      return result;
    },
    {
      query: listPlayersQuerySchema,
    },
  )
  .get("/:id", async function getPlayer({ params: { id }, user }) {
    const result = await Player.getById(id);

    if (!result) {
      throw status(404, "Jogador não encontrado");
    }

    return result;
  })
  .post(
    "/",
    async function createPlayer({ body, user }) {
      const result = await Player.create(body);
      return {
        success: true,
        data: result,
      };
    },
    {
      body: createPlayerSchema,
    },
  )
  .patch(
    "/:id",
    async function updatePlayer({ params: { id }, body, user }) {
      // For now, we'll require teamId in the body for update
      // In a real app, you might want to validate the user owns this team
      const teamId = (body as any).teamId;

      if (!teamId) {
        throw status(400, "teamId é obrigatório para atualização");
      }

      const result = await Player.update(id, teamId, body);

      if (!result) {
        throw status(404, "Jogador não encontrado");
      }

      return {
        success: true,
        data: result,
      };
    },
    {
      body: updatePlayerSchema,
    },
  )
  .delete("/:id", async function deletePlayer({ params: { id }, query, user }) {
    const teamId = (query as any).teamId;

    if (!teamId) {
      throw status(400, "teamId é obrigatório para exclusão");
    }

    await Player.delete(id, teamId);

    return {
      success: true,
      message: "Jogador removido com sucesso",
    };
  });

export { players };

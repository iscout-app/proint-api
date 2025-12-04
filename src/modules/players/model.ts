import { z } from "zod";

const createPlayerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),
  teamId: z.string().uuid("ID do time inválido"),
  shirtNumber: z.number().int().min(1).max(99),
  position: z.string().min(1, "Posição é obrigatória").max(32),
});

const updatePlayerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().min(1).max(32).optional(),
});

const listPlayersQuerySchema = z.object({
  teamId: z.string().uuid().optional(),
  position: z.string().optional(),
  name: z.string().optional(),
});

export { createPlayerSchema, updatePlayerSchema, listPlayersQuerySchema };

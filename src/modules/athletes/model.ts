import { z } from "zod";

const createAthleteSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório" })
    .min(1, "Nome não pode estar vazio")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  birthdate: z
    .string({ message: "Data de nascimento é obrigatória" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  teamId: z.string().uuid("ID do time inválido"),
  position: z
    .string({ message: "Posição é obrigatória" })
    .max(32, "Posição deve ter no máximo 32 caracteres"),
  shirtNumber: z
    .number({ message: "Número da camisa é obrigatório" })
    .int("Número da camisa deve ser um inteiro")
    .min(1, "Número da camisa deve ser maior que 0")
    .max(999, "Número da camisa deve ser menor que 1000"),
});

const updateAthleteSchema = z.object({
  name: z
    .string()
    .min(1, "Nome não pode estar vazio")
    .max(255, "Nome deve ter no máximo 255 caracteres")
    .optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
  position: z
    .string()
    .max(32, "Posição deve ter no máximo 32 caracteres")
    .optional(),
  shirtNumber: z
    .number()
    .int("Número da camisa deve ser um inteiro")
    .min(1, "Número da camisa deve ser maior que 0")
    .max(999, "Número da camisa deve ser menor que 1000")
    .optional(),
});

export { createAthleteSchema, updateAthleteSchema };

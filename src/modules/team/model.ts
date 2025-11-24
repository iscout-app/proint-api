import { z } from "zod";

const createTeamSchema = z.object({
  fullName: z
    .string({ error: "O nome da equipe é obrigatório." })
    .min(3, "O nome do time deve possuir ao menos 3 letras.")
    .max(255, "O nome do time deve possuir no máximo 255 letras."),
  shortName: z
    .string({ error: "A sigla da equipe é obrigatória." })
    .min(2, "A sigla da equipe deve possuir ao menos 2 letras.")
    .max(4, "A sigla da equipe deve possuir no máximo 4 letras."),
  iconUrl: z
    .url({ error: "A URL do ícone do time deve ser válida." })
    .optional(),
  mainColorHex: z
    .hex({ error: "A cor principal da equipe deve ser um hexadecimal." })
    .length(6, "O hexadecimal deve ter 6 caracteres.")
    .optional(),
  secondaryColorHex: z
    .hex({ error: "A cor secundária da equipe deve ser um hexadecimal. " })
    .length(6, "O hexadecimal deve ter 6 caracteres.")
    .optional(),
});

const teamIdSchema = z.object({
  id: z.uuid("O identificador do time deve ser um UUID"),
});

const updateTeamSchema = createTeamSchema.partial();

export { createTeamSchema, teamIdSchema, updateTeamSchema };

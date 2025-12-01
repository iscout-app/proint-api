import z from "zod";

const athleteQueryFilterSchema = z.object({
  current: z
    .string()
    .transform((input, ctx) => {
      if (input !== "true" && input !== "false") {
        ctx.addIssue({
          code: "invalid_format",
          format: "O filtro de atletas atuais deve ser um booleano.",
        });

        return false;
      }

      return input === "true";
    })
    .default(false),
  name: z.string().optional(),
  position: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const createAthleteSchema = z.object({
  name: z
    .string({ message: "O nome do atleta é obrigatório." })
    .min(3, "O nome do atleta deve possuir ao menos 3 letras.")
    .max(255, "O nome do atleta deve possuir no máximo 255 letras."),
  birthdate: z.iso.date("A data de nascimento deve ser válida."),
  shirtNumber: z
    .number({ message: "O número da camisa é obrigatório." })
    .int("O número da camisa deve ser um inteiro.")
    .min(0, "O número da camisa deve ser maior ou igual a 0.")
    .max(99, "O número da camisa deve ser menor ou igual a 99."),
  position: z
    .string({ message: "A posição é obrigatória." })
    .min(2, "A posição deve possuir ao menos 2 letras.")
    .max(32, "A posição deve possuir no máximo 32 letras."),
});

const transferAthleteSchema = z.object({
  targetTeamId: z.uuid("O identificador do time de destino é obrigatório."),
  shirtNumber: z
    .number({ message: "O número da camisa deve ser um número." })
    .int("O número da camisa deve ser um inteiro.")
    .min(0, "O número da camisa deve ser maior ou igual a 0.")
    .max(99, "O número da camisa deve ser menor ou igual a 99.")
    .optional(),
  position: z
    .string()
    .min(2, "A posição deve possuir ao menos 2 letras.")
    .max(32, "A posição deve possuir no máximo 32 letras.")
    .optional(),
});

const athleteIdSchema = z.object({
  athleteId: z.uuid("O identificador do atleta deve ser um UUID."),
});

export {
  athleteQueryFilterSchema,
  createAthleteSchema,
  transferAthleteSchema,
  athleteIdSchema,
};

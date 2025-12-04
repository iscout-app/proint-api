import z from "zod";

const athleteParamSchema = z.object({
  id: z.uuid({ message: "O identificador do atleta é obrigatório." }),
});

const athleteQuerySchema = z.object({
  limit: z
    .number({ message: "O limite deve ser um número." })
    .int("O limite deve ser um inteiro.")
    .min(1, "O limite deve ser maior ou igual a 1.")
    .max(100, "O limite deve ser menor ou igual a 100.")
    .default(20),
  offset: z
    .number({ message: "O offset deve ser um número." })
    .int("O offset deve ser um inteiro.")
    .min(0, "O offset deve ser maior ou igual a 0.")
    .default(0),
});

const athleteMatchesQuerySchema = z.object({
  teamId: z
    .string()
    .uuid("O identificador do time deve ser um UUID.")
    .optional(),
  from: z
    .string()
    .datetime("A data inicial deve ser um timestamp válido.")
    .optional(),
  to: z
    .string()
    .datetime("A data final deve ser um timestamp válido.")
    .optional(),
  limit: z.coerce
    .number({ message: "O limite deve ser um número." })
    .int("O limite deve ser um inteiro.")
    .min(1, "O limite deve ser maior ou igual a 1.")
    .max(100, "O limite deve ser menor ou igual a 100.")
    .default(20),
  offset: z.coerce
    .number({ message: "O offset deve ser um número." })
    .int("O offset deve ser um inteiro.")
    .min(0, "O offset deve ser maior ou igual a 0.")
    .default(0),
});

export { athleteParamSchema, athleteQuerySchema, athleteMatchesQuerySchema };

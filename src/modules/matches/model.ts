import z from "zod";

const matchAthleteSchema = z.object({
  athleteId: z.uuid("O identificador do atleta deve ser um UUID."),
  teamId: z.uuid("O identificador do time deve ser um UUID."),
  position: z
    .string({ message: "A posição é obrigatória." })
    .min(2, "A posição deve possuir ao menos 2 letras.")
    .max(255, "A posição deve possuir no máximo 255 letras."),
  goals: z
    .number({ message: "O número de gols deve ser um número." })
    .int("O número de gols deve ser um inteiro.")
    .min(0, "O número de gols deve ser maior ou igual a 0.")
    .default(0),
  assists: z
    .number({ message: "O número de assistências deve ser um número." })
    .int("O número de assistências deve ser um inteiro.")
    .min(0, "O número de assistências deve ser maior ou igual a 0.")
    .default(0),
  yellowCards: z
    .number({ message: "O número de cartões amarelos deve ser um número." })
    .int("O número de cartões amarelos deve ser um inteiro.")
    .min(0, "O número de cartões amarelos deve ser maior ou igual a 0.")
    .max(2, "O número de cartões amarelos deve ser no máximo 2.")
    .default(0),
  redCards: z
    .number({ message: "O número de cartões vermelhos deve ser um número." })
    .int("O número de cartões vermelhos deve ser um inteiro.")
    .min(0, "O número de cartões vermelhos deve ser maior ou igual a 0.")
    .max(1, "O número de cartões vermelhos deve ser no máximo 1.")
    .default(0),
});

const createMatchSchema = z
  .object({
    homeTeamId: z.uuid("O identificador do time mandante deve ser um UUID."),
    awayTeamId: z.uuid("O identificador do time visitante deve ser um UUID."),
    timestamp: z.iso.datetime(
      "A data e hora da partida devem estar em formato ISO válido.",
    ),
    homeScore: z
      .number({ message: "O placar do time mandante é obrigatório." })
      .int("O placar do time mandante deve ser um inteiro.")
      .min(0, "O placar do time mandante deve ser maior ou igual a 0."),
    awayScore: z
      .number({ message: "O placar do time visitante é obrigatório." })
      .int("O placar do time visitante deve ser um inteiro.")
      .min(0, "O placar do time visitante deve ser maior ou igual a 0."),
    athletes: z.array(matchAthleteSchema).default([]).optional(),
  })
  .refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "O time mandante e visitante devem ser diferentes.",
    path: ["awayTeamId"],
  });

const updateMatchSchema = z.object({
  timestamp: z.iso
    .datetime("A data e hora devem estar em formato ISO válido.")
    .optional(),
  homeScore: z
    .number({ message: "O placar do time mandante deve ser um número." })
    .int("O placar do time mandante deve ser um inteiro.")
    .min(0, "O placar do time mandante deve ser maior ou igual a 0.")
    .optional(),
  awayScore: z
    .number({ message: "O placar do time visitante deve ser um número." })
    .int("O placar do time visitante deve ser um inteiro.")
    .min(0, "O placar do time visitante deve ser maior ou igual a 0.")
    .optional(),
  athletes: z.array(matchAthleteSchema).optional(),
});

const matchIdSchema = z.object({
  id: z.uuid("O identificador da partida deve ser um UUID."),
});

const matchQueryFilterSchema = z.object({
  teamId: z.uuid("O identificador do time deve ser um UUID.").optional(),
  from: z.iso
    .datetime("A data inicial deve estar em formato ISO válido.")
    .optional(),
  to: z.iso
    .datetime("A data final deve estar em formato ISO válido.")
    .optional(),
});

export {
  matchAthleteSchema,
  createMatchSchema,
  updateMatchSchema,
  matchIdSchema,
  matchQueryFilterSchema,
};

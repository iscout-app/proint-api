import { z } from "zod";

// ============= TRAINING SCHEMAS =============

const trainingQueryFilterSchema = z.object({
  from: z
    .string()
    .date("A data inicial deve estar no formato YYYY-MM-DD.")
    .optional(),
  to: z
    .string()
    .date("A data final deve estar no formato YYYY-MM-DD.")
    .optional(),
  concluded: z
    .string()
    .transform((input, ctx) => {
      if (input !== "true" && input !== "false") {
        ctx.addIssue({
          code: "invalid_string",
          message: "O filtro de conclusão deve ser um booleano (true/false).",
          validation: "regex",
        });
        return z.NEVER;
      }
      return input === "true";
    })
    .optional(),
});

const createTrainingSchema = z.object({
  date: z
    .string({ message: "A data do treino é obrigatória." })
    .date("A data deve estar no formato YYYY-MM-DD válido."),
});

const updateTrainingSchema = z.object({
  date: z
    .string()
    .date("A data deve estar no formato YYYY-MM-DD válido.")
    .optional(),
});

const trainingIdSchema = z.object({
  trainingId: z.uuid("O identificador do treino deve ser um UUID."),
});

// ============= TRAINING CLASS SCHEMAS =============

const createTrainingClassSchema = z.object({
  title: z
    .string({ message: "O título da classe é obrigatório." })
    .min(3, "O título deve possuir ao menos 3 caracteres.")
    .max(1024, "O título deve possuir no máximo 1024 caracteres."),
  description: z
    .string()
    .max(4096, "A descrição deve possuir no máximo 4096 caracteres.")
    .optional(),
  notes: z
    .string()
    .max(4096, "As notas devem possuir no máximo 4096 caracteres.")
    .optional(),
});

const updateTrainingClassSchema = z.object({
  title: z
    .string()
    .min(3, "O título deve possuir ao menos 3 caracteres.")
    .max(1024, "O título deve possuir no máximo 1024 caracteres.")
    .optional(),
  description: z
    .string()
    .max(4096, "A descrição deve possuir no máximo 4096 caracteres.")
    .optional(),
  notes: z
    .string()
    .max(4096, "As notas devem possuir no máximo 4096 caracteres.")
    .optional(),
  concluded: z
    .boolean({ message: "O campo de conclusão deve ser um booleano." })
    .optional(),
});

const trainingClassIdSchema = z.object({
  classId: z.uuid("O identificador da classe deve ser um UUID."),
});

// ============= ATHLETE TRAINING CLASS STATS SCHEMAS =============

const createAthleteStatsSchema = z.object({
  athleteId: z.uuid("O identificador do atleta deve ser um UUID."),
  present: z
    .boolean({ message: "O campo de presença deve ser um booleano." })
    .default(true)
    .optional(),
  notes: z
    .string()
    .max(4096, "As notas devem possuir no máximo 4096 caracteres.")
    .optional(),
  stats: z
    .record(z.any(), {
      message: "As estatísticas devem ser um objeto JSON válido.",
    })
    .optional(),
});

const updateAthleteStatsSchema = z.object({
  present: z
    .boolean({ message: "O campo de presença deve ser um booleano." })
    .optional(),
  notes: z
    .string()
    .max(4096, "As notas devem possuir no máximo 4096 caracteres.")
    .optional(),
  stats: z
    .record(z.any(), {
      message: "As estatísticas devem ser um objeto JSON válido.",
    })
    .optional(),
});

const athleteIdParamSchema = z.object({
  athleteId: z.uuid("O identificador do atleta deve ser um UUID."),
});

// ============= COMBINED PARAM SCHEMAS =============

const trainingParamsSchema = z.object({
  teamId: z.uuid("O identificador do time deve ser um UUID."),
  trainingId: z.uuid("O identificador do treino deve ser um UUID."),
});

const trainingClassParamsSchema = z.object({
  teamId: z.uuid("O identificador do time deve ser um UUID."),
  trainingId: z.uuid("O identificador do treino deve ser um UUID."),
  classId: z.uuid("O identificador da classe deve ser um UUID."),
});

const athleteStatsParamsSchema = z.object({
  teamId: z.uuid("O identificador do time deve ser um UUID."),
  trainingId: z.uuid("O identificador do treino deve ser um UUID."),
  classId: z.uuid("O identificador da classe deve ser um UUID."),
  athleteId: z.uuid("O identificador do atleta deve ser um UUID."),
});

export {
  // Training
  trainingQueryFilterSchema,
  createTrainingSchema,
  updateTrainingSchema,
  trainingIdSchema,
  trainingParamsSchema,

  // Training Class
  createTrainingClassSchema,
  updateTrainingClassSchema,
  trainingClassIdSchema,
  trainingClassParamsSchema,

  // Athlete Stats
  createAthleteStatsSchema,
  updateAthleteStatsSchema,
  athleteIdParamSchema,
  athleteStatsParamsSchema,
};

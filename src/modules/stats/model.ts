import { z } from "zod";

const createStatsSchema = z.object({
  athleteId: z.string().uuid("ID do atleta inválido"),
  matchId: z.string().uuid("ID da partida inválido"),
  teamId: z.string().uuid("ID do time inválido"),
  position: z.string().min(1, "Posição é obrigatória"),
  minutesPlayed: z.number().int().min(0).max(120).default(0),
  // Offensive stats
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  shots: z.number().int().min(0).default(0),
  shotsOnTarget: z.number().int().min(0).default(0),
  // Passing stats
  accuratePasses: z.number().int().min(0).default(0),
  inaccuratePasses: z.number().int().min(0).default(0),
  // Defensive stats
  tackles: z.number().int().min(0).default(0),
  interceptions: z.number().int().min(0).default(0),
  foulsCommitted: z.number().int().min(0).default(0),
  foulsSuffered: z.number().int().min(0).default(0),
  // Cards
  yellowCards: z.number().int().min(0).max(2).default(0),
  redCards: z.number().int().min(0).max(1).default(0),
  // Performance rating (0-100, displayed as 0.0-10.0)
  performanceRating: z.number().int().min(0).max(100).optional(),
  observations: z.string().max(4096).optional(),
});

const listStatsQuerySchema = z.object({
  athleteId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

export { createStatsSchema, listStatsQuerySchema };

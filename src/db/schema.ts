import { relations } from "drizzle-orm";
import {
  char,
  pgTable,
  timestamp,
  uuid,
  varchar,
  primaryKey,
  integer,
  date,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).unique().notNull(),
  password: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 20 }).notNull().default("tecnico"), // admin, tecnico, olheiro, responsavel
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

const teams = pgTable("teams", {
  id: uuid().defaultRandom().primaryKey(),
  fullName: varchar({ length: 255 }).notNull(),
  shortName: varchar({ length: 4 }),
  iconUrl: varchar({ length: 1024 }),
  mainColorHex: char({ length: 6 }),
  secondaryColorHex: char({ length: 6 }),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
});

const athletes = pgTable("athlete", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  birthdate: date().notNull(),
});

const athleteCareer = pgTable(
  "athlete_career",
  {
    athleteId: uuid()
      .notNull()
      .references(() => athletes.id),
    teamId: uuid()
      .notNull()
      .references(() => teams.id),
    shirtNumber: integer().notNull(),
    position: varchar({ length: 32 }).notNull(),
    // desnormalizados, devem ser atualizados conforme a criação de partidas
    matches: integer().notNull().default(0),
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    yellowCards: integer().notNull().default(0),
    redCards: integer().notNull().default(0),
    startedAt: date().notNull().defaultNow(),
    updatedAt: timestamp().$onUpdateFn(() => new Date()),
    finishedAt: date(),
  },
  (table) => [primaryKey({ columns: [table.athleteId, table.teamId] })],
);

const matches = pgTable("matches", {
  id: uuid().defaultRandom().primaryKey(),
  timestamp: timestamp().notNull(),
  homeTeamId: uuid()
    .notNull()
    .references(() => teams.id),
  awayTeamId: uuid()
    .notNull()
    .references(() => teams.id),
  homeScore: integer().notNull().default(0),
  awayScore: integer().notNull().default(0),
});

const matchAthletes = pgTable(
  "match_athletes",
  {
    athleteId: uuid()
      .notNull()
      .references(() => athletes.id),
    matchId: uuid()
      .notNull()
      .references(() => matches.id),
    teamId: uuid()
      .notNull()
      .references(() => teams.id),
    position: varchar({ length: 255 }).notNull(),
    minutesPlayed: integer().notNull().default(0),
    // Offensive stats
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    shots: integer().notNull().default(0),
    shotsOnTarget: integer().notNull().default(0),
    // Passing stats
    accuratePasses: integer().notNull().default(0),
    inaccuratePasses: integer().notNull().default(0),
    // Defensive stats
    tackles: integer().notNull().default(0),
    interceptions: integer().notNull().default(0),
    foulsCommitted: integer().notNull().default(0),
    foulsSuffered: integer().notNull().default(0),
    // Cards
    yellowCards: integer().notNull().default(0),
    redCards: integer().notNull().default(0),
    // Performance rating and observations
    performanceRating: integer(), // 0-100 (stored as integer, displayed as 0.0-10.0)
    observations: varchar({ length: 4096 }),
  },
  (table) => [
    primaryKey({ columns: [table.athleteId, table.matchId, table.teamId] }),
  ],
);

const trainings = pgTable("trainings", {
  id: uuid().defaultRandom().primaryKey(),
  teamId: uuid()
    .notNull()
    .references(() => teams.id),
  date: date().notNull(),
});

const trainingClasses = pgTable("training_class", {
  id: uuid().defaultRandom().primaryKey(),
  trainingId: uuid()
    .notNull()
    .references(() => trainings.id),
  title: varchar({ length: 1024 }).notNull(),
  description: varchar({ length: 4096 }),
  notes: varchar({ length: 4096 }),
  concluded: boolean().default(false),
  concludedAt: timestamp(),
});

const athleteTrainingClassStats = pgTable(
  "athlete_training_class_stats",
  {
    athleteId: uuid()
      .notNull()
      .references(() => athletes.id),
    trainingClassId: uuid()
      .notNull()
      .references(() => trainingClasses.id),
    present: boolean().default(true),
    notes: varchar({ length: 4096 }),
    stats: jsonb(),
  },
  (table) => [
    primaryKey({ columns: [table.athleteId, table.trainingClassId] }),
  ],
);

const teamRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
    relationName: "owner",
  }),
  athletes: many(athleteCareer),
  trainings: many(trainings),
  matchAthletes: many(matchAthletes),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
}));

const athleteRelations = relations(athletes, ({ many }) => ({
  teams: many(athleteCareer),
  matchPerformances: many(matchAthletes),
}));

const athleteCareerRelations = relations(athleteCareer, ({ one }) => ({
  athlete: one(athletes, {
    fields: [athleteCareer.athleteId],
    references: [athletes.id],
  }),
  team: one(teams, {
    fields: [athleteCareer.teamId],
    references: [teams.id],
  }),
}));

const userRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "owner" }),
}));

const matchRelations = relations(matches, ({ one }) => ({
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
}));

const matchAthleteRelations = relations(matchAthletes, ({ one }) => ({
  athlete: one(athletes, {
    fields: [matchAthletes.athleteId],
    references: [athletes.id],
  }),
  match: one(matches, {
    fields: [matchAthletes.matchId],
    references: [matches.id],
  }),
  team: one(teams, {
    fields: [matchAthletes.teamId],
    references: [teams.id],
  }),
}));

const trainingRelations = relations(trainings, ({ one, many }) => ({
  team: one(teams, {
    fields: [trainings.teamId],
    references: [teams.id],
  }),
  classes: many(trainingClasses),
}));

const trainingClassesRelations = relations(
  trainingClasses,
  ({ one, many }) => ({
    training: one(trainings, {
      fields: [trainingClasses.trainingId],
      references: [trainings.id],
    }),
    athleteStats: many(athleteTrainingClassStats),
  }),
);

const athleteTrainingClassStatsRelations = relations(
  athleteTrainingClassStats,
  ({ one }) => ({
    athlete: one(athletes, {
      fields: [athleteTrainingClassStats.athleteId],
      references: [athletes.id],
    }),
    trainingClasses: one(trainingClasses, {
      fields: [athleteTrainingClassStats.trainingClassId],
      references: [trainingClasses.id],
    }),
  }),
);

export {
  users,
  teams,
  athletes,
  athleteCareer,
  matches,
  matchAthletes,
  trainings,
  trainingClasses,
  athleteTrainingClassStats,
  userRelations,
  teamRelations,
  athleteRelations,
  athleteCareerRelations,
  matchRelations,
  matchAthleteRelations,
  trainingRelations,
  trainingClassesRelations,
  athleteTrainingClassStatsRelations,
};

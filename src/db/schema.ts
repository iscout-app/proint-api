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
} from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).unique().notNull(),
  password: varchar({ length: 255 }).notNull(),
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
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    yellowCards: integer().notNull().default(0),
    redCards: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.athleteId, table.matchId, table.teamId] }),
  ],
);

const teamRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
    relationName: "owner",
  }),
  athletes: many(athleteCareer),
  playAthletes: many(matchAthletes),
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

export {
  users,
  teams,
  athletes,
  athleteCareer,
  matches,
  matchAthletes,
  userRelations,
  teamRelations,
  athleteRelations,
  athleteCareerRelations,
  matchRelations,
  matchAthleteRelations,
};

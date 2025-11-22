import { relations } from "drizzle-orm";
import {
  char,
  pgTable,
  timestamp,
  uuid,
  varchar,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).unique().notNull(),
  password: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().$onUpdateFn(() => new Date()),
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
  birthdate: timestamp(),
});

const athleteCareer = pgTable(
  "athlete_career",
  {
    athlete: uuid()
      .notNull()
      .references(() => athletes.id),
    team: uuid()
      .notNull()
      .references(() => teams.id),
    shirtNumber: integer().notNull(),
    position: varchar({ length: 32 }).notNull(),
    matches: integer().notNull().default(0),
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    yellowCards: integer().notNull().default(0),
    redCards: integer().notNull().default(0),
    startedAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().$onUpdateFn(() => new Date()),
    finishedAt: timestamp(),
  },
  (table) => [primaryKey({ columns: [table.athlete, table.team] })],
);

const teamRelations = relations(teams, ({ many }) => ({
  athletes: many(athleteCareer),
}));

const athleteRelations = relations(athletes, ({ many }) => ({
  teams: many(athleteCareer),
}));

const userRelations = relations(users, ({ many }) => ({
  own: many(teams),
}));

export {
  users,
  teams,
  athletes,
  athleteCareer,
  userRelations,
  teamRelations,
  athleteRelations,
};

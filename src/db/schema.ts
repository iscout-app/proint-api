import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

const usersTable = pgTable("users", {
  id: uuid().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export { usersTable };

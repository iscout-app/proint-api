import z from "zod";
import { loginSchema, registerSchema } from "./model";
import { db } from "../..";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { status } from "elysia";

abstract class Auth {
  static async signIn({ email, password }: z.infer<typeof loginSchema>) {
    const record = await db.query.users.findFirst({
      where: (row) => eq(row.email, email),
      with: {
        teams: true,
      },
    });

    if (!record) {
      return undefined;
    }

    const passwordHashMatch = await Bun.password.verify(
      password,
      record.password,
    );

    if (!passwordHashMatch) {
      return undefined;
    }

    const partialRecord: Partial<typeof record> = record;
    delete partialRecord.password;

    return partialRecord;
  }

  static async register({
    name,
    email,
    password,
  }: z.infer<typeof registerSchema>) {
    const record = await db.query.users.findFirst({
      where: (row) => eq(row.email, email),
      columns: {
        id: true,
      },
    });

    if (record) {
      throw status(409, "E-mail já cadastrado.");
    }

    const hash = await Bun.password.hash(password);

    const [result] = await db
      .insert(users)
      .values({
        email,
        name,
        password: hash,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    return result;
  }
}

abstract class User {
  static async findUserById(id: (typeof users.$inferSelect)["id"]) {
    const record = await db.query.users.findFirst({
      where: (row) => eq(row.id, id),
      columns: {
        password: false,
      },
    });

    return record;
  }
}

export { Auth, User };

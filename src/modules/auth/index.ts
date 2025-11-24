import { Elysia, status } from "elysia";
import { loginSchema, registerSchema } from "./model";
import { Auth, User } from "./service";
import jwt from "@elysiajs/jwt";

const auth = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
      exp: "1d",
    }),
  )
  .post(
    "/sign-in",
    async function signIn({ body, jwt, cookie: { auth } }) {
      const result = await Auth.signIn(body);

      if (!result) {
        throw status(400, "Verifique os campos informados e tente novamente.");
      }

      const token = await jwt.sign({
        id: result.id,
      });

      auth.set({
        value: token,
        maxAge: 86400,
        httpOnly: true,
      });

      return {
        success: true,
        data: result,
      };
    },
    {
      body: loginSchema,
    },
  )
  .post(
    "/sign-up",
    async function register({ body, jwt, cookie: { auth } }) {
      const result = await Auth.register(body);
      const token = await jwt.sign({ id: result.id });

      auth.set({
        value: token,
        maxAge: 86400,
        httpOnly: true,
      });

      return {
        success: true,
        data: result,
      };
    },
    {
      body: registerSchema,
    },
  )
  .derive(
    {
      as: "scoped",
    },
    async function authMiddleware({ cookie: { auth }, jwt }) {
      if (!auth || !auth.value) {
        throw status(401, "Unauthorized");
      }

      const payload = await jwt.verify(auth.value as string);

      if (!payload) {
        throw status(403, "Forbidden");
      }

      const user = await User.findUserById(payload.id as string);

      if (!user) {
        throw status(403, "Forbidden");
      }

      return { user };
    },
  );

export { auth };

import { Elysia, status } from "elysia";
import { loginSchema, registerSchema } from "./model";
import { Auth } from "./service";
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
    async function signIn({ body, jwt }) {
      const result = await Auth.signIn(body);

      if (!result) {
        throw status(400, "Verifique os campos informados e tente novamente.");
      }

      const token = await jwt.sign({
        id: result.id,
      });

      return {
        data: result,
        token,
      };
    },
    {
      body: loginSchema,
    },
  )
  .post(
    "/register",
    async function register({ body, jwt }) {
      try {
        const result = await Auth.register(body);
        const token = await jwt.sign({ id: result.id });

        return {
          data: result,
          token,
        };
      } catch {
        throw status(409, "Endereço de e-mail já utilizado.");
      }
    },
    {
      body: registerSchema,
    },
  );

export { auth };

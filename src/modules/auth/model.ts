import { z } from "zod";

const loginSchema = z.object({
  email: z
    .email({ error: "Você deve fornecer um e-mail." })
    .max(255, "Seu e-mail deve ter no máximo 255 caracteres."),
  password: z
    .string({ error: "Você deve fornecer uma senha." })
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .max(255, "A senha deve ter no máximo 255 caracteres."),
});

const registerSchema = loginSchema.and(
  z.object({
    name: z.string().max(255, "Seu nome deve ter no máximo 255 caracteres."),
  }),
);

export { registerSchema, loginSchema };

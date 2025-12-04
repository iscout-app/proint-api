import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string({ message: "Você deve fornecer um e-mail." })
    .email("E-mail inválido")
    .max(255, "Seu e-mail deve ter no máximo 255 caracteres."),
  password: z
    .string({ message: "Você deve fornecer uma senha." })
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .max(255, "A senha deve ter no máximo 255 caracteres."),
});

const registerSchema = loginSchema.and(
  z.object({
    name: z.string().max(255, "Seu nome deve ter no máximo 255 caracteres."),
    role: z
      .enum(["admin", "tecnico", "olheiro", "responsavel"])
      .optional()
      .default("tecnico"),
  }),
);

export { registerSchema, loginSchema };

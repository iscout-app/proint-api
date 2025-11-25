import z from "zod";

const athleteQueryFilterSchema = z.object({
  current: z
    .boolean("O filtro de atletas atuais deve ser um booleano.")
    .default(false),
  name: z.string().optional(),
  position: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export { athleteQueryFilterSchema };

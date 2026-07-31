import { z } from "zod";

const optionalImageUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().url().max(2048).refine(
    (value) => new URL(value).protocol === "https:",
    "Obrazek musi używać adresu HTTPS.",
  ).optional(),
);

export const articleInputSchema = z.object({
  category: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(100_000),
  excerpt: z.string().trim().min(1).max(500),
  imageUrl: optionalImageUrl,
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  title: z.string().trim().min(1).max(200),
}).strict();

export function getArticleInput(value: unknown) {
  return articleInputSchema.safeParse(value);
}

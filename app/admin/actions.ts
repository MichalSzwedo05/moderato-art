"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getArticleInput } from "@/lib/article";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";

function formValues(formData: FormData) {
  return Object.fromEntries([
    "title",
    "slug",
    "category",
    "excerpt",
    "imageUrl",
    "status",
    "content",
  ].map((name) => [name, formData.get(name)]));
}

export async function createArticle(formData: FormData) {
  const result = await saveArticle(formData);
  redirect(result ? "/admin?article=created" : "/admin?article=invalid");
}

export async function updateArticle(articleId: string, formData: FormData) {
  const result = await saveArticle(formData, articleId);
  redirect(result ? "/admin?article=updated" : "/admin?article=invalid");
}

async function saveArticle(formData: FormData, articleId?: string) {
  const config = getAdminAuthConfig();
  const requestHeaders = await headers();
  if (!config
    || !isSameAdminOrigin(requestHeaders.get("origin"), config)
    || !(await getAdminSession())) {
    return false;
  }

  const parsed = getArticleInput(formValues(formData));
  if (!parsed.success) {
    return false;
  }

  try {
    const data = { ...parsed.data, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null };
    if (articleId) await getPrisma().article.update({ data, where: { id: articleId } });
    else await getPrisma().article.create({ data });
  } catch {
    return false;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return true;
}

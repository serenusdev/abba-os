"use server";

import { INITIAL_RESOURCES } from "./data";
import { ResourceItem } from "./types";

export async function getResourcesAction(
  query: string = "",
  categorySlug: string = "all"
): Promise<ResourceItem[]> {
  let filtered = [...INITIAL_RESOURCES];

  if (categorySlug && categorySlug !== "all") {
    filtered = filtered.filter((r) => r.categorySlug === categorySlug);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export async function toggleFavoriteAction(
  resourceId: string
): Promise<{ success: boolean; isFavorited: boolean }> {
  if (!resourceId) {
    return { success: false, isFavorited: false };
  }
  // In production, queries public.resource_favorites table in Supabase
  return {
    success: true,
    isFavorited: true,
  };
}

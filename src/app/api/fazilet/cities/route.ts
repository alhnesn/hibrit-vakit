import { NextRequest } from "next/server";
import { getFaziletCities } from "@/lib/fazilet";
import type { FaziletCity } from "@/lib/types";
import { ALLOWED_COUNTRY_IDS, DEFAULT_COUNTRY_ID } from "@/lib/config";

const cache = new Map<string, { data: FaziletCity[]; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const countryId = Number(params.get("countryId") || String(DEFAULT_COUNTRY_ID));
  const lang = Number(params.get("lang") || "1");

  // Enforce country restriction
  if (ALLOWED_COUNTRY_IDS && !ALLOWED_COUNTRY_IDS.includes(countryId)) {
    return Response.json(
      { error: "This country is not yet supported" },
      { status: 403 }
    );
  }

  const cacheKey = `${countryId}|${lang}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const data = await getFaziletCities(countryId, lang);
    if (cache.size >= MAX_CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (error) {
    if (cached) return Response.json(cached.data);
    const message =
      error instanceof Error ? error.message : "Failed to fetch cities";
    return Response.json({ error: message }, { status: 502 });
  }
}

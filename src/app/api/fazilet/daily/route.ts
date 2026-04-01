import { NextRequest } from "next/server";
import { getFaziletDaily } from "@/lib/fazilet";
import type { FaziletResponse } from "@/lib/types";
import { ALLOWED_COUNTRY_IDS, DEFAULT_DISTRICT_ID } from "@/lib/config";

const cache = new Map<string, { data: FaziletResponse; ts: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const districtId = Number(params.get("districtId") || String(DEFAULT_DISTRICT_ID));
  const lang = Number(params.get("lang") || "1");

  const cacheKey = `${districtId}|${lang}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const data = await getFaziletDaily(districtId, lang);

    // Enforce country restriction
    if (ALLOWED_COUNTRY_IDS && !ALLOWED_COUNTRY_IDS.includes(data.form.ulke_id)) {
      return Response.json(
        { error: "This country is not yet supported" },
        { status: 403 }
      );
    }

    if (cache.size >= MAX_CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (error) {
    if (cached) return Response.json(cached.data);
    const message =
      error instanceof Error ? error.message : "Failed to fetch Fazilet data";
    return Response.json({ error: message }, { status: 502 });
  }
}

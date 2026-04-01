import { NextRequest } from "next/server";
import { matchAndFetchDiyanetTimes } from "@/lib/diyanet";
import type { EzanVaktiPrayerTime } from "@/lib/types";

// In-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: EzanVaktiPrayerTime[]; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const MAX_CACHE_SIZE = 1000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const country = params.get("country");
  const city = params.get("city");
  const district = params.get("district") || undefined;

  if (!country || !city) {
    return Response.json(
      { error: "country and city params required" },
      { status: 400 }
    );
  }

  const cacheKey = `${country}|${city}|${district || ""}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const data = await matchAndFetchDiyanetTimes(country, city, district);
    if (!data) {
      return Response.json(
        { error: "No matching Diyanet location found" },
        { status: 404 }
      );
    }

    if (cache.size >= MAX_CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (error) {
    // If fetch fails but we have stale cache, return it
    if (cached) {
      return Response.json(cached.data);
    }
    const message =
      error instanceof Error ? error.message : "Failed to fetch Diyanet data";
    return Response.json({ error: message }, { status: 502 });
  }
}

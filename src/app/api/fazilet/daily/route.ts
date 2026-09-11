import { NextRequest } from "next/server";
import { getFaziletDaily, getTodayInTimezone } from "@/lib/fazilet";
import { createStaleCache } from "@/lib/stale-cache";
import type { FaziletResponse } from "@/lib/types";
import { ALLOWED_COUNTRY_IDS, DEFAULT_DISTRICT_ID } from "@/lib/config";

const CACHE_TTL = Number(process.env.FAZILET_CACHE_TTL_MS) || 3 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 2000;
const RETRY_AFTER_FAILURE = 30 * 1000;

class CountryNotAllowedError extends Error {}

/**
 * Stale-while-revalidate: an expired entry is served instantly and refreshed in
 * the background, so a slow or dead Fazilet server never blocks the page as
 * long as we have seen this location before. Entries live in this process only.
 */
const cache = createStaleCache<FaziletResponse>({
  ttlMs: CACHE_TTL,
  maxSize: MAX_CACHE_SIZE,
  retryMs: RETRY_AFTER_FAILURE,
  fetcher: async (key) => {
    const [districtId, lang] = key.split("|").map(Number);
    const data = await getFaziletDaily(districtId, lang);
    if (ALLOWED_COUNTRY_IDS && !ALLOWED_COUNTRY_IDS.includes(data.form.ulke_id)) {
      throw new CountryNotAllowedError("This country is not yet supported");
    }
    return data;
  },
  // Each response covers yesterday/today/tomorrow. Once "tomorrow" has passed,
  // the entry has nothing to show for today, so wait for upstream instead.
  isUsable: (data) =>
    data.vakitler.some((v) => v.tarih === getTodayInTimezone(data.bolge_saatdilimi)),
  // Shows up in the container log (Dokploy > Logs). At most one line per key per retry window.
  onError: (key, err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[fazilet] upstream fetch failed for ${key}: ${message}`);
  },
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const districtId = Number(params.get("districtId") || String(DEFAULT_DISTRICT_ID));
  const lang = Number(params.get("lang") || "1");
  const waitForFresh = params.get("fresh") === "1";

  try {
    const { data, stale } = await cache.get(`${districtId}|${lang}`, { waitForFresh });
    return Response.json(data, { headers: { "X-Cache": stale ? "stale" : "fresh" } });
  } catch (error) {
    if (error instanceof CountryNotAllowedError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to fetch Fazilet data";
    return Response.json({ error: message }, { status: 502 });
  }
}

import type { FaziletResponse, FaziletCity, PrayerTimesMap, PrayerName } from "./types";
import { UPSTREAM_TIMEOUT_MS } from "./config";

// FAZILET_BASE_URL lets a local mock stand in for the real backend.
const BASE_URL = process.env.FAZILET_BASE_URL ?? "https://backend.fazilettakvimi.com/content/public";

export async function getFaziletDaily(
  districtId: number,
  lang: number = 1
): Promise<FaziletResponse> {
  const url = `${BASE_URL}/daily?districtId=${districtId}&lang=${lang}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Fazilet API error: ${res.status}`);
  return res.json();
}

export async function getFaziletCities(
  countryId: number,
  lang: number = 1
): Promise<FaziletCity[]> {
  const url = `${BASE_URL}/cities-by-country?districtId=${countryId}/&lang=${lang}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Fazilet cities API error: ${res.status}`);
  return res.json();
}

/**
 * Parse Fazilet prayer times for a specific date into HH:MM strings
 * in the location's local timezone.
 */
export function parseFaziletTimes(
  response: FaziletResponse,
  date: string
): PrayerTimesMap | null {
  const day = response.vakitler.find((v) => v.tarih === date);
  if (!day) return null;

  const tz = response.bolge_saatdilimi;

  const format = (entries: { tarih: string }[]): string => {
    if (!entries.length) return "--:--";
    const d = new Date(entries[0].tarih);
    return d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
      hour12: false,
    });
  };

  return {
    imsak: format(day.imsak),
    sabah: format(day.sabah),
    gunes: format(day.gunes),
    ogle: format(day.ogle),
    ikindi: format(day.ikindi),
    aksam: format(day.aksam),
    yatsi: format(day.yatsi),
  };
}

/**
 * Get today's date string (YYYY-MM-DD) in the location's timezone.
 */
export function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: tz });
}

/**
 * Get current time as HH:MM:SS in the location's timezone.
 */
export function getCurrentTimeInTimezone(tz: string): string {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
    hour12: false,
  });
}

const toMin = (t: string) => {
  if (!t || !t.includes(":")) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Determine the current active prayer, next prayer, exit time, and uncertain state.
 *
 * Exit time = earliest start of the next prayer from either source (the "must finish by" time).
 */
export function getCurrentPrayer(
  currentTime: string,
  faziletTimes: PrayerTimesMap,
  diyanetTimes: PrayerTimesMap | null
): {
  current: PrayerName;
  next: PrayerName;
  isUncertain: boolean;
  exitTime: string;
} {
  const order: PrayerName[] = [
    "imsak",
    "sabah",
    "gunes",
    "ogle",
    "ikindi",
    "aksam",
    "yatsi",
  ];

  const nowMin = toMin(currentTime);

  // Find current prayer: last prayer whose Fazilet entry time has passed
  let currentIdx = order.length - 1; // default to yatsi
  for (let i = order.length - 1; i >= 0; i--) {
    if (nowMin >= toMin(faziletTimes[order[i]])) {
      currentIdx = i;
      break;
    }
    if (i === 0) {
      // Before imsak — still in previous day's yatsi
      currentIdx = order.length - 1;
    }
  }

  const current = order[currentIdx];
  const next = order[(currentIdx + 1) % order.length];

  // Exit time = earliest (minimum) of both sources for the NEXT prayer
  const fNext = faziletTimes[next];
  let exitTime = fNext;
  if (diyanetTimes) {
    const dNext = diyanetTimes[next];
    const dNextMin = toMin(dNext);
    if (dNextMin >= 0 && dNextMin <= toMin(fNext)) exitTime = dNext;
  }

  // Check if we're in an uncertain zone:
  // current time is between the two sources for any prayer transition
  let isUncertain = false;
  if (diyanetTimes) {
    for (const prayer of order) {
      const fMin = toMin(faziletTimes[prayer]);
      const dMin = toMin(diyanetTimes[prayer]);
      if (fMin < 0 || dMin < 0) continue; // skip empty times (e.g., Diyanet imsak)
      const lo = Math.min(fMin, dMin);
      const hi = Math.max(fMin, dMin);
      if (lo !== hi && nowMin >= lo && nowMin < hi) {
        isUncertain = true;
        break;
      }
    }
  }

  return { current, next, isUncertain, exitTime };
}

/**
 * Calculate seconds remaining until a target HH:MM time from current HH:MM:SS.
 */
export function secondsUntil(currentHMS: string, targetHM: string): number {
  const [ch, cm, cs] = currentHMS.split(":").map(Number);
  const [th, tm] = targetHM.split(":").map(Number);

  const nowSec = ch * 3600 + cm * 60 + (cs || 0);
  let targetSec = th * 3600 + tm * 60;

  if (targetSec <= nowSec) {
    targetSec += 24 * 3600;
  }

  return targetSec - nowSec;
}

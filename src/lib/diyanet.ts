import type {
  EzanVaktiCountry,
  EzanVaktiCity,
  EzanVaktiDistrict,
  EzanVaktiPrayerTime,
  PrayerTimesMap,
} from "./types";

const BASE_URL = "https://ezanvakti.emushaf.net";

export async function getEzanVaktiCountries(): Promise<EzanVaktiCountry[]> {
  const res = await fetch(`${BASE_URL}/ulkeler`);
  if (!res.ok) throw new Error(`EzanVakti countries error: ${res.status}`);
  return res.json();
}

export async function getEzanVaktiCities(
  countryId: string
): Promise<EzanVaktiCity[]> {
  const res = await fetch(`${BASE_URL}/sehirler/${countryId}`);
  if (!res.ok) throw new Error(`EzanVakti cities error: ${res.status}`);
  return res.json();
}

export async function getEzanVaktiDistricts(
  cityId: string
): Promise<EzanVaktiDistrict[]> {
  const res = await fetch(`${BASE_URL}/ilceler/${cityId}`);
  if (!res.ok) throw new Error(`EzanVakti districts error: ${res.status}`);
  return res.json();
}

export async function getEzanVaktiTimes(
  districtId: string
): Promise<EzanVaktiPrayerTime[]> {
  const res = await fetch(`${BASE_URL}/vakitler/${districtId}`);
  if (!res.ok) throw new Error(`EzanVakti times error: ${res.status}`);
  return res.json();
}

// ── Name normalization for matching ──

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[İıIi]/g, "i")
    .replace(/[ÖöÔô]/g, "o")
    .replace(/[ÜüÛû]/g, "u")
    .replace(/[ÇçĆć]/g, "c")
    .replace(/[ŞşŚś]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Ââ]/g, "a")
    .replace(/[Êê]/g, "e")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Known country name mappings (Fazilet name → EzanVakti name patterns)
const COUNTRY_ALIASES: Record<string, string[]> = {
  england: ["ingiltere", "united kingdom", "uk"],
  "united kingdom": ["ingiltere", "uk"],
  usa: ["amerika", "united states", "abd"],
  "united states": ["amerika", "abd"],
  "south korea": ["guney kore", "kore"],
  "north korea": ["kuzey kore"],
  czech: ["cek", "czechia"],
  "ivory coast": ["fildisi"],
  holland: ["hollanda", "netherlands"],
  netherlands: ["hollanda"],
};

function bestMatch(
  target: string,
  candidates: { name: string; id: string }[]
): string | null {
  const norm = normalize(target);

  // Exact match
  for (const c of candidates) {
    if (normalize(c.name) === norm) return c.id;
  }

  // Alias match
  const aliases = COUNTRY_ALIASES[norm] || [];
  for (const alias of aliases) {
    for (const c of candidates) {
      if (normalize(c.name) === alias) return c.id;
    }
  }

  // Prefix/contains match
  for (const c of candidates) {
    const cn = normalize(c.name);
    if (cn.startsWith(norm) || norm.startsWith(cn)) return c.id;
  }
  for (const c of candidates) {
    if (normalize(c.name).includes(norm) || norm.includes(normalize(c.name))) {
      return c.id;
    }
  }

  return null;
}

/**
 * Find the best matching EzanVakti district for a given Fazilet location
 * and return its monthly prayer times.
 */
export async function matchAndFetchDiyanetTimes(
  countryName: string,
  cityName: string,
  districtName?: string
): Promise<EzanVaktiPrayerTime[] | null> {
  try {
    // 1. Find matching country
    const countries = await getEzanVaktiCountries();
    const countryCandidates = countries.map((c) => ({
      name: c.UlkeAdiEn || c.UlkeAdi,
      id: c.UlkeID,
    }));

    // Also try Turkish names
    const countryCandidatesTr = countries.map((c) => ({
      name: c.UlkeAdi,
      id: c.UlkeID,
    }));

    const countryId =
      bestMatch(countryName, countryCandidates) ||
      bestMatch(countryName, countryCandidatesTr);

    if (!countryId) return null;

    // 2. Find matching city
    const cities = await getEzanVaktiCities(countryId);
    const cityCandidates = cities.map((c) => ({
      name: c.SehirAdiEn || c.SehirAdi,
      id: c.SehirID,
    }));
    const cityCandidatesTr = cities.map((c) => ({
      name: c.SehirAdi,
      id: c.SehirID,
    }));

    let cityId =
      bestMatch(cityName, cityCandidates) ||
      bestMatch(cityName, cityCandidatesTr);

    // For international locations, EzanVakti often has 1 "city" per country
    // and actual cities are listed as "districts". Try matching there.
    if (!cityId && cities.length > 0) {
      cityId = cities[0].SehirID; // Use the single city entry
    }

    if (!cityId) return null;

    // 3. Find matching district
    const districts = await getEzanVaktiDistricts(cityId);

    // Try district name first, then city name (for international where cities = districts)
    const distCandidates = districts.map((d) => ({
      name: d.IlceAdiEn || d.IlceAdi,
      id: d.IlceID,
    }));
    const distCandidatesTr = districts.map((d) => ({
      name: d.IlceAdi,
      id: d.IlceID,
    }));

    let districtId: string | null = null;

    if (districtName) {
      districtId =
        bestMatch(districtName, distCandidates) ||
        bestMatch(districtName, distCandidatesTr);
    }

    if (!districtId) {
      // Try city name against districts (international pattern)
      districtId =
        bestMatch(cityName, distCandidates) ||
        bestMatch(cityName, distCandidatesTr);
    }

    if (!districtId && districts.length > 0) {
      // Fall back to first district (usually the city center)
      districtId = districts[0].IlceID;
    }

    if (!districtId) return null;

    // 4. Fetch prayer times
    return await getEzanVaktiTimes(districtId);
  } catch {
    return null;
  }
}

/**
 * Extract a specific day's prayer times from EzanVakti monthly data.
 * Date: YYYY-MM-DD → match against DD.MM.YYYY
 */
export function parseEzanVaktiTimes(
  data: EzanVaktiPrayerTime[],
  date: string
): PrayerTimesMap | null {
  const [y, m, d] = date.split("-");
  const target = `${d}.${m}.${y}`;

  const day = data.find((entry) => entry.MiladiTarihKisa === target);
  if (!day) return null;

  return {
    imsak: "", // Diyanet has no imsak — only Fazilet provides it
    sabah: day.Imsak, // Diyanet's Imsak is actually Sabah/Fajr
    gunes: day.Gunes,
    ogle: day.Ogle,
    ikindi: day.Ikindi,
    aksam: day.Aksam,
    yatsi: day.Yatsi,
  };
}

# Diyanet Prayer Times API

Diyanet Isleri Baskanligi (Turkish Presidency of Religious Affairs) provides prayer times through multiple channels. This document covers the official API and the practical alternative used by this project.

---

## Official API: Awqat Salah

**Portal:** https://awqatsalah.diyanet.gov.tr/

**GitHub (by Diyanet):** https://github.com/DinIsleriYuksekKurulu/AwqatSalah (C# .NET Core example)

### Authentication

```
POST /Auth/Login
Content-Type: application/json

{ "email": "...", "password": "..." }
```

Returns `{ "ok": true, "data": { "accessToken": "...", "refreshToken": "..." } }`.
- Access token valid for 45 minutes.
- Refresh token valid for 15 minutes.
- Refresh via `GET /Auth/RefreshToken/{refreshToken}` with `Authorization: Bearer {accessToken}`.

### Registration

Requires a **paper form** (PDF at the portal) submitted to Diyanet or emailed to `destek@diyanet.gov.tr`. This is a bureaucratic process — not instant self-service.

### Rate Limits (extremely restrictive)

| Condition | Limit |
|-----------|-------|
| Standard (per endpoint per user) | **5 requests** |
| First 15 days after account creation | **100 requests** |
| DateRange endpoint | **10 requests per month** |

### Endpoints

**Geographic data:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/Place/Countries` | All countries |
| `GET /api/Place/States` | All states/provinces |
| `GET /api/Place/States/{countryId}` | States for a country |
| `GET /api/Place/Cities` | All cities |
| `GET /api/Place/Cities/{stateId}` | Cities for a state |
| `GET /api/Place/CityDetail/{cityId}` | City detail (QiblaAngle, DistanceToKaaba, coordinates) |

**Prayer times:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/PrayerTime/Daily/{cityId}` | Today's prayer times |
| `GET /api/PrayerTime/Weekly/{cityId}` | This week's prayer times |
| `GET /api/PrayerTime/Monthly/{cityId}` | This month's prayer times |
| `GET /api/PrayerTime/Ramadan/{cityId}` | Ramadan prayer times |
| `GET /api/AwqatSalah/Eid/{cityId}` | Eid prayer times |
| `GET /api/AwqatSalah/DateRange` | Custom date range (10 req/month limit) |
| `GET /api/DailyContent` | Daily religious content |

### Response format

```json
{
  "ok": true,
  "data": [
    {
      "Fajr": "05:16",
      "Sunrise": "06:43",
      "Dhuhr": "13:13",
      "Asr": "16:46",
      "Maghrib": "19:34",
      "Isha": "20:56",
      "AstronomicalSunrise": "...",
      "AstronomicalSunset": "...",
      "ShapeMoonURL": "...",
      "HijriDateShort": "...",
      "HijriDateLong": "...",
      "GregorianDateShort": "...",
      "GregorianDateLong": "...",
      "QiblaTime": "...",
      "GreenwichMeanTimeZone": 3.0
    }
  ]
}
```

### Verdict

The official API is **impractical for most applications** due to the 5-request-per-endpoint limit and paper-form registration. This project does not use it.

---

## EzanVakti API (used by this project)

**Base URL:** `https://ezanvakti.emushaf.net`

**Source:** https://github.com/furkantektas/EzanVaktiAPI

This is a community-maintained proxy that mirrors official Diyanet data. It requires no authentication and has reasonable rate limits. The location IDs (`UlkeID`, `SehirID`, `IlceID`) match Diyanet's internal IDs.

### Authentication

None.

### Rate Limits

**100 requests per 5 minutes** per IP. No registration needed.

### Documentation

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI spec: `/openapi.json`

---

### Endpoints

#### GET `/ulkeler`

Returns all countries.

```json
[
  { "UlkeAdi": "TURKIYE", "UlkeAdiEn": "TURKEY", "UlkeID": "2" },
  { "UlkeAdi": "ALMANYA", "UlkeAdiEn": "GERMANY", "UlkeID": "13" }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `UlkeAdi` | string | Country name in Turkish |
| `UlkeAdiEn` | string | Country name in English |
| `UlkeID` | string | Country ID |

---

#### GET `/sehirler/{countryId}`

Returns cities for a country.

**Example:** `/sehirler/2` (Turkey)

```json
[
  { "SehirAdi": "ISTANBUL", "SehirAdiEn": "ISTANBUL", "SehirID": "539" },
  { "SehirAdi": "ANKARA", "SehirAdiEn": "ANKARA", "SehirID": "506" }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `SehirAdi` | string | City name in Turkish |
| `SehirAdiEn` | string | City name in English |
| `SehirID` | string | City ID |

**Note:** For international locations, there is often only 1 "city" per country. Actual cities appear as districts in the next level.

---

#### GET `/ilceler/{cityId}`

Returns districts for a city.

**Example:** `/ilceler/539` (Istanbul)

```json
[
  { "IlceAdi": "ISTANBUL", "IlceAdiEn": "ISTANBUL", "IlceID": "9541" },
  { "IlceAdi": "KARTAL", "IlceAdiEn": "KARTAL", "IlceID": "9542" }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `IlceAdi` | string | District name in Turkish |
| `IlceAdiEn` | string | District name in English |
| `IlceID` | string | District ID |

---

#### GET `/vakitler/{districtId}`

Returns **one month** of prayer times for a district.

**Example:** `/vakitler/9541` (Istanbul)

```json
[
  {
    "MiladiTarihKisa": "31.03.2026",
    "MiladiTarihUzun": "31 Mart 2026 Sali",
    "MiladiTarihUzunIso8601": "2026-03-31T00:00:00.0000000+03:00",
    "HicriTarihKisa": "12.10.1447",
    "HicriTarihUzun": "12 Sevval 1447",
    "GreenwichOrtalamaZamani": 3.0,
    "Imsak": "05:16",
    "Gunes": "06:43",
    "Ogle": "13:13",
    "Ikindi": "16:46",
    "Aksam": "19:34",
    "Yatsi": "20:56"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `MiladiTarihKisa` | string | Gregorian date as `DD.MM.YYYY` |
| `MiladiTarihUzun` | string | Full Gregorian date with day name (Turkish) |
| `MiladiTarihUzunIso8601` | string | ISO 8601 date with timezone offset |
| `HicriTarihKisa` | string | Hijri date as `DD.MM.YYYY` |
| `HicriTarihUzun` | string | Full Hijri date (Turkish) |
| `GreenwichOrtalamaZamani` | number | UTC offset (e.g. `3.0` for UTC+3) |
| `Imsak` | string | Fajr time as `HH:MM` |
| `Gunes` | string | Sunrise as `HH:MM` |
| `Ogle` | string | Dhuhr as `HH:MM` |
| `Ikindi` | string | Asr as `HH:MM` |
| `Aksam` | string | Maghrib as `HH:MM` |
| `Yatsi` | string | Isha as `HH:MM` |

> **Important naming quirk:** Diyanet's `Imsak` field is actually the **Fajr/Sabah** prayer time, not true Imsak. Only Fazilet provides a distinct Imsak time. See the field mapping section below.

The response may also include these fields (not used by this project):

| Field | Description |
|-------|-------------|
| `GunesDogus` | Sunrise time (alternate) |
| `GunesBatis` | Sunset time |
| `KibleSaati` | Qibla time |
| `AyinSekliURL` | Moon phase image URL |

---

#### GET `/bayram-namazi/{cityId}`

Returns Eid prayer times. Not used by this project.

---

### Known Location IDs

| Country | `UlkeID` | Example City | `SehirID` | Example District | `IlceID` |
|---------|----------|-------------|-----------|-----------------|----------|
| Turkey | 2 | Istanbul | 539 | Istanbul (center) | 9541 |
| Turkey | 2 | Ankara | 506 | — | — |
| Germany | 13 | — | — | — | — |
| UK | 18 | — | — | — | — |

**Note:** Fazilet and EzanVakti use **completely different location ID systems.** Fazilet's Istanbul is `31`, EzanVakti's is `9541`. This project matches them by name, not by ID.

---

### Data Characteristics

- Returns an **entire month** of data per request (unlike Fazilet's 3 days).
- Times are **already in local time** as `HH:MM` strings — no timezone conversion needed.
- However, for international locations, all timestamps reportedly use **Turkey's timezone** regardless of the queried location. Use caution and verify for non-Turkish locations.
- Some English country names may have encoding issues.
- Location hierarchy varies: Turkey has a full Country > City > District structure; international locations often have Country > (single City) > Districts (which are actually cities).

---

## Other Known Alternatives

| API | URL | Notes |
|-----|-----|-------|
| abdus.dev | `https://prayertimes.api.abdus.dev` | Simple 2-endpoint API (search + get times). No auth. Mirrors Diyanet data. |
| namaz-vakti-api (canbax) | `vaktiapp.com/api-docs` | **Calculates** times mathematically (uses adhan-js), not sourced from Diyanet. GPS-based. |
| ezanvakti-imsakiyem-api | GitHub: karademirmustafa | REST API with Docker support. Vercel deployment may be down; self-host. |
| Direct scraping | `namazvakitleri.diyanet.gov.tr` | Server-rendered HTML, no JSON API. Fragile, requires cookie handling. |

---

## How This Project Uses EzanVakti

### Location matching

Since Fazilet and EzanVakti use different ID systems, this project matches locations **by name**. When the user selects a location in Fazilet, the app extracts the country/city/district names and uses a fuzzy matching algorithm to find the corresponding EzanVakti location:

1. **Normalize** both names: Turkish chars to ASCII (`İ`→`i`, `Ö`→`o`, `Ş`→`s`, etc.), lowercase, strip non-alphanumeric.
2. **Country**: Try exact match on English name, then Turkish name, then aliases (e.g. `england` → `ingiltere`), then prefix/contains match.
3. **City**: Try exact match on both English and Turkish. For international locations with only 1 city entry, use that entry.
4. **District**: Try district name, then city name against districts (for international locations where cities appear as districts), then fall back to first district.

Country aliases handled:

```
england       → ingiltere, united kingdom, uk
usa           → amerika, united states, abd
south korea   → guney kore, kore
north korea   → kuzey kore
czech         → cek, czechia
ivory coast   → fildisi
holland       → hollanda, netherlands
```

### Field mapping (Diyanet → internal)

```
Diyanet Imsak  → internal sabah (this IS the Fajr/Sabah time)
Diyanet Gunes  → internal gunes
Diyanet Ogle   → internal ogle
Diyanet Ikindi → internal ikindi
Diyanet Aksam  → internal aksam
Diyanet Yatsi  → internal yatsi
internal imsak → "" (empty — Diyanet has no true Imsak; only Fazilet provides it)
```

### Caching

The `/api/diyanet/match` route caches results in memory:
- **TTL:** 6 hours
- **Max entries:** 1000
- **Eviction:** LRU (delete oldest when full)
- **Fallback:** Returns stale cache on fetch failure

Since EzanVakti returns an entire month of data per request, 100 req/5min is more than sufficient. Under normal usage, each unique location triggers at most 4 sequential API calls (countries → cities → districts → times), and results are cached for 6 hours. A single user browsing locations would struggle to hit the limit.

### Error handling

- If name matching fails at any step, the match function returns `null` and the route returns 404.
- If the fetch itself fails, stale cache is returned when available; otherwise a 502 error.
- The frontend gracefully handles missing Diyanet data — it continues working with Fazilet times only, showing "Diyanet verisi bulunamadi" (Diyanet data unavailable).

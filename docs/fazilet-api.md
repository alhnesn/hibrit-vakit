# Fazilet Takvimi API

Fazilet Takvimi (fazilettakvimi.com) does **not** have a publicly documented API. The endpoints below were reverse-engineered from their React web app at `namaz-vakitleri.fazilettakvimi.com`. The backend is an Express.js server behind Cloudflare, served from `backend.fazilettakvimi.com`.

No other open-source projects are known to document or use this API.

## Base URL

```
https://backend.fazilettakvimi.com/content/public
```

This is the host the official web app calls directly. The older proxy path `https://namaz-vakitleri.fazilettakvimi.com/api/cms` (which rewrote to `/content/public/`) stopped working in August 2026 and now returns `404 Not Found` from openresty; `https://fazilettakvimi.com/api/cms` still proxies to the backend but is not what the app uses.

## Authentication

None. No API keys, tokens, or special headers required.

## CORS

The API returns `access-control-allow-origin: fazilettakvimi.com`, so browser-side JavaScript from other origins will be blocked. **Server-side requests are unaffected.** This project calls Fazilet only from Next.js API routes (server-to-server).

## Rate Limiting

No explicit rate-limit headers observed. However, the API sits behind Cloudflare, which may enforce its own protections against abusive traffic.

---

## Endpoints

### GET `/daily`

Returns prayer times, location data, calendar info, and the full country/city/district lists for a given location.

**Parameters (query string):**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `districtId` | number | yes | Location ID. Despite the name, accepts city IDs too (e.g. `31` for Istanbul). |
| `lang` | number | yes | Language. `1` = Turkish, `2` = English, `3` = Dutch, `4` = German, `7` = Kyrgyz, `9` = Azerbaijani, `17` = French. |

**Example:**

```
GET /content/public/daily?districtId=31&lang=1
```

**Response shape:**

```jsonc
{
  "success": true,
  "bolge_adi": "İstanbul",           // region name
  "bolge_saatdilimi": "Europe/Istanbul", // IANA timezone
  "form": {
    "ulke_id": 1,                    // current country ID
    "sehir_id": 31,                  // current city ID
    "ilce_id": 0                     // current district ID (0 if city-level)
  },
  "ulkeler": [                       // all 211 countries
    { "id": 1, "adi": "Türkiye" },
    { "id": 18, "adi": "İngiltere" }
    // ...
  ],
  "sehirler": [                      // cities for the selected country
    { "id": 31, "adi": "İstanbul" },
    { "id": 79, "adi": "Ankara" }
    // ...
  ],
  "ilceler": [                       // districts for the selected city (may be empty)
    { "id": 1489, "adi": "Adalar" },
    { "id": 1498, "adi": "Beşiktaş" }
    // ...
  ],
  "vakitler": [                      // always 3 days: yesterday, today, tomorrow
    {
      "tarih": "2026-03-31",         // date as YYYY-MM-DD
      "imsak":   [{ "tarih": "2026-03-31T02:16:00Z", "is_takdiri": false }],
      "sabah":   [{ "tarih": "2026-03-31T02:16:00Z", "is_takdiri": false }],
      "gunes":   [{ "tarih": "2026-03-31T03:43:00Z", "is_takdiri": false }],
      "israk":   [],                 // may be empty
      "ogle":    [{ "tarih": "2026-03-31T10:13:00Z", "is_takdiri": false }],
      "ikindi":  [{ "tarih": "2026-03-31T13:46:00Z", "is_takdiri": false }],
      "aksam":   [{ "tarih": "2026-03-31T16:34:00Z", "is_takdiri": false }],
      "yatsi":   [{ "tarih": "2026-03-31T17:56:00Z", "is_takdiri": false }]
    }
    // ... 2 more days
  ],
  "takvimler": [
    { "tarih": "2026-03-31", "hicri_tarih": "...", "rumi_tarih": "..." }
    // ...
  ],
  "kronolojiler": [
    { "tarih": "2026-03-31", "kronoloji": ["Historical event..."] }
    // ...
  ],
  "istatistikler": [
    { "tarih": "2026-03-31", "kacinci_gun": 90, "kacinci_hafta": 14, "kacinci_ay": 3 }
    // ...
  ],
  "ayin_safhalari": [
    { "tarih": "2026-03-31", "resim": "https://..." }
    // ...
  ]
}
```

#### Prayer time entry format

Each prayer time (imsak, sabah, gunes, etc.) is an array with one object:

| Field | Type | Description |
|-------|------|-------------|
| `tarih` | string | ISO 8601 UTC timestamp (e.g. `"2026-03-31T02:16:00Z"`) |
| `is_takdiri` | boolean | `true` if the time is estimated/approximate (for high-latitude locations where exact calculation is not possible) |

**All times are in UTC.** You must convert to local time using `bolge_saatdilimi`.

#### Available prayer times

| Field | Turkish Name | Description |
|-------|-------------|-------------|
| `imsak` | İmsak | End of sahur (pre-dawn meal) |
| `sabah` | Sabah | Fajr prayer entry |
| `gunes` | Güneş | Sunrise |
| `israk` | İşrak | Ishraq (may be empty) |
| `ogle` | Öğle | Dhuhr prayer entry |
| `ikindi` | İkindi | Asr prayer entry |
| `aksam` | Akşam | Maghrib prayer entry |
| `yatsi` | Yatsı | Isha prayer entry |

---

### GET `/cities-by-country`

Returns the list of cities for a given country.

**Parameters (query string):**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `districtId` | string | yes | Country ID followed by `/`. Despite the param name, this is a country ID. The trailing slash is required (e.g. `1/`). |
| `lang` | number | yes | Language ID (same values as `/daily`). |

**Example:**

```
GET /content/public/cities-by-country?districtId=1/&lang=1
```

**Response:**

```json
[
  { "id": 31, "adi": "İstanbul" },
  { "id": 79, "adi": "Ankara" },
  { "id": 32, "adi": "İzmir" }
]
```

---

## Known Location IDs

| Country (ulke_id) | City | city/district ID |
|--------------------|------|-----------------|
| 1 (Turkey) | Istanbul | 31 |
| 1 (Turkey) | Ankara | 79 |
| 1 (Turkey) | Izmir | 32 |
| 18 (UK) | London | 373 |
| 18 (UK) | Glasgow | 371 |
| 14 (Germany) | Cologne | 303 |
| 39 (Norway) | Oslo | 552 |
| 39 (Norway) | Tromso | 5439 |
| 20 (France) | Paris | 415 |

Istanbul has ~50 district IDs (Adalar=1489, Besiktas=1498, etc.).

---

## Data Characteristics

- Returns exactly **3 days** of data (yesterday, today, tomorrow).
- All timestamps are **UTC** — must convert using `bolge_saatdilimi`.
- The `is_takdiri` flag marks estimated times for extreme latitudes.
- Country/city names are localized based on `lang`.
- 211 countries and 7000+ cities are supported.
- The full country and city lists are returned with every `/daily` call (no need for separate list endpoints).

---

## How This Project Uses It

- **Called server-side only** from Next.js API routes (bypasses CORS).
- **`/api/fazilet/daily`** route wraps the Fazilet `/daily` endpoint with an in-memory LRU cache (3-hour TTL, max 2000 entries).
- **`/api/fazilet/cities`** route wraps `/cities-by-country` with a 24-hour TTL cache (max 500 entries).
- On fetch failure, stale cache is returned as a fallback.
- Prayer times are parsed by finding the matching `YYYY-MM-DD` entry in `vakitler`, extracting the first entry's `tarih`, and converting from UTC to local time using `toLocaleTimeString()` with the `bolge_saatdilimi` timezone.
- Currently restricted to Turkey (country ID 1) via `ALLOWED_COUNTRY_IDS` config. Requests for other countries return 403.
- Default location: Istanbul (districtId=31).

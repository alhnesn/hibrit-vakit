# Hibrit Vakit

**[hibritvakit.com](https://hibritvakit.com)**

Dual-source prayer times app that displays prayer times from both **Fazilet Takvimi** and **Diyanet** to help users pray with caution.

## Why Two Sources?

Fazilet and Diyanet use different calculation methods for prayer times. The difference is usually a few minutes, but can be more significant for Fajr (Imsak/Sabah) and Isha (Yatsi). Praying during the gap between the two sources may be problematic.

- **Fazilet** provides the **entry time** (temkinli vakit -- conservative, later)
- **Diyanet** provides the **exit time** (earlier)
- The gap between them is the **caution zone**

## Features

- Prayer times from two sources displayed side by side
- Current prayer highlighted with countdown timers
- Namaz entry/exit countdowns with caution zone warnings
- Cross-day display (yesterday's Yatsi / tomorrow's Imsak at day boundaries)
- Date navigation (yesterday / today / tomorrow)
- Dark and light theme
- Turkish and English language support
- Location persistence across sessions

## Current Limitations

- **Turkey only** -- other countries are disabled pending testing for edge cases (e.g., high-latitude locations with missing Isha times)
- **3-day navigation** -- Fazilet API only returns yesterday/today/tomorrow

## Planned Features

- **Bayram Vakitleri** -- mark Eid dates on the calendar and display Eid prayer times
- **International support** -- expand to other countries after proper testing for high-latitude edge cases
- **Mobile app** -- native mobile app sharing the core logic

## Data Sources

Prayer times data is sourced from:

- **[Fazilet Takvimi](https://fazilettakvimi.com)** -- prayer times and calendar data. All rights belong to Fazilet Publications.
- **[Diyanet](https://diyanet.gov.tr)** (via [EzanVakti API](https://ezanvakti.emushaf.net)) -- prayer times from the Presidency of Religious Affairs.

This application is **not** an official product of Fazilet or Diyanet. It is an independent tool that aggregates publicly accessible prayer time data for personal use.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)

## Development

```bash
npm install
npm run dev
```

To unlock international support, edit `ALLOWED_COUNTRY_IDS` in `src/lib/config.ts`.

## License

MIT License -- see [LICENSE](LICENSE) for details.

Prayer times data belongs to their respective sources (Fazilet Takvimi, Diyanet). This license covers only the application code.

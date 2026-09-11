/**
 * Supported countries configuration.
 * Set to null to allow all countries, or provide an array of Fazilet country IDs.
 */
export const ALLOWED_COUNTRY_IDS: number[] | null = [1]; // 1 = Türkiye

/** Fazilet country ID for the default location */
export const DEFAULT_COUNTRY_ID = 1; // Türkiye

/** Fazilet district ID for the default location */
export const DEFAULT_DISTRICT_ID = 31; // İstanbul

/**
 * Upstream requests (Fazilet, Diyanet) are aborted after this long so a hung
 * server cannot hold a page load open for minutes. Cloudflare's own origin
 * timeout is ~100 s, which is what made the old 2-minute loading screens.
 */
export const UPSTREAM_TIMEOUT_MS = 10_000;

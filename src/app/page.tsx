"use client";

import { useEffect, useState, useRef } from "react";
import type {
  FaziletResponse,
  FaziletCity,
  EzanVaktiPrayerTime,
  PrayerName,
  Lang,
} from "@/lib/types";
import { PRAYER_NAMES } from "@/lib/types";
import {
  parseFaziletTimes,
  getTodayInTimezone,
  getCurrentTimeInTimezone,
  getCurrentPrayer,
  secondsUntil,
} from "@/lib/fazilet";
import { parseEzanVaktiTimes } from "@/lib/diyanet";
import { t } from "@/lib/i18n";
import { ALLOWED_COUNTRY_IDS, DEFAULT_DISTRICT_ID } from "@/lib/config";

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

const toMin = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// ── SVG Icons ──
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lang");
      return saved === "2" ? 2 : 1;
    }
    return 1;
  });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fazilet, setFazilet] = useState<FaziletResponse | null>(null);
  const [diyanetRaw, setDiyanetRaw] = useState<EzanVaktiPrayerTime[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locationId, setLocationId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("locationId");
      return saved ? Number(saved) : 31;
    }
    return 31;
  });
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [cities, setCities] = useState<FaziletCity[]>([]);
  const [viewOffset, setViewOffset] = useState(0);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [currentHMS, setCurrentHMS] = useState("00:00:00");
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const [devTimeEnabled, setDevTimeEnabled] = useState(false);
  const [devTime, setDevTime] = useState("12:00");
  const [devTimeOpen, setDevTimeOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const diyanetLocRef = useRef<number | null>(null);
  const i18n = t(lang);

  // ── Theme ──
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // ── Fetch Fazilet + conditionally Diyanet ──
  useEffect(() => {
    let cancelled = false;
    const needDiyanet = diyanetLocRef.current !== locationId;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fazilet/daily?districtId=${locationId}&lang=${lang}`);

        // If blocked (e.g., saved location from unsupported country), fall back to default
        if (res.status === 403 && locationId !== DEFAULT_DISTRICT_ID) {
          setLocationId(DEFAULT_DISTRICT_ID);
          return;
        }

        if (!res.ok) throw new Error("Fazilet API error");
        const data: FaziletResponse = await res.json();
        if (!data.success) throw new Error("Fazilet returned unsuccessful");
        if (cancelled) return;

        setFazilet(data);
        setSelectedCountry(data.form.ulke_id);
        setSelectedCity(data.form.sehir_id);
        setSelectedDistrict(data.form.ilce_id !== data.form.sehir_id ? data.form.ilce_id : 0);
        setCities(data.sehirler);

        if (needDiyanet) {
          diyanetLocRef.current = locationId;
          let namesData = data;
          if (lang !== 1) {
            const trRes = await fetch(`/api/fazilet/daily?districtId=${locationId}&lang=1`);
            if (trRes.ok && !cancelled) namesData = await trRes.json();
          }
          if (cancelled) return;

          const countryName = namesData.ulkeler.find((u) => u.id === namesData.form.ulke_id)?.adi || "";
          const cityName = namesData.sehirler.find((s) => s.id === namesData.form.sehir_id)?.adi || "";
          const districtName = namesData.ilceler.find((d) => d.id === namesData.form.ilce_id)?.adi || "";
          const params = new URLSearchParams({ country: countryName, city: cityName });
          if (districtName && districtName !== cityName) params.set("district", districtName);

          const dRes = await fetch(`/api/diyanet/match?${params}`);
          if (!cancelled && dRes.ok) setDiyanetRaw(await dRes.json());
          else if (!cancelled) setDiyanetRaw(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [locationId, lang]);

  // ── Timer ──
  useEffect(() => {
    if (!fazilet) return;
    if (devTimeEnabled) { setCurrentHMS(devTime + ":00"); return; }
    const tz = fazilet.bolge_saatdilimi;
    const tick = () => setCurrentHMS(getCurrentTimeInTimezone(tz));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fazilet, devTimeEnabled, devTime]);

  useEffect(() => { setViewOffset(0); }, [locationId]);
  useEffect(() => { localStorage.setItem("locationId", String(locationId)); }, [locationId]);
  useEffect(() => { localStorage.setItem("lang", String(lang)); }, [lang]);

  // ── Location handlers ──
  const handleCountryChange = async (countryId: number) => {
    setSelectedCountry(countryId);
    try {
      const res = await fetch(`/api/fazilet/cities?countryId=${countryId}&lang=${lang}`);
      if (res.ok) {
        const newCities: FaziletCity[] = await res.json();
        setCities(newCities);
        if (newCities.length > 0) setLocationId(newCities[0].id);
      }
    } catch { /* ignore */ }
  };

  const handleCityChange = (cityId: number) => { setSelectedCity(cityId); setLocationId(cityId); };
  const handleDistrictChange = (districtId: number) => { setSelectedDistrict(districtId); setLocationId(districtId); };

  // ── Derived state ──
  const tz = fazilet?.bolge_saatdilimi || "Europe/Istanbul";
  const today = fazilet ? getTodayInTimezone(tz) : "";
  const viewDate = today ? addDays(today, viewOffset) : "";
  const isViewingToday = viewOffset === 0;

  const availableDates = fazilet?.vakitler.map((v) => v.tarih).sort() || [];
  const canGoPrev = viewDate && availableDates.includes(addDays(viewDate, -1));
  const canGoNext = viewDate && availableDates.includes(addDays(viewDate, 1));

  const faziletTimes = fazilet && viewDate ? parseFaziletTimes(fazilet, viewDate) : null;
  const diyanetTimes = diyanetRaw && viewDate ? parseEzanVaktiTimes(diyanetRaw, viewDate) : null;

  const tomorrowDate = today ? addDays(today, 1) : "";
  const yesterdayDate = today ? addDays(today, -1) : "";
  const tomorrowFazilet = fazilet && tomorrowDate ? parseFaziletTimes(fazilet, tomorrowDate) : null;
  const tomorrowDiyanet = diyanetRaw && tomorrowDate ? parseEzanVaktiTimes(diyanetRaw, tomorrowDate) : null;
  const yesterdayFazilet = fazilet && yesterdayDate ? parseFaziletTimes(fazilet, yesterdayDate) : null;
  const yesterdayDiyanet = diyanetRaw && yesterdayDate ? parseEzanVaktiTimes(diyanetRaw, yesterdayDate) : null;

  const todayFazilet = fazilet && today ? parseFaziletTimes(fazilet, today) : null;
  const todayDiyanet = diyanetRaw && today ? parseEzanVaktiTimes(diyanetRaw, today) : null;

  // Always compute for countdown bar (which is always visible)
  const prayerState = todayFazilet
    ? getCurrentPrayer(currentHMS, todayFazilet, todayDiyanet) : null;

  const nowMin = toMin(currentHMS);
  const isAfterYatsi = todayFazilet && prayerState?.current === "yatsi" && nowMin >= toMin(todayFazilet.yatsi);
  const isBeforeImsak = todayFazilet && prayerState?.current === "yatsi" && nowMin < toMin(todayFazilet.imsak);

  // ── Namaz exit/enter countdown ──
  const PERIOD_INFO: Record<PrayerName, { exitNamaz: PrayerName | null; exitAt: PrayerName; enterNamaz: PrayerName | null; enterAt: PrayerName }> = {
    imsak:  { exitNamaz: null,     exitAt: "sabah",  enterNamaz: "sabah",  enterAt: "sabah" },
    sabah:  { exitNamaz: "sabah",  exitAt: "gunes",  enterNamaz: "ogle",   enterAt: "ogle" },
    gunes:  { exitNamaz: null,     exitAt: "ogle",   enterNamaz: "ogle",   enterAt: "ogle" },
    ogle:   { exitNamaz: "ogle",   exitAt: "ikindi", enterNamaz: "ikindi", enterAt: "ikindi" },
    ikindi: { exitNamaz: "ikindi", exitAt: "aksam",  enterNamaz: "aksam",  enterAt: "aksam" },
    aksam:  { exitNamaz: "aksam",  exitAt: "yatsi",  enterNamaz: "yatsi",  enterAt: "yatsi" },
    yatsi:  { exitNamaz: "yatsi",  exitAt: "imsak",  enterNamaz: "sabah",  enterAt: "sabah" },
  };

  const currentPeriod = prayerState?.current ?? "yatsi";
  const periodInfo = PERIOD_INFO[currentPeriod];

  function resolveTime(vakit: PrayerName, mode: "exit" | "enter"): string {
    let fTimes = todayFazilet;
    let dTimes = todayDiyanet;
    if (isAfterYatsi) { fTimes = tomorrowFazilet; dTimes = tomorrowDiyanet; }
    const f = fTimes?.[vakit] ?? "";
    const d = dTimes?.[vakit] ?? "";
    if (!f) return d || "";
    if (!d) return f;
    if (mode === "exit") return toMin(d) <= toMin(f) ? d : f;
    return toMin(f) >= toMin(d) ? f : d;
  }

  const exitTime = periodInfo.exitNamaz ? resolveTime(periodInfo.exitAt, "exit") : "";
  const enterTime = resolveTime(periodInfo.enterAt, "enter");
  const exitCountdown = exitTime ? secondsUntil(currentHMS, exitTime) : 0;
  const enterCountdown = enterTime ? secondsUntil(currentHMS, enterTime) : 0;
  const exitPassed = exitTime && exitCountdown > 23 * 3600;
  const isInUncertainZone = prayerState?.isUncertain ?? false;

  const dateObj = viewDate ? new Date(viewDate + "T12:00:00") : new Date();
  const dayNum = dateObj.getDate();
  const monthName = i18n.months[dateObj.getMonth()];
  const weekday = i18n.weekdays[dateObj.getDay()];
  const year = dateObj.getFullYear();

  const takvim = fazilet?.takvimler?.find((tk) => tk.tarih === viewDate);


  // ── Build prayer columns ──
  type Column = {
    prayer: PrayerName; fazilet: string; diyanet: string | null;
    isCurrent: boolean; isNext: boolean; isCrossDay: boolean;
    dividerSide: "left" | "right" | null;
  };

  const columns: Column[] = [];

  if (isViewingToday && isBeforeImsak && yesterdayFazilet) {
    columns.push({ prayer: "yatsi", fazilet: yesterdayFazilet.yatsi, diyanet: yesterdayDiyanet?.yatsi ?? null, isCurrent: true, isNext: false, isCrossDay: true, dividerSide: "right" });
  }
  if (faziletTimes) {
    for (const name of PRAYER_NAMES) {
      columns.push({ prayer: name, fazilet: faziletTimes[name], diyanet: diyanetTimes?.[name] ?? null, isCurrent: isViewingToday && prayerState?.current === name && !isBeforeImsak, isNext: isViewingToday && prayerState?.next === name, isCrossDay: false, dividerSide: null });
    }
  }
  if (isViewingToday && isAfterYatsi && tomorrowFazilet) {
    columns.push({ prayer: "imsak", fazilet: tomorrowFazilet.imsak, diyanet: tomorrowDiyanet?.imsak ?? null, isCurrent: false, isNext: true, isCrossDay: true, dividerSide: "left" });
  }

  // ── Loading / Error ──
  if (loading && !fazilet) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--card-border)", borderTopColor: "var(--primary)" }} />
          <p style={{ color: "var(--text-secondary)" }}>{i18n.loading}</p>
        </div>
      </main>
    );
  }

  if (error && !fazilet) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--danger)" }}>{i18n.error}: {error}</p>
      </main>
    );
  }

  // ── Location display name ──
  const locationDisplayName = (() => {
    if (!fazilet) return "";
    const district = fazilet.ilceler.find((d) => d.id === fazilet.form.ilce_id);
    const city = fazilet.sehirler.find((s) => s.id === fazilet.form.sehir_id);
    const country = fazilet.ulkeler.find((u) => u.id === fazilet.form.ulke_id);
    if (district && fazilet.ilceler.length > 0 && district.adi !== city?.adi) {
      return `${district.adi} - ${city?.adi || ""}`;
    }
    return `${city?.adi || ""} - ${country?.adi || ""}`;
  })();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-6 pt-[12vh] sm:pt-[15vh] pb-6" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-3xl rounded-t-xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* ── Decorative top accent ── */}
        <div className="card-accent-top" />

        {/* ── Header: theme + location + lang ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3">
          {/* Left: theme toggle */}
          <div className="w-10">
            <button onClick={toggleTheme} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }} aria-label="Toggle theme">
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>

          {/* Center: location button */}
          <button
            onClick={() => setLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors"
            style={{ color: "var(--text)", border: "1px solid var(--card-border)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)", flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate max-w-[140px] sm:max-w-[220px]">{locationDisplayName}</span>
          </button>

          {/* Right: lang dropdown */}
          <div className="w-10 flex justify-end relative">
            <button
              onClick={() => setLangDropdownOpen((v) => !v)}
              className="p-1.5 rounded-lg transition-colors flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Language"
            >
              <GlobeIcon />
              <span className="text-[10px] font-medium">{lang === 1 ? "TR" : "EN"}</span>
            </button>
            {langDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[80px]"
                  style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                  {([{ l: 1 as Lang, label: "Türkçe" }, { l: 2 as Lang, label: "English" }]).map(({ l, label }) => (
                    <button key={l} onClick={() => { setLang(l); setLangDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:opacity-80"
                      style={{ color: lang === l ? "var(--primary)" : "var(--text)", fontWeight: lang === l ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Date display ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-4 min-h-[120px]">
          <button onClick={() => setViewOffset((v) => v - 1)} disabled={!canGoPrev} className="text-3xl sm:text-4xl px-2 transition-opacity disabled:opacity-10" style={{ color: "var(--text-muted)" }}>&#8249;</button>
          <div className="flex items-baseline gap-3 sm:gap-4 select-none">
            <span className="text-6xl sm:text-7xl leading-none" style={{ fontFamily: "var(--font-display), serif", color: "var(--text)", fontWeight: 400 }}>{dayNum}</span>
            <div className="flex flex-col min-w-[100px] sm:min-w-[140px]">
              <span className="text-lg sm:text-2xl" style={{ color: "var(--text-secondary)" }}>{monthName}</span>
              <span className="text-lg sm:text-2xl font-semibold" style={{ color: "var(--text)" }}>{weekday}</span>
              <span className="text-base sm:text-xl" style={{ color: "var(--text-muted)" }}>{year}</span>
            </div>
          </div>
          <button onClick={() => setViewOffset((v) => v + 1)} disabled={!canGoNext} className="text-3xl sm:text-4xl px-2 transition-opacity disabled:opacity-10" style={{ color: "var(--text-muted)" }}>&#8250;</button>
        </div>

        {/* ── Back to today ── */}
        <div className="text-center min-h-[24px] pb-1">
          {!isViewingToday && (
            <button onClick={() => setViewOffset(0)} className="text-xs underline hover:no-underline transition-colors" style={{ color: "var(--primary)" }}>
              {lang === 1 ? "Bugüne dön" : "Back to today"}
            </button>
          )}
        </div>

        {/* ── Hijri & Rumi dates ── */}
        <div className="text-center text-xs sm:text-sm px-4 pb-3 min-h-[28px]" style={{ color: "var(--text-secondary)" }}>
          {takvim && (
            <>
              <span className="font-medium" style={{ color: "var(--accent)" }}>{i18n.hijri}:</span>{" "}
              {takvim.hicri_tarih}
              <span className="mx-2 sm:mx-3" style={{ color: "var(--text-muted)" }}>&middot;</span>
              <span className="font-medium" style={{ color: "var(--accent)" }}>{i18n.rumi}:</span>{" "}
              {takvim.rumi_tarih}
            </>
          )}
        </div>

        {/* ── Geometric divider ── */}
        <div className="geo-strip" />

        {/* ── Prayer times grid ── */}
        {columns.length > 0 && (
          <div className="text-center py-1" style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((col, i) => {
              const hasDiyanet = !!col.diyanet && col.diyanet !== "" && col.diyanet !== col.fazilet;
              let faziletIsExit = false;
              if (col.isNext) { faziletIsExit = hasDiyanet && col.diyanet ? toMin(col.fazilet) <= toMin(col.diyanet) : true; }

              return (
                <div key={`${col.prayer}-${i}`} className="py-3 sm:py-4 px-0.5 sm:px-1 transition-colors"
                  style={{ background: col.isCurrent ? "var(--primary-soft)" : "transparent", opacity: col.isCrossDay ? 0.6 : 1, borderLeft: col.dividerSide === "left" ? "2px dashed var(--divider)" : "none", borderRight: col.dividerSide === "right" ? "2px dashed var(--divider)" : "none" }}>
                  <p className="text-[10px] sm:text-xs font-semibold mb-1 tracking-wide uppercase" style={{ color: col.isCurrent ? "var(--primary-text)" : "var(--text-secondary)" }}>
                    {i18n.prayerNames[col.prayer]}
                  </p>
                  <p className="text-xs sm:text-sm font-mono font-bold" style={{ color: col.isCurrent ? "var(--primary-text)" : col.isNext && faziletIsExit ? "var(--danger)" : "var(--text)" }}>
                    {col.fazilet}
                  </p>
                  <div className="min-h-[16px]">
                    {hasDiyanet && col.diyanet && (
                      <p className="text-[10px] sm:text-[11px] font-mono mt-0.5" style={{ color: col.isNext && !faziletIsExit ? "var(--danger)" : "var(--text-muted)", fontWeight: col.isNext && !faziletIsExit ? 600 : 400 }}>
                        {col.diyanet}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="geo-strip" />

        {/* ── Diyanet notice ── */}
        {!diyanetTimes && faziletTimes && (
          <div className="text-center py-1 text-[10px] sm:text-xs" style={{ color: "var(--text-muted)" }}>{i18n.diyanetUnavailable}</div>
        )}



      </div>

      {/* ── Countdown bar: directly below card ── */}
      {prayerState && (
        <div className="w-full max-w-3xl rounded-b-xl overflow-hidden" style={{ boxShadow: "var(--shadow)" }}>
          {/* Uncertain vakit banner */}
          <div className="transition-all overflow-hidden" style={{ maxHeight: isInUncertainZone ? "36px" : "0" }}>
            <div className="text-center py-1.5 text-xs sm:text-sm font-semibold" style={{ background: "var(--uncertain-bg)", color: "var(--uncertain-text)" }}>
              {i18n.uncertainVakit}
            </div>
          </div>

          <div className="no-transition text-white text-center px-4 space-y-1 h-[56px] sm:h-[60px] flex flex-col items-center justify-center" style={{ background: "var(--countdown-bg)" }}>
            {periodInfo.exitNamaz && exitTime && (
              <p className={`text-xs sm:text-sm transition-opacity ${!exitPassed && !isInUncertainZone ? "opacity-100 font-medium" : "opacity-40"}`}>
                {i18n.namazExit.replace("{namaz}", i18n.prayerNames[periodInfo.exitNamaz])}{" "}
                <span className="font-mono font-bold">{exitPassed ? `(${i18n.exited})` : formatCountdown(exitCountdown)}</span>
              </p>
            )}
            {periodInfo.enterNamaz && enterTime && (
              <p className={`text-xs sm:text-sm transition-opacity ${!periodInfo.exitNamaz || exitPassed || isInUncertainZone ? "opacity-100 font-medium" : "opacity-40"}`}>
                {i18n.namazEnter.replace("{namaz}", i18n.prayerNames[periodInfo.enterNamaz])}{" "}
                <span className="font-mono font-bold">{formatCountdown(enterCountdown)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Location modal ── */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLocationModalOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full max-w-sm rounded-xl p-5 space-y-4"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {lang === 1 ? "Konum Seç" : "Select Location"}
              </h3>
              <button onClick={() => setLocationModalOpen(false)} className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Country selector — hidden when locked to single country */}
              {(!ALLOWED_COUNTRY_IDS || ALLOWED_COUNTRY_IDS.length !== 1) && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{i18n.country}</label>
                  <select value={selectedCountry || ""} onChange={(e) => handleCountryChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: "var(--select-bg)", border: "1px solid var(--select-border)", color: "var(--text)" }}>
                    {fazilet?.ulkeler
                      .filter((c) => !ALLOWED_COUNTRY_IDS || ALLOWED_COUNTRY_IDS.includes(c.id))
                      .map((c) => <option key={c.id} value={c.id}>{c.adi}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{i18n.city}</label>
                <select value={selectedCity || ""} onChange={(e) => handleCityChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ background: "var(--select-bg)", border: "1px solid var(--select-border)", color: "var(--text)" }}>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.adi}</option>)}
                </select>
              </div>

              {fazilet && fazilet.ilceler.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{i18n.district}</label>
                  <select value={selectedDistrict || selectedCity || ""} onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val === selectedCity) { handleCityChange(val); }
                      else { handleDistrictChange(val); }
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: "var(--select-bg)", border: "1px solid var(--select-border)", color: "var(--text)" }}>
                    <option value={selectedCity || ""}>{cities.find((c) => c.id === selectedCity)?.adi || "—"}</option>
                    {fazilet.ilceler.map((d) => <option key={d.id} value={d.id}>{d.adi}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => setLocationModalOpen(false)}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: "var(--primary)" }}
            >
              {lang === 1 ? "Tamam" : "Done"}
            </button>
          </div>
        </div>
      )}

      {/* ── Info modal ── */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setInfoModalOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full max-w-md rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{i18n.aboutTitle}</h3>
              <button onClick={() => setInfoModalOpen(false)} className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              {i18n.aboutBody.map((p, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p}</p>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--divider)" }} className="pt-4">
              <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>{i18n.dataSourcesTitle}</h4>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{i18n.dataSourcesText}</p>
            </div>

            <div style={{ borderTop: "1px solid var(--divider)" }} className="pt-4">
              <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>{i18n.contactTitle}</h4>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{i18n.contactText}</p>
              <a
                href="https://github.com/alhnesn/hibrit-vakit/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub Issues
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-right buttons: info + dev ── */}
      <div className="fixed bottom-3 right-3 z-50 flex items-end gap-1.5">
        <button onClick={() => setInfoModalOpen(true)} className="text-[10px] px-2 py-1 rounded-md shadow-md transition-colors"
          style={{ background: "var(--card)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
          ?
        </button>
        <button onClick={() => setDevTimeOpen((v) => !v)} className="text-[10px] px-2 py-1 rounded-md shadow-md transition-colors"
          style={{ background: "var(--card)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
          {devTimeOpen ? "\u2715" : "\u2699"}
        </button>
        {devTimeOpen && (
          <div className="mt-1 rounded-lg shadow-xl p-3 space-y-2 text-sm w-48" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={devTimeEnabled} onChange={(e) => setDevTimeEnabled(e.target.checked)} />
              Override time
            </label>
            <input type="time" value={devTime} onChange={(e) => setDevTime(e.target.value)} disabled={!devTimeEnabled}
              className="rounded px-2 py-1 w-full text-xs disabled:opacity-30" style={{ background: "var(--select-bg)", border: "1px solid var(--select-border)", color: "var(--text)" }} />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Current: {currentHMS}</p>
          </div>
        )}
      </div>
    </main>
  );
}

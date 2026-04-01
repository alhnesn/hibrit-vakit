// ── Language ──

export type Lang = 1 | 2; // 1 = Turkish, 2 = English

// ── Prayer names ──

export const PRAYER_NAMES = [
  "imsak",
  "sabah",
  "gunes",
  "ogle",
  "ikindi",
  "aksam",
  "yatsi",
] as const;

export type PrayerName = (typeof PRAYER_NAMES)[number];

// ── Fazilet API ──

export interface FaziletVakitEntry {
  tarih: string; // ISO 8601 UTC
  is_takdiri: boolean;
}

export interface FaziletDayVakitler {
  tarih: string; // YYYY-MM-DD
  imsak: FaziletVakitEntry[];
  sabah: FaziletVakitEntry[];
  gunes: FaziletVakitEntry[];
  israk: FaziletVakitEntry[];
  ogle: FaziletVakitEntry[];
  ikindi: FaziletVakitEntry[];
  aksam: FaziletVakitEntry[];
  yatsi: FaziletVakitEntry[];
}

export interface FaziletTakvim {
  tarih: string;
  hicri_tarih: string;
  rumi_tarih: string;
}

export interface FaziletKronoloji {
  tarih: string;
  kronoloji: string[];
}

export interface FaziletAyinSafhasi {
  tarih: string;
  resim: string;
}

export interface FaziletIstatistik {
  tarih: string;
  kacinci_gun: number;
  kacinci_hafta: number;
  kacinci_ay: number;
}

export interface FaziletCountry {
  id: number;
  adi: string;
}

export interface FaziletCity {
  id: number;
  adi: string;
}

export interface FaziletForm {
  ulke_id: number;
  sehir_id: number;
  ilce_id: number;
}

export interface FaziletResponse {
  success: boolean;
  bolge_adi: string;
  bolge_saatdilimi: string;
  form: FaziletForm;
  ulkeler: FaziletCountry[];
  sehirler: FaziletCity[];
  ilceler: FaziletCity[];
  vakitler: FaziletDayVakitler[];
  takvimler: FaziletTakvim[];
  kronolojiler: FaziletKronoloji[];
  istatistikler: FaziletIstatistik[];
  ayin_safhalari: FaziletAyinSafhasi[];
}

// ── EzanVakti (Diyanet) API ──

export interface EzanVaktiCountry {
  UlkeAdi: string;
  UlkeAdiEn: string;
  UlkeID: string;
}

export interface EzanVaktiCity {
  SehirAdi: string;
  SehirAdiEn: string;
  SehirID: string;
}

export interface EzanVaktiDistrict {
  IlceAdi: string;
  IlceAdiEn: string;
  IlceID: string;
}

export interface EzanVaktiPrayerTime {
  MiladiTarihKisa: string; // DD.MM.YYYY
  MiladiTarihUzun: string;
  MiladiTarihUzunIso8601: string;
  HicriTarihKisa: string;
  HicriTarihUzun: string;
  GreenwichOrtalamaZamani: number;
  Imsak: string; // HH:MM
  Gunes: string;
  Ogle: string;
  Ikindi: string;
  Aksam: string;
  Yatsi: string;
}

// ── Parsed prayer times (HH:MM strings) ──

export type PrayerTimesMap = Record<PrayerName, string>;


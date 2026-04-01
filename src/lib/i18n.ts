import type { Lang, PrayerName } from "./types";

interface Translations {
  prayerNames: Record<PrayerName, string>;
  namazExit: string;
  namazEnter: string;
  exited: string;
  uncertainVakit: string;
  loading: string;
  error: string;
  country: string;
  city: string;
  district: string;
  hijri: string;
  rumi: string;
  noDistrict: string;
  diyanetUnavailable: string;
  aboutTitle: string;
  aboutBody: string[];
  contactTitle: string;
  contactText: string;
  dataSourcesTitle: string;
  dataSourcesText: string;
  weekdays: string[];
  months: string[];
}

const tr: Translations = {
  prayerNames: {
    imsak: "İmsak",
    sabah: "Sabah",
    gunes: "Güneş",
    ogle: "Öğle",
    ikindi: "İkindi",
    aksam: "Akşam",
    yatsi: "Yatsı",
  },
  namazExit: "{namaz} Namazının Çıkmasına Kalan Süre:",
  namazEnter: "{namaz} Namazının Girmesine Kalan Süre:",
  exited: "çıktı",
  uncertainVakit: "Belirsiz Vakit",
  loading: "Yükleniyor...",
  error: "Hata",
  country: "Ülke",
  city: "Şehir",
  district: "İlçe",
  hijri: "Hicrî",
  rumi: "Rûmî",
  noDistrict: "—",
  diyanetUnavailable: "Diyanet verisi bulunamadı",
  aboutTitle: "Hibrit Vakit Nedir?",
  aboutBody: [
    "Bu uygulama, namaz vakitlerini iki farklı kaynaktan göstererek ihtiyatlı davranmanızı sağlar.",
    "Fazilet Takvimi temkinli (giriş) vakitlerini, Diyanet ise erken (çıkış) vakitlerini sunar. İki kaynak arasındaki fark, hesaplama yöntemlerindeki farklılıklardan kaynaklanır.",
    "Bu fark genellikle birkaç dakikadır, ancak özellikle imsak ve yatsı vakitlerinde daha belirgin olabilir. İki vakit arasındaki aralık \"belirsiz bölge\" olarak işaretlenir.",
    "Yeşil ile işaretlenen vakit, şu anki aktif vakti gösterir. Kırmızı ile işaretlenen vakit, çıkış zamanını (en erken kaynak) belirtir.",
    "\"Belirsiz Vakit\" uyarısı, iki kaynağın bir vakit geçişi konusunda anlaşamadığı zaman dilimlerinde görünür. Bir kaynak yeni vaktin girdiğini söylerken diğeri henüz girmediğini belirtir. Bu aralıkta namaz kılmak ihtiyatlı olmayabilir.",
  ],
  contactTitle: "İletişim & Geri Bildirim",
  contactText: "Hata bildirimi veya öneri için GitHub üzerinden ulaşabilirsiniz.",
  dataSourcesTitle: "Veri Kaynakları",
  dataSourcesText: "Namaz vakitleri Fazilet Takvimi (fazilettakvimi.com) ve Diyanet İşleri Başkanlığı kaynaklarından alınmaktadır. Bu uygulama resmi bir Fazilet veya Diyanet ürünü değildir.",
  weekdays: [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ],
  months: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
};

const en: Translations = {
  prayerNames: {
    imsak: "Sahur Ends",
    sabah: "Fajr",
    gunes: "Sunrise",
    ogle: "Zuhr",
    ikindi: "Asr",
    aksam: "Maghrib",
    yatsi: "Isha",
  },
  namazExit: "{namaz} Prayer Ending In:",
  namazEnter: "{namaz} Prayer Starting In:",
  exited: "ended",
  uncertainVakit: "Caution Zone",
  loading: "Loading...",
  error: "Error",
  country: "Country",
  city: "City",
  district: "District",
  hijri: "Hijri",
  rumi: "Rumi",
  noDistrict: "—",
  diyanetUnavailable: "Diyanet data unavailable",
  aboutTitle: "What is Hibrit Vakit?",
  aboutBody: [
    "This app displays prayer times from two different sources to help you pray with caution.",
    "Fazilet Calendar provides conservative (entry) times, while Diyanet provides earlier (exit) times. The difference comes from varying calculation methods.",
    "This difference is usually a few minutes but can be more noticeable for Fajr and Isha. The gap between the two is marked as a \"Caution Zone.\"",
    "Green highlights the current active prayer. Red marks the exit time (earliest source).",
    "The \"Caution Zone\" warning appears during time windows where the two sources disagree about a prayer transition. One source says the new prayer has entered while the other says it hasn't yet. Praying during this interval may not be cautious.",
  ],
  contactTitle: "Contact & Feedback",
  contactText: "For bug reports or suggestions, reach out via GitHub.",
  dataSourcesTitle: "Data Sources",
  dataSourcesText: "Prayer times are sourced from Fazilet Calendar (fazilettakvimi.com) and the Presidency of Religious Affairs (Diyanet). This app is not an official Fazilet or Diyanet product.",
  weekdays: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

const translations: Record<Lang, Translations> = { 1: tr, 2: en };

export function t(lang: Lang): Translations {
  return translations[lang];
}

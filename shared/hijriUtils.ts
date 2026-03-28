// أيام الأسبوع بالعربية
export const DAYS_OF_WEEK = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

// تحويل التاريخ الميلادي إلى هجري (تقريبي)
export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lRem = l - 10631 * n + 354;
  const j = Math.floor((10985 - lRem) / 5316) * Math.floor((50 * lRem) / 17719) +
    Math.floor(lRem / 5670) * Math.floor((43 * lRem) / 15238);
  const lFinal = lRem - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * lFinal) / 709);
  const day = lFinal - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

// تحويل التاريخ الهجري إلى ميلادي (تقريبي) - للربط الذكي لليوم
export function hijriToGregorian(year: number, month: number, day: number): Date {
  const jd = Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385;
  // Convert Julian Day to Gregorian
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const lRem = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (lRem + 1)) / 1461001);
  const lFinal = lRem - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * lFinal) / 2447);
  const gDay = lFinal - Math.floor((2447 * j) / 80);
  const lMonth = j + 2 - 12 * Math.floor(j / 11);
  const gYear = 100 * (n - 49) + i + Math.floor(j / 11);
  return new Date(gYear, lMonth - 1, gDay);
}

// تحديد اليوم من تاريخ هجري (ربط ذكي)
export function getDayFromHijriDate(hijriDateStr: string): string {
  const parts = hijriDateStr.split("/");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
  if (month < 1 || month > 12 || day < 1 || day > 30) return "";
  const gregDate = hijriToGregorian(year, month, day);
  return DAYS_OF_WEEK[gregDate.getDay()];
}

// تنسيق التاريخ الهجري
export function formatHijriDate(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

// الحصول على اسم اليوم من التاريخ الميلادي
export function getDayOfWeek(date: Date): string {
  return DAYS_OF_WEEK[date.getDay()];
}

// أسماء الأشهر الهجرية
export const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الثاني",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export function getHijriMonthName(month: number): string {
  return HIJRI_MONTHS[month - 1] || "";
}

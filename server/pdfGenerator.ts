/**
 * خدمة توليد PDF باستخدام Puppeteer مباشرةً
 * تدعم العربية وRTL بشكل كامل
 *
 * المشاكل التي تم حلها:
 * 1. الترميز العربي  → خطوط Noto Naskh Arabic + waitUntil:"networkidle0"
 * 2. بيئة الإنتاج   → كشف تلقائي لمسار Chrome مع fallback سلس
 * 3. البيانات الفارغة → دوال sanitize() تحمي كل حقل قبل الاستخدام
 * (مشكلة الحلقة في PdfPreviewModal تُحل في الملف المقابل)
 */

import puppeteer, { Browser } from "puppeteer";
import * as path from "path";
import * as fs from "fs";

// ─── إدارة Browser كـ Singleton لتجنب فتح نسخ متعددة ───────────────────────
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // ── الحل #2: كشف مسار Chrome في بيئة الإنتاج ──
  // الأولوية: متغير البيئة ← مسارات Linux الشائعة ← Puppeteer المُضمَّن
  const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean) as string[];

  let executablePath: string | undefined;
  for (const p of chromeCandidates) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  if (!executablePath) {
    console.warn(
      "⚠️  لم يُعثر على Chrome في المسارات المعروفة — سيستخدم Puppeteer المُضمَّن.\n" +
      "   إذا فشل التشغيل، حدّد المسار يدوياً عبر: PUPPETEER_EXECUTABLE_PATH=/path/to/chrome"
    );
  }

  browserInstance = await puppeteer.launch({
    executablePath,                  // undefined = Puppeteer يستخدم Chrome المُحمَّل معه
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",     // ضروري في Docker / Cloud Run / Render
      "--disable-gpu",
      "--font-render-hinting=none",  // تحسين تصيير الخطوط العربية
    ],
  });

  process.on("exit", () => { browserInstance?.close(); });

  return browserInstance;
}

// ─── الحل #4: دوال تعقيم البيانات الفارغة ──────────────────────────────────
function sanitize(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

function sanitizeArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

// ─── ثوابت ───────────────────────────────────────────────────────────────────
const COMPANY_COLORS = {
  quraish: { primary: "#1a4a8a", accent: "#e6981a", name: "شركة قريش المحدودة" },
  azan:    { primary: "#1a5c3a", accent: "#c8a820", name: "شركة أذان المحدودة" },
};

const DEPT_MAP: Record<string, string> = {
  technology:  "إدارة التقنية",
  catering:    "إدارة الإعاشة",
  transport:   "إدارة النقل",
  cultural:    "الإدارة الثقافية",
  media:       "الإدارة الإعلامية",
  supervisors: "إدارة المشرفين",
};

// ─── الحل #1: CSS مع خطوط Google Fonts العربية ──────────────────────────────
function getBaseCSS(primary: string, accent: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Naskh Arabic', 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      text-align: right;
      color: #222;
      background: #fff;
      font-size: 13px;
      line-height: 1.8;
    }
    .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
    .header {
      background: ${primary};
      color: white;
      padding: 18px 28px 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-logo {
      display: flex; flex-direction: column;
      align-items: center; text-align: center; min-width: 80px;
    }
    .logo-image {
      width: 50px; height: 50px;
      background: white; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: ${primary}; font-size: 18px; margin-bottom: 4px;
    }
    .logo-number { font-size: 10px; font-weight: 600; color: white; }
    .header-right { flex: 1; text-align: right; padding-right: 20px; }
    .company-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .doc-type { font-size: 14px; font-weight: 600; opacity: 0.95; }
    .header-left { flex: 1; }
    .accent-bar { height: 4px; background: ${accent}; }
    .info-bar {
      background: #f5f5f5; padding: 10px 28px;
      font-size: 11px; color: #666;
      display: flex; justify-content: space-between;
    }
    .content { padding: 28px; min-height: 400px; }
    .section {
      margin-bottom: 20px; border: 1px solid #ddd;
      border-radius: 4px; overflow: hidden;
    }
    .section-header {
      background: ${primary}; color: white;
      padding: 10px 14px; font-weight: 600; font-size: 12px;
    }
    .section-body { padding: 12px 14px; }
    .data-row {
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid #eee;
    }
    .data-row:last-child { border-bottom: none; }
    .data-label { font-weight: 600; color: #555; min-width: 100px; }
    .data-value { color: #222; text-align: left; flex: 1; }
    .score-box {
      background: #f9f9f9; border: 2px solid ${accent};
      border-radius: 4px; padding: 20px; margin: 20px 0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .score-label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .score-number { font-size: 36px; font-weight: 700; margin: 4px 0; }
    .score-info { flex: 1; padding-right: 20px; }
    .progress-bar {
      height: 8px; background: #ddd; border-radius: 4px;
      overflow: hidden; margin-top: 8px;
    }
    .progress-fill { height: 100%; }
    .table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .table th {
      background: ${primary}; color: white;
      padding: 10px; text-align: right; font-weight: 600; font-size: 11px;
    }
    .table td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
    .table tr:nth-child(even) { background: #f9f9f9; }
    .signature-area { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .signature-block { display: inline-block; text-align: center; min-width: 150px; }
    .signature-line { border-top: 1px solid #222; margin-bottom: 4px; width: 150px; }
    .signature-name { font-weight: 600; font-size: 11px; margin-bottom: 2px; }
    .signature-role { font-size: 10px; color: #666; }
    .footer {
      position: fixed; bottom: 0; width: 100%;
      background: #f5f5f5; padding: 8px 28px;
      border-top: 1px solid #ddd;
      display: flex; justify-content: space-between;
      font-size: 10px; color: #666;
    }
  `;
}

// ─── دالة مشتركة: HTML → PDF Buffer ─────────────────────────────────────────
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // waitUntil:"networkidle0" يضمن تحميل Google Fonts قبل الطباعة (الحل #1)
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    // انتظار إضافي لتأكيد تصيير الخطوط العربية
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "20mm", left: "0" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// توليد PDF محضر الاجتماع
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateMeetingPdf(data: {
  id?: number | null;
  company?: string | null;
  hijriDate?: string | null;
  dayOfWeek?: string | null;
  title?: string | null;
  elements?: unknown;
  recommendations?: unknown;
  department?: string | null;
  attendees?: unknown;
  meetingNumber?: string | null;
  createdByName?: string | null;
}): Promise<Buffer> {
  const companyKey = sanitize(data.company, "quraish");
  const colors = COMPANY_COLORS[companyKey as keyof typeof COMPANY_COLORS] ?? COMPANY_COLORS.quraish;

  const meetingNumber = sanitize(data.meetingNumber, "1447/0000");
  const hijriDate     = sanitize(data.hijriDate, "—");
  const dayOfWeek     = sanitize(data.dayOfWeek, "");
  const title         = sanitize(data.title, "بدون عنوان");
  const createdByName = data.createdByName ? sanitize(data.createdByName) : null;
  const department    = data.department ? sanitize(data.department) : null;
  const deptDisplay   = department ? (DEPT_MAP[department] ?? department) : null;

  const elements        = sanitizeArray(data.elements);
  const recommendations = sanitizeArray(data.recommendations);
  const attendees       = sanitizeArray(data.attendees);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><style>${getBaseCSS(colors.primary, colors.accent)}</style></head>
<body><div class="page">

  <div class="header">
    <div class="header-logo">
      <div class="logo-image">م</div>
      <div class="logo-number">${meetingNumber}</div>
    </div>
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">محضر اجتماع</div>
    </div>
    <div class="header-left"></div>
  </div>
  <div class="accent-bar"></div>

  <div class="info-bar">
    <span>${[dayOfWeek, hijriDate].filter(Boolean).join("  |  ")}</span>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">معلومات الاجتماع</div>
      <div class="section-body">
        <div class="data-row">
          <span class="data-label">العنوان</span>
          <span class="data-value">${title}</span>
        </div>
        ${deptDisplay ? `<div class="data-row">
          <span class="data-label">الإدارة</span>
          <span class="data-value">${deptDisplay}</span>
        </div>` : ""}
      </div>
    </div>

    ${elements.length > 0 ? `<div class="section">
      <div class="section-header">عناصر الاجتماع</div>
      <div class="section-body"><table class="table"><tbody>
        ${elements.map((e, i) => `<tr><td style="width:30px;text-align:center">${i+1}</td><td>${e}</td></tr>`).join("")}
      </tbody></table></div>
    </div>` : ""}

    ${recommendations.length > 0 ? `<div class="section">
      <div class="section-header">التوصيات</div>
      <div class="section-body"><table class="table"><tbody>
        ${recommendations.map((r, i) => `<tr><td style="width:30px;text-align:center">${i+1}</td><td>${r}</td></tr>`).join("")}
      </tbody></table></div>
    </div>` : ""}

    ${attendees.length > 0 ? `<div class="section">
      <div class="section-header">الحضور</div>
      <div class="section-body"><table class="table"><tbody>
        ${attendees.map((a, i) => `<tr><td style="width:30px;text-align:center">${i+1}</td><td>${a}</td></tr>`).join("")}
      </tbody></table></div>
    </div>` : ""}

    ${createdByName ? `<div class="signature-area">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${createdByName}</div>
        <div class="signature-role">المُعِد</div>
      </div>
    </div>` : ""}
  </div>

  <div class="footer">
    <span>${colors.name}  |  نظام التوثيق</span>
    <span>${new Date().toLocaleDateString("ar-SA")}</span>
  </div>
</div></body></html>`;

  return htmlToPdfBuffer(html);
}

// ═══════════════════════════════════════════════════════════════════════════════
// توليد PDF تقرير التقييم
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateEvaluationPdf(data: {
  id?: number | null;
  reportNumber?: string | null;
  company?: string | null;
  hijriDate?: string | null;
  dayOfWeek?: string | null;
  axis?: string | null;
  track?: string | null;
  criterion?: string | null;
  score?: number | null;
  notes?: string | null;
  createdByName?: string | null;
}): Promise<Buffer> {
  const companyKey = sanitize(data.company, "quraish");
  const colors = COMPANY_COLORS[companyKey as keyof typeof COMPANY_COLORS] ?? COMPANY_COLORS.quraish;

  const reportNumber  = sanitize(data.reportNumber, "1447/0001");
  const hijriDate     = sanitize(data.hijriDate, "—");
  const dayOfWeek     = sanitize(data.dayOfWeek, "");
  const axis          = sanitize(data.axis, "—");
  const track         = sanitize(data.track, "—");
  const criterion     = sanitize(data.criterion, "—");
  const createdByName = data.createdByName ? sanitize(data.createdByName) : null;

  // الحل #4: score قد يكون null أو NaN
  const rawScore = Number(data.score);
  const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, rawScore)) : 0;
  const scoreColor = score >= 70 ? "#1a9e3a" : score >= 50 ? "#e6981a" : "#d32f2f";
  const scoreLabel  = score >= 70 ? "ممتاز" : score >= 50 ? "جيد" : "يحتاج تحسين";
  const notes = data.notes ? sanitize(data.notes).replace(/\n/g, "<br>") : null;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><style>${getBaseCSS(colors.primary, colors.accent)}</style></head>
<body><div class="page">

  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ت</div>
      <div class="logo-number">${reportNumber}</div>
    </div>
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم الأداء</div>
    </div>
    <div class="header-left"></div>
  </div>
  <div class="accent-bar"></div>

  <div class="info-bar">
    <span>${[dayOfWeek, hijriDate].filter(Boolean).join("  |  ")}</span>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">بيانات التقييم</div>
      <div class="section-body">
        <div class="data-row"><span class="data-label">المحور</span><span class="data-value">${axis}</span></div>
        <div class="data-row"><span class="data-label">المسار</span><span class="data-value">${track}</span></div>
        <div class="data-row"><span class="data-label">المعيار</span><span class="data-value">${criterion}</span></div>
      </div>
    </div>

    <div class="score-box">
      <div>
        <div class="score-label">الدرجة المحققة</div>
        <div class="score-number" style="color:${scoreColor}">${score}</div>
        <div style="font-size:11px;color:#888">من 100</div>
      </div>
      <div class="score-info">
        <div style="font-size:12px;font-weight:600;color:${scoreColor}">${scoreLabel}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${score}%;background:${scoreColor}"></div>
        </div>
      </div>
    </div>

    ${notes ? `<div class="section">
      <div class="section-header">الملاحظات</div>
      <div class="section-body">
        <div style="padding:12px 14px;font-size:12px;line-height:1.8">${notes}</div>
      </div>
    </div>` : ""}

    ${createdByName ? `<div class="signature-area">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${createdByName}</div>
        <div class="signature-role">المُعِد</div>
      </div>
    </div>` : ""}
  </div>

  <div class="footer">
    <span>${colors.name}  |  نظام التوثيق</span>
    <span>${new Date().toLocaleDateString("ar-SA")}</span>
  </div>
</div></body></html>`;

  return htmlToPdfBuffer(html);
}

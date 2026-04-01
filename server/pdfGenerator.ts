/**
 * خدمة توليد PDF باستخدام Puppeteer مباشرةً
 * تم تحديث التصميم بناءً على هوية شركة قريش 2026 دون تغيير في منطق الكود
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
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
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

// ─── ثوابت الهوية البصرية 2026 ────────────────────────────────────────────
const COMPANY_COLORS = {
  quraish: { 
    primary: "#4A3382",   // الخزامي [cite: 35, 36]
    accent: "#CFB88F",    // البيج الذهبي [cite: 37, 38]
    secondary: "#6B5CA6", // الخزامي الفاتح [cite: 39, 40]
    name: "شركة قريش المحدودة" 
  },
  azan: { primary: "#1a5c3a", accent: "#c8a820", name: "شركة أذان المحدودة" },
};

const DEPT_MAP: Record<string, string> = {
  technology:  "إدارة التقنية",
  catering:    "إدارة الإعاشة",
  transport:   "إدارة النقل",
  cultural:    "الإدارة الثقافية",
  media:       "الإدارة الإعلامية",
  supervisors: "إدارة المشرفين",
  registration: "إدارة التسجيل",
  mina_preparation: "تجهيز منى",
  arafat_preparation: "تجهيز عرفات",
  muzdalifah_preparation: "تجهيز مزدلفة",
  quality: "إدارة الجودة",
  other: "أخرى",
};

// ─── الحل #1: CSS المحدث بتصميم الهوية 2026 ──────────────────────────────
function getBaseCSS(primary: string, accent: string, secondary?: string): string {
  const lightLavender = secondary || "#6B5CA6";
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Naskh Arabic', 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      text-align: right;
      color: #333;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }
    .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
    
    .besmalah { 
      text-align: center; padding: 12px 0 5px; font-size: 12px; color: ${primary}; font-weight: 600;
    }

    .header {
      border-bottom: 4px solid ${accent};
      padding: 20px 45px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
    }
    .header-logo {
      display: flex; align-items: center; gap: 15px;
    }
    .logo-image {
      width: 60px; height: 60px;
      background: ${primary}; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: white; font-size: 28px;
    }
    .company-name { font-size: 18px; font-weight: 700; color: ${primary}; }
    .doc-type { font-size: 14px; font-weight: 600; color: ${accent}; }

    .info-bar {
      background: ${primary}; color: white;
      padding: 8px 45px;
      font-size: 11px;
      display: flex; justify-content: space-between;
      font-weight: 600;
    }
    .content { padding: 35px 45px; min-height: 400px; }
    
    .section-header {
      border-right: 4px solid ${accent};
      padding-right: 12px; margin-bottom: 15px;
      color: ${primary}; font-weight: 700; font-size: 14px;
    }

    .data-row {
      display: flex; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #eee;
    }
    .data-label { font-weight: 700; color: ${primary}; min-width: 120px; }
    .data-value { color: #333; flex: 1; text-align: left; }

    .score-box {
      background: #fcfaff; border: 1px solid ${accent};
      border-radius: 8px; padding: 25px; margin: 25px 0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .score-number { font-size: 42px; font-weight: 700; }
    .progress-bar {
      height: 10px; background: #eee; border-radius: 5px;
      overflow: hidden; margin-top: 10px; width: 200px;
    }
    .progress-fill { height: 100%; }

    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table td { 
      padding: 12px; border: 1px solid ${lightLavender}33; 
      font-size: 12px; 
    }
    .item-num {
      width: 22px; height: 22px; background: ${accent};
      color: white; border-radius: 4px; display: inline-flex;
      align-items: center; justify-content: center; font-weight: bold;
      margin-left: 10px; font-size: 11px;
    }

    .signature-area { margin-top: 50px; display: flex; justify-content: flex-end; }
    .signature-block { text-align: center; width: 180px; }
    .signature-line { border-top: 1px solid ${primary}; margin-bottom: 8px; }
    .signature-name { font-weight: 700; color: ${primary}; }

    .footer {
      position: absolute; bottom: 0; width: 100%;
      background: #fcfcfc; padding: 12px 45px;
      border-top: 1px solid ${accent};
      display: flex; justify-content: space-between;
      font-size: 10px; color: ${primary}; font-weight: 600;
    }
  `;
}

// ─── دالة مشتركة: HTML → PDF Buffer ─────────────────────────────────────────
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "15mm", left: "0" },
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
  customDepartment?: string | null; // الحقل المخصص
  attendees?: unknown;
  meetingNumber?: string | null;
  createdByName?: string | null;
}): Promise<Buffer> {
  const companyKey = sanitize(data.company, "quraish");
  const colors = COMPANY_COLORS[companyKey as keyof typeof COMPANY_COLORS] ?? COMPANY_COLORS.quraish;

  const meetingNumber = sanitize(data.meetingNumber, "1447/0000");
  const hijriDate      = sanitize(data.hijriDate, "—");
  const dayOfWeek      = sanitize(data.dayOfWeek, "");
  const title          = sanitize(data.title, "بدون عنوان");
  const createdByName = data.createdByName ? sanitize(data.createdByName) : null;
  
  // معالجة الإدارة وحقل "أخرى"
  const department    = data.department ? sanitize(data.department) : null;
  const deptDisplay   = department === "other" && data.customDepartment 
    ? data.customDepartment 
    : (department ? (DEPT_MAP[department] ?? department) : null);

  const elements        = sanitizeArray(data.elements);
  const recommendations = sanitizeArray(data.recommendations);
  const attendees       = sanitizeArray(data.attendees);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><style>${getBaseCSS(colors.primary, colors.accent, colors.secondary)}</style></head>
<body><div class="page">
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">${companyKey === 'quraish' ? 'ق' : 'أ'}</div>
      <div class="company-name">${colors.name}</div>
    </div>
    <div class="doc-type">محضر اجتماع رسمي</div>
  </div>

  <div class="info-bar">
    <span>اليوم: ${dayOfWeek}</span>
    <span>التاريخ: ${hijriDate} هـ</span>
    <span>المرجع: ${meetingNumber}</span>
  </div>

  <div class="content">
    <div class="section-header">بيانات الاجتماع</div>
    <div style="border: 1px solid #eee; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
        <div class="data-row"><span class="data-label">الموضوع</span><span class="data-value">${title}</span></div>
        ${deptDisplay ? `<div class="data-row"><span class="data-label">الإدارة</span><span class="data-value">${deptDisplay}</span></div>` : ""}
    </div>

    ${elements.length > 0 ? `
    <div class="section-header">أجندة وعناصر الاجتماع</div>
    <table class="table"><tbody>
        ${elements.map((e, i) => `<tr><td><span class="item-num">${i+1}</span>${e}</td></tr>`).join("")}
    </tbody></table>` : ""}

    ${recommendations.length > 0 ? `
    <div style="margin-top: 25px;" class="section-header">التوصيات والقرارات</div>
    <div style="background: #fcfaff; border: 1px dashed ${colors.secondary}; padding: 15px; border-radius: 8px;">
        ${recommendations.map(r => `<p style="margin-bottom:8px;">• ${r}</p>`).join("")}
    </div>` : ""}

    ${createdByName ? `
    <div class="signature-area">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${createdByName}</div>
        <div style="font-size:10px; color:#666;">مُعد المحضر</div>
      </div>
    </div>` : ""}
  </div>

  <div class="footer">
    <span>حجاً مبروراً وسعياً مشكوراً</span>
    <span>نظام التوثيق - ${colors.name}</span>
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
  const hijriDate      = sanitize(data.hijriDate, "—");
  const axis           = sanitize(data.axis, "—");
  const track          = sanitize(data.track, "—");
  const criterion      = sanitize(data.criterion, "—");
  const createdByName = data.createdByName ? sanitize(data.createdByName) : null;

  const rawScore = Number(data.score);
  const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, rawScore)) : 0;
  const scoreColor = score >= 70 ? "#1a9e3a" : score >= 50 ? "#e6981a" : "#d32f2f";
  const notes = data.notes ? sanitize(data.notes).replace(/\n/g, "<br>") : null;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><style>${getBaseCSS(colors.primary, colors.accent, colors.secondary)}</style></head>
<body><div class="page">
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ت</div>
      <div class="company-name">${colors.name}</div>
    </div>
    <div class="doc-type">تقرير تقييم الأداء</div>
  </div>

  <div class="info-bar">
    <span>التاريخ: ${hijriDate} هـ</span>
    <span>الرقم المرجعي: ${reportNumber}</span>
  </div>

  <div class="content">
    <div class="section-header">بيانات التقييم</div>
    <div style="border: 1px solid #eee; padding: 15px; border-radius: 6px;">
        <div class="data-row"><span class="data-label">المحور</span><span class="data-value">${axis}</span></div>
        <div class="data-row"><span class="data-label">المسار</span><span class="data-value">${track}</span></div>
        <div class="data-row"><span class="data-label">المعيار</span><span class="data-value">${criterion}</span></div>
    </div>

    <div class="score-box">
      <div>
        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">النتيجة الإجمالية</div>
        <div class="score-number" style="color:${scoreColor}">${score}%</div>
      </div>
      <div style="flex: 1; padding-right: 40px;">
        <div style="font-size:14px; font-weight:700; color:${scoreColor}">${score >= 70 ? "أداء متميز" : score >= 50 ? "أداء جيد" : "يحتاج تطوير"}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${score}%; background:${scoreColor}"></div>
        </div>
      </div>
    </div>

    ${notes ? `
    <div class="section-header">الملاحظات</div>
    <div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:6px; font-size:12px;">${notes}</div>` : ""}
  </div>

  <div class="footer">
    <span>${colors.name} | قسم الجودة</span>
    <span>نظام التوثيق - 2026</span>
  </div>
</div></body></html>`;

  return htmlToPdfBuffer(html);
}

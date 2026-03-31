/**
 * خدمة توليد PDF احترافية
 * تستخدم puppeteer-core و @sparticuz/chromium للعمل في بيئات Production (Vercel, Render, Railway)
 * تدعم اللغة العربية و RTL بشكل كامل
 * تدعم الرفع التلقائي إلى Google Drive
 */
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { uploadPdfDirectly } from "./googleDrive";

// إنشاء browser مشترك (singleton) لتقليل استهلاك الذاكرة
let browserInstance: any = null;

async function getBrowser() {
  // إذا كان هناك نسخة تعمل مسبقاً، اختبرها وأعد استخدامها
  if (browserInstance) {
    try {
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }

  // إعدادات التشغيل الخاصة بالبيئات السحابية (تتجاوز قيود المسارات والصلاحيات)
  browserInstance = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  return browserInstance;
}

// ألوان الهوية البصرية للشركات
const COMPANY_COLORS = {
  quraish: { primary: "#1a4a8a", accent: "#e6981a", name: "شركة قريش المحدودة" },
  azan:    { primary: "#1a5c3a", accent: "#c8a820", name: "شركة أذان المحدودة" },
};

// خريطة أسماء الإدارات بالعربية
const DEPT_MAP: Record<string, string> = {
  technology:  "إدارة التقنية",
  catering:    "إدارة الإعاشة",
  transport:   "إدارة النقل",
  cultural:    "الإدارة الثقافية",
  media:       "الإدارة الإعلامية",
  supervisors: "إدارة المشرفين",
};

// ===== CSS مشترك لجميع ملفات PDF =====
function getBaseCSS(primaryColor: string, accentColor: string): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: 'Arial', sans-serif; direction: rtl; }
    body { background: #f5f5f5; padding: 20px; }
    .page {
      background: white;
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      direction: rtl;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px;
      background: linear-gradient(90deg, ${primaryColor}, ${accentColor});
      color: white;
      position: relative;
    }
    .header-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .logo-image {
      width: 60px;
      height: 60px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: ${primaryColor};
    }
    .logo-number {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
    }
    .header-right {
      text-align: center;
      flex: 1;
    }
    .company-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .doc-type { font-size: 14px; opacity: 0.9; }
    .header-left { flex: 1; }
    .accent-bar {
      height: 4px;
      background: ${accentColor};
    }
    .info-bar {
      background: #f9f9f9;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
      border-bottom: 1px solid #eee;
    }
    .content {
      padding: 24px 20px;
      line-height: 1.8;
      color: #333;
    }
    .meeting-title {
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 20px;
      text-align: center;
      padding: 12px;
      background: #f0f0f0;
      border-right: 4px solid ${accentColor};
    }
    .section {
      margin-bottom: 20px;
    }
    .section-header {
      font-size: 13px;
      font-weight: bold;
      color: white;
      background: ${primaryColor};
      padding: 10px 12px;
      margin-bottom: 8px;
      border-radius: 4px;
    }
    .section-body {
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .row {
      display: flex;
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      font-size: 11px;
      align-items: flex-start;
    }
    .row:last-child { border-bottom: none; }
    .row-num {
      min-width: 24px;
      font-weight: bold;
      color: ${accentColor};
      margin-left: 12px;
    }
    .row-text { flex: 1; }
    .attendees-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px;
    }
    .attendee-cell {
      padding: 8px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 10px;
      text-align: center;
    }
    .score-display {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 16px 0;
    }
    .progress-bar {
      width: 100%;
      height: 24px;
      background: #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      margin: 12px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #1a9e3a, #4caf50);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
    .notes-box {
      background: #fafafa;
      border-right: 3px solid ${accentColor};
      padding: 12px;
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.6;
      margin: 12px 0;
    }
    .footer {
      background: #f0f0f0;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #ddd;
      margin-top: 24px;
      color: rgba(255,255,255,0.85);
      padding: 10px 28px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
    }
    .signature-area {
      margin-top: 24px;
      padding-top: 8px;
      display: flex;
      justify-content: flex-end;
      gap: 60px;
    }
    .signature-block { text-align: center; }
    .signature-line { width: 120px; border-top: 1px solid #aaa; margin-bottom: 6px; }
    .signature-name { font-size: 10px; color: #555; }
    .signature-role { font-size: 9px; color: #aaa; }
  `;
}

// ===== توليد PDF المحضر =====
export async function generateMeetingPdf(data: {
  id: number;
  title: string;
  hijriDate: string;
  dayOfWeek: string;
  elements: string;
  recommendations: string;
  attendees: string[];
  company: string;
  department?: string;
  meetingNumber?: string;
  createdByName?: string;
}): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;
  const deptLabel = data.department ? (DEPT_MAP[data.department] || data.department) : "";
  const elements = (data.elements || "").split("\n").filter(e => e.trim());
  const recs = (data.recommendations || "").split("\n").filter(r => r.trim());
  const attendees = (data.attendees || []).filter(a => a.trim());

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent)}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ق</div>
      <div class="logo-number">${data.meetingNumber || "1447/0001"}</div>
    </div>
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">محضر اجتماع</div>
    </div>
    <div class="header-left">
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="info-bar">
    <span>${data.dayOfWeek}  |  ${data.hijriDate}</span>
    ${deptLabel ? `<span>${deptLabel}</span>` : ""}
  </div>

  <div class="content">
    <div class="meeting-title">${data.title || "—"}</div>

    ${elements.length > 0 ? `
    <div class="section">
      <div class="section-header">عناصر الاجتماع</div>
      <div class="section-body">
        ${elements.map((item, i) => `
          <div class="row">
            <span class="row-num">${i + 1}</span>
            <span class="row-text">${item}</span>
          </div>`).join("")}
      </div>
    </div>` : ""}

    ${recs.length > 0 ? `
    <div class="section">
      <div class="section-header">التوصيات</div>
      <div class="section-body">
        ${recs.map((rec, i) => `
          <div class="row">
            <span class="row-num">${i + 1}</span>
            <span class="row-text">${rec}</span>
          </div>`).join("")}
      </div>
    </div>` : ""}

    ${attendees.length > 0 ? `
    <div class="section">
      <div class="section-header">الحضور</div>
      <div class="section-body">
        <div class="attendees-grid">
          ${attendees.map(att => `<div class="attendee-cell">${att}</div>`).join("")}
        </div>
      </div>
    </div>` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${data.createdByName}</div>
        <div class="signature-role">المُعِد</div>
      </div>
    </div>` : ""}
  </div>

  <div class="footer">
    <span>${colors.name}  |  نظام التوثيق</span>
    <span>${new Date().toLocaleDateString("ar-SA")}</span>
  </div>
</div>
</body>
</html>`;

  const pdfBuffer = await renderHtmlToPdf(html);
  
  // رفع PDF إلى Google Drive تلقائياً
  const fileName = `محضر_${data.hijriDate}_${data.title?.slice(0, 20) || 'بدون_عنوان'}.pdf`;
  uploadPdfDirectly(pdfBuffer, fileName, 'meeting');
  
  return pdfBuffer;
}

// ===== توليد PDF تقرير التقييم =====
export async function generateEvaluationPdf(data: {
  id: number;
  reportNumber: string;
  company: string;
  hijriDate: string;
  dayOfWeek: string;
  axis: string;
  track: string;
  criterion: string;
  score: number;
  notes: string;
  createdByName?: string;
}): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;
  const scoreColor = data.score >= 70 ? "#1a9e3a" : data.score >= 50 ? "#e6981a" : "#d32f2f";
  const progressPct = Math.min(100, Math.max(0, data.score));

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent)}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ق</div>
      <div class="logo-number">${data.reportNumber}</div>
    </div>
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم</div>
    </div>
    <div class="header-left">
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="info-bar">
    <span>${data.dayOfWeek}  |  ${data.hijriDate}</span>
  </div>

  <div class="content">
    <div class="meeting-title">تقرير التقييم</div>

    <div class="section">
      <div class="section-header">معلومات التقييم</div>
      <div class="section-body">
        <div class="row">
          <span class="row-num">1</span>
          <span class="row-text"><strong>المحور:</strong> ${data.axis}</span>
        </div>
        <div class="row">
          <span class="row-num">2</span>
          <span class="row-text"><strong>المسار:</strong> ${data.track}</span>
        </div>
        <div class="row">
          <span class="row-num">3</span>
          <span class="row-text"><strong>المعيار:</strong> ${data.criterion}</span>
        </div>
      </div>
    </div>

    <div class="score-display" style="color: ${scoreColor};">
      الدرجة: ${data.score}/100
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progressPct}%; background: ${scoreColor};">
        ${progressPct.toFixed(0)}%
      </div>
    </div>

    ${data.notes ? `
    <div class="section">
      <div class="section-header">الملاحظات</div>
      <div class="notes-box">${data.notes}</div>
    </div>` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${data.createdByName}</div>
        <div class="signature-role">المُقيِّم</div>
      </div>
    </div>` : ""}
  </div>

  <div class="footer">
    <span>${colors.name}  |  نظام التوثيق</span>
    <span>${new Date().toLocaleDateString("ar-SA")}</span>
  </div>
</div>
</body>
</html>`;
  const pdfBuffer = await renderHtmlToPdf(html);
  
  // رفع PDF إلى Google Drive تلقائياً
  const fileName = `تقرير_${data.reportNumber}_${data.axis?.slice(0, 15) || 'بدون_محور'}.pdf`;
  uploadPdfDirectly(pdfBuffer, fileName, 'evaluation');
  
  return pdfBuffer;
}

// ===== دالة مساعدة مشتركة =====
async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
    });
    return pdf;
  } finally {
    await page.close();
  }
}

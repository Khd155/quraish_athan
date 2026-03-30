/**
 * خدمة توليد PDF باستخدام Puppeteer (الإصدار المطور)
 * يدعم العربية وRTL بشكل كامل عبر HTML/CSS
 * تم التعديل لحل مشكلة مسار الكروم (executablePath) تلقائياً
 */
import puppeteer from "puppeteer";

/**
 * دالة ذكية لتحديد مسار المتصفح
 * تحاول البحث في متغيرات البيئة أولاً، ثم المسارات الشائعة في نظام لینوكس
 */
const getExecutablePath = () => {
  // 1. التحقق من متغيرات البيئة المخصصة (إذا كانت معرفة)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  // 2. إذا لم توجد، نترك Puppeteer يحاول التشغيل تلقائياً من المسار الافتراضي
  // ملاحظة: إذا كنت على Replit، يفضل تنفيذ: npx puppeteer browsers install chrome
  return undefined; 
};

// إنشاء browser مشترك (singleton) لضمان كفاءة الأداء
let browserInstance: any = null;

async function getBrowser() {
  if (browserInstance) {
    try {
      // التحقق مما إذا كان المتصفح لا يزال يعمل
      await browserInstance.version();
      return browserInstance;
    } catch {
      // إذا تعطل المتصفح، نقوم بإعادة تعيينه
      browserInstance = null;
    }
  }

  // تشغيل المتصفح بإعدادات متوافقة مع الخوادم (No Sandbox)
  browserInstance = await puppeteer.launch({
    executablePath: getExecutablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  });
  return browserInstance;
}

// ألوان وهويات الشركات
const COMPANY_COLORS = {
  quraish: { primary: "#1a4a8a", accent: "#e6981a", name: "شركة قريش المحدودة" },
  azan:    { primary: "#1a5c3a", accent: "#c8a820", name: "شركة أذان المحدودة" },
};

// خريطة الإدارات للمحاضر
const DEPT_MAP: Record<string, string> = {
  technology:  "إدارة التقنية",
  catering:    "إدارة الإعاشة",
  transport:   "إدارة النقل",
  cultural:    "الإدارة الثقافية",
  media:       "الإدارة الإعلامية",
  supervisors: "إدارة المشرفين",
};

// CSS الأساسي لتنسيق الملفات باللغة العربية
function getBaseCSS(primary: string, accent: string): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      text-align: right;
      color: #222;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }
    .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
    .header {
      background: ${primary};
      color: white;
      padding: 18px 28px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-right { text-align: right; }
    .header-left  { text-align: left; font-size: 11px; opacity: 0.85; }
    .company-name { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
    .doc-type     { font-size: 12px; opacity: 0.85; }
    .accent-bar   { height: 5px; background: ${accent}; }
    .info-bar {
      background: #f0f4fa;
      border-right: 4px solid ${accent};
      padding: 10px 20px;
      margin: 18px 28px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: ${primary};
      font-weight: 600;
      border-radius: 4px;
    }
    .content { padding: 18px 28px; }
    .meeting-title {
      font-size: 17px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 2.5px solid ${accent};
    }
    .section { margin-top: 18px; }
    .section-header {
      background: ${primary};
      color: white;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px 4px 0 0;
    }
    .section-body { border: 1px solid #dde4f0; border-top: none; border-radius: 0 0 4px 4px; }
    .row {
      padding: 8px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border-bottom: 1px solid #eef1f8;
    }
    .row:last-child { border-bottom: none; }
    .row:nth-child(even) { background: #f7f9fd; }
    .row-num {
      color: ${accent};
      font-weight: 700;
      font-size: 11px;
      min-width: 20px;
      text-align: center;
      flex-shrink: 0;
    }
    .row-text { flex: 1; font-size: 12px; }
    .attendees-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .attendee-cell {
      padding: 7px 14px;
      font-size: 12px;
      border-bottom: 1px solid #eef1f8;
      border-left: 1px solid #eef1f8;
    }
    .attendee-cell:nth-child(odd) { border-left: none; }
    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid #eef1f8;
    }
    .data-row:last-child { border-bottom: none; }
    .data-row:nth-child(even) { background: #f7f9fd; }
    .data-label { font-size: 10px; color: #888; font-weight: 600; }
    .data-value { font-size: 12px; font-weight: 600; color: #222; max-width: 70%; text-align: right; }
    .score-box {
      background: #f7f9fd;
      border-right: 4px solid ${accent};
      padding: 16px 20px;
      margin: 18px 0;
      display: flex;
      align-items: center;
      gap: 20px;
      border-radius: 0 4px 4px 0;
    }
    .score-number { font-size: 48px; font-weight: 700; line-height: 1; }
    .score-label  { font-size: 11px; color: #888; margin-bottom: 4px; }
    .score-info   { flex: 1; }
    .progress-bar { height: 8px; background: #dde4f0; border-radius: 4px; margin-top: 8px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; }
    .footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: ${primary};
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
export async function generateMeetingPdf(data: any): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;
  const deptLabel = data.department ? (DEPT_MAP[data.department] || data.department) : "";
  const elements = (data.elements || "").split("\n").filter((e: string) => e.trim());
  const recs = (data.recommendations || "").split("\n").filter((r: string) => r.trim());
  const attendees = (data.attendees || []).filter((a: string) => a.trim());

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent)}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">محضر اجتماع</div>
    </div>
    <div class="header-left">
      ${data.meetingNumber ? `<div>رقم: ${data.meetingNumber}</div>` : ""}
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
        ${elements.map((item: string, i: number) => `
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
        ${recs.map((rec: string, i: number) => `
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
          ${attendees.map((att: string) => `<div class="attendee-cell">${att}</div>`).join("")}
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

  return renderHtmlToPdf(html);
}

// ===== توليد PDF تقرير التقيية =====
export async function generateEvaluationPdf(data: any): Promise<Buffer> {
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
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم الأداء</div>
    </div>
    <div class="header-left">
      <div>رقم: ${data.reportNumber}</div>
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="info-bar">
    <span>${data.dayOfWeek}  |  ${data.hijriDate}</span>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">بيانات التقييم</div>
      <div class="section-body">
        <div class="data-row">
          <span class="data-label">المحور</span>
          <span class="data-value">${data.axis || "—"}</span>
        </div>
        <div class="data-row">
          <span class="data-label">المسار</span>
          <span class="data-value">${data.track || "—"}</span>
        </div>
        <div class="data-row">
          <span class="data-label">المعيار</span>
          <span class="data-value">${data.criterion || "—"}</span>
        </div>
      </div>
    </div>

    <div class="score-box">
      <div>
        <div class="score-label">الدرجة المحققة</div>
        <div class="score-number" style="color:${scoreColor}">${data.score}</div>
        <div style="font-size:11px;color:#888">من 100</div>
      </div>
      <div class="score-info">
        <div style="font-size:12px;font-weight:600;color:${scoreColor}">
          ${data.score >= 70 ? "ممتاز" : data.score >= 50 ? "جيد" : "يحتاج تحسين"}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progressPct}%;background:${scoreColor}"></div>
        </div>
      </div>
    </div>

    ${data.notes ? `
    <div class="section">
      <div class="section-header">الملاحظات</div>
      <div class="section-body">
        <div style="padding:12px 14px;font-size:12px;line-height:1.8">${data.notes.replace(/\n/g, "<br>")}</div>
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

  return renderHtmlToPdf(html);
}

// ===== دالة التوليد المشتركة (تنسيق HTML إلى PDF) =====
async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

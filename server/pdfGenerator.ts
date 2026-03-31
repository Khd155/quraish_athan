/**
 * خدمة توليد PDF عبر Google Apps Script
 * يرسل HTML إلى Google Apps Script الذي يحوله إلى PDF ويحفظه في Google Drive
 * يدعم العربية وRTL بشكل كامل
 */
import axios from "axios";

// رابط Google Apps Script
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbzwym4kfmdQbknzPHmuJxNU7PsJSDT0j-S8GosiF3WQpPGZnXvA0cSKa7HtscVrFkgnWQ/exec";

// ألوان الشركتين
const COMPANY_COLORS = {
  quraish: { primary: "#1a4a8a", accent: "#e6981a", name: "شركة قريش المحدودة" },
  azan:    { primary: "#1a5c3a", accent: "#c8a820", name: "شركة أذان المحدودة" },
};

// خريطة الإدارات
const DEPT_MAP: Record<string, string> = {
  technology:  "إدارة التقنية",
  catering:    "إدارة الإعاشة",
  transport:   "إدارة النقل",
  cultural:    "الإدارة الثقافية",
  media:       "الإدارة الإعلامية",
  supervisors: "إدارة المشرفين",
  registration: "التسجيل",
  mina_preparation: "تجهيز منى",
  arafat_preparation: "تجهيز عرفات",
  muzdalifah_preparation: "تجهيز مزدلفة",
  quality: "الجودة",
  other: "أخرى",
};

// روابط الشعارات
const COMPANY_LOGOS = {
  quraish: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/شعار-قريش-1_17ec4ed1.png",
  azan: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/شعار-أذان-1_6264f9ba.png",
};

// CSS المشترك لجميع ملفات PDF
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
      align-items: flex-start;
    }
    .header-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      min-width: 100px;
    }
    .logo-image {
      width: 70px;
      height: 70px;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: ${primary};
      font-size: 18px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .logo-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .logo-number {
      font-size: 11px;
      font-weight: 700;
      color: white;
      background: rgba(0,0,0,0.2);
      padding: 4px 8px;
      border-radius: 3px;
    }
    .header-right {
      flex: 1;
      text-align: right;
      padding-right: 20px;
    }
    .company-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .doc-type {
      font-size: 14px;
      font-weight: 600;
      opacity: 0.95;
    }
    .header-left { flex: 1; }
    .accent-bar { height: 4px; background: ${accent}; }
    .info-bar {
      background: #f5f5f5;
      padding: 10px 28px;
      font-size: 11px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .content {
      padding: 28px;
      min-height: 400px;
    }
    .section {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .section-header {
      background: ${primary};
      color: white;
      padding: 10px 14px;
      font-weight: 600;
      font-size: 12px;
    }
    .section-body {
      padding: 12px 14px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .data-row:last-child { border-bottom: none; }
    .data-label {
      font-weight: 600;
      color: #555;
      min-width: 100px;
    }
    .data-value {
      color: #222;
      text-align: left;
      flex: 1;
    }
    .score-box {
      background: #f9f9f9;
      border: 2px solid ${accent};
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .score-label {
      font-size: 11px;
      color: #666;
      margin-bottom: 4px;
    }
    .score-number {
      font-size: 36px;
      font-weight: 700;
      margin: 4px 0;
    }
    .score-info {
      flex: 1;
      padding-right: 20px;
    }
    .progress-bar {
      height: 8px;
      background: #ddd;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    .table th {
      background: ${primary};
      color: white;
      padding: 10px;
      text-align: right;
      font-weight: 600;
      font-size: 11px;
    }
    .table td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }
    .table tr:nth-child(even) { background: #f9f9f9; }
    .signature-area {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .signature-block {
      display: inline-block;
      text-align: center;
      min-width: 150px;
    }
    .signature-line {
      border-top: 1px solid #222;
      margin-bottom: 4px;
      width: 150px;
    }
    .signature-name {
      font-weight: 600;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .signature-role {
      font-size: 10px;
      color: #666;
    }
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: #f5f5f5;
      padding: 8px 28px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #666;
    }
  `;
}

// ===== توليد PDF محضر الاجتماع =====
export async function generateMeetingPdf(data: {
  id: number;
  company: string;
  hijriDate: string;
  dayOfWeek: string;
  title: string;
  elements: string[];
  recommendations: string[];
  department?: string;
  attendees: string[];
  meetingNumber: string;
  createdByName?: string;
}): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;

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
      <div class="logo-image">
        <img src="${COMPANY_LOGOS[data.company as keyof typeof COMPANY_LOGOS]}" alt="logo" />
      </div>
      <div class="logo-number">${data.meetingNumber || "1447/0000"}</div>
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
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">معلومات الاجتماع</div>
      <div class="section-body">
        <div class="data-row">
          <span class="data-label">العنوان</span>
          <span class="data-value">${data.title || "—"}</span>
        </div>
        ${data.department ? `
        <div class="data-row">
          <span class="data-label">الإدارة</span>
          <span class="data-value">${DEPT_MAP[data.department] || data.department}</span>
        </div>` : ""}
      </div>
    </div>

    ${data.elements && data.elements.length > 0 ? `
    <div class="section">
      <div class="section-header">عناصر الاجتماع</div>
      <div class="section-body">
        <table class="table">
          <tbody>
            ${data.elements.map((elem, idx) => `
            <tr>
              <td style="width: 30px; text-align: center;">${idx + 1}</td>
              <td>${elem}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>` : ""}

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="section">
      <div class="section-header">التوصيات</div>
      <div class="section-body">
        <table class="table">
          <tbody>
            ${data.recommendations.map((rec, idx) => `
            <tr>
              <td style="width: 30px; text-align: center;">${idx + 1}</td>
              <td>${rec}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>` : ""}

    ${data.attendees && data.attendees.length > 0 ? `
    <div class="section">
      <div class="section-header">الحضور</div>
      <div class="section-body">
        <table class="table">
          <tbody>
            ${data.attendees.map((att, idx) => `
            <tr>
              <td style="width: 30px; text-align: center;">${idx + 1}</td>
              <td>${att}</td>
            </tr>`).join("")}
          </tbody>
        </table>
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

  return sendHtmlToGoogleAppsScript(html, `محضر_${data.meetingNumber || "1447-0000"}.pdf`);
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
      <div class="logo-image">
        <img src="${COMPANY_LOGOS[data.company as keyof typeof COMPANY_LOGOS]}" alt="logo" />
      </div>
      <div class="logo-number">${data.reportNumber || "1447/0001"}</div>
    </div>
    <div class="header-right">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم الأداء</div>
    </div>
    <div class="header-left">
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

  return sendHtmlToGoogleAppsScript(html, `تقرير_${data.reportNumber || "1447-0001"}.pdf`);
}

// ===== دالة الإرسال إلى Google Apps Script =====
async function sendHtmlToGoogleAppsScript(html: string, fileName: string): Promise<Buffer> {
  try {
    console.log(`📤 جاري إرسال HTML إلى Google Apps Script: ${fileName}`);

    const response = await axios.post(
      APPS_SCRIPT_URL,
      {
        html: html,
        fileName: fileName,
      },
      {
        timeout: 60000, // timeout 60 ثانية
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      console.log(`✅ تم توليد PDF بنجاح: ${fileName}`);
      console.log(`   رابط الملف: ${response.data.fileUrl}`);
      
      // تحميل الملف من Google Drive
      const pdfResponse = await axios.get(response.data.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      
      return Buffer.from(pdfResponse.data);
    } else {
      throw new Error(`فشل توليد PDF: ${response.data.error}`);
    }
  } catch (error: any) {
    console.error(`❌ خطأ في توليد PDF عبر Google Apps Script:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    throw new Error(
      `فشل توليد PDF: ${error.message || "خطأ في الاتصال بـ Google Apps Script"}`
    );
  }
}

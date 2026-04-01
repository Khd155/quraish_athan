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
};

// ألوان الهوية الجديدة
const BRAND_COLORS = {
  lavender: "#4A3382",      // الخزامي الرئيسي
  beige: "#CFB88F",         // البيج
  lightLavender: "#6B5CA6", // الخزامي الفاتح
};

// CSS المشترك لجميع ملفات PDF - تصميم فاخر جديد
function getBaseCSS(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      direction: rtl;
      text-align: right;
      color: #333;
      background: #fff;
      font-size: 13px;
      line-height: 1.8;
    }
    .page { 
      width: 210mm; 
      min-height: 297mm; 
      padding: 0; 
      position: relative;
      background: white;
    }
    
    /* ===== الهيدر الفاخر ===== */
    .header-top {
      text-align: center;
      padding: 16px 28px 8px;
      font-size: 12px;
      color: ${BRAND_COLORS.lavender};
      font-weight: 600;
      letter-spacing: 1px;
    }
    
    .header {
      background: white;
      padding: 24px 28px 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${BRAND_COLORS.beige};
    }
    
    .header-logo {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      min-width: 120px;
    }
    
    .logo-image {
      width: 50px;
      height: 50px;
      background: ${BRAND_COLORS.lavender};
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 20px;
    }
    
    .logo-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .logo-number {
      font-size: 11px;
      font-weight: 700;
      color: ${BRAND_COLORS.lavender};
    }
    
    .logo-name {
      font-size: 12px;
      font-weight: 600;
      color: #333;
    }
    
    .header-center {
      flex: 1;
      text-align: center;
      padding: 0 20px;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: 700;
      color: ${BRAND_COLORS.lavender};
      margin-bottom: 4px;
    }
    
    .doc-type {
      font-size: 13px;
      font-weight: 600;
      color: #555;
    }
    
    .header-right {
      text-align: left;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .header-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .header-label {
      font-size: 10px;
      font-weight: 700;
      color: ${BRAND_COLORS.lavender};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .header-value {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      border-bottom: 1px solid ${BRAND_COLORS.beige};
      padding-bottom: 4px;
    }
    
    /* ===== المحتوى ===== */
    .content {
      padding: 32px 28px;
      min-height: 400px;
    }
    
    .section {
      margin-bottom: 28px;
    }
    
    .section-header {
      background: white;
      color: ${BRAND_COLORS.lavender};
      padding: 12px 0;
      font-weight: 700;
      font-size: 13px;
      border-right: 6px solid ${BRAND_COLORS.beige};
      padding-right: 12px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-body {
      padding: 0;
    }
    
    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .data-row:last-child { border-bottom: none; }
    
    .data-label {
      font-weight: 700;
      color: ${BRAND_COLORS.lavender};
      min-width: 120px;
      font-size: 12px;
    }
    
    .data-value {
      color: #333;
      text-align: left;
      flex: 1;
      padding-right: 20px;
    }
    
    /* ===== الجداول المحسّنة ===== */
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    
    .table th {
      background: ${BRAND_COLORS.lightLavender};
      color: white;
      padding: 12px;
      text-align: right;
      font-weight: 700;
      font-size: 11px;
      border-bottom: 2px solid ${BRAND_COLORS.beige};
    }
    
    .table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 12px;
    }
    
    .table tr:nth-child(even) { 
      background: #fafafa;
    }
    
    .table tr:hover {
      background: #f5f5f5;
    }
    
    /* ===== أرقام التسلسل في مربعات ملونة ===== */
    .item-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: ${BRAND_COLORS.beige};
      color: white;
      font-weight: 700;
      font-size: 12px;
      border-radius: 3px;
      margin-left: 8px;
    }
    
    .score-box {
      background: linear-gradient(135deg, #f9f7fc 0%, #f5f3fa 100%);
      border: 2px solid ${BRAND_COLORS.beige};
      border-radius: 6px;
      padding: 24px;
      margin: 24px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .score-label {
      font-size: 11px;
      color: ${BRAND_COLORS.lavender};
      margin-bottom: 6px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .score-number {
      font-size: 42px;
      font-weight: 700;
      margin: 4px 0;
      color: ${BRAND_COLORS.lavender};
    }
    
    .score-info {
      flex: 1;
      padding-right: 24px;
    }
    
    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 12px;
    }
    
    .progress-fill {
      height: 100%;
      transition: width 0.3s;
      background: ${BRAND_COLORS.lavender};
    }
    
    /* ===== التوقيع ===== */
    .signature-area {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #ddd;
    }
    
    .signature-block {
      display: inline-block;
      text-align: center;
      min-width: 160px;
    }
    
    .signature-line {
      border-top: 2px solid #333;
      margin-bottom: 6px;
      width: 160px;
    }
    
    .signature-name {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 2px;
      color: #333;
    }
    
    .signature-role {
      font-size: 11px;
      color: ${BRAND_COLORS.lavender};
      font-weight: 600;
    }
    
    /* ===== التذييل الفاخر ===== */
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: white;
      padding: 12px 28px;
      border-top: 2px solid ${BRAND_COLORS.beige};
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: ${BRAND_COLORS.lavender};
      font-weight: 600;
    }
    
    .footer-left {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .footer-official-text {
      font-style: italic;
      color: #999;
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
  <style>${getBaseCSS()}</style>
</head>
<body>
<div class="page">
  <div class="header-top">بسم الله الرحمن الرحيم</div>
  
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ق</div>
      <div class="logo-text">
        <div class="logo-number">${data.meetingNumber || "1447/0000"}</div>
        <div class="logo-name">${colors.name}</div>
      </div>
    </div>
    <div class="header-center">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">محضر اجتماع</div>
    </div>
    <div class="header-right">
      <div class="header-field">
        <div class="header-label">رقم المرجع</div>
        <div class="header-value">${data.meetingNumber || "1447/0000"}</div>
      </div>
      <div class="header-field">
        <div class="header-label">نوع المستند</div>
        <div class="header-value">محضر اجتماع</div>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">معلومات الاجتماع</div>
      <div class="section-body">
        <div class="data-row">
          <span class="data-label">التاريخ الهجري</span>
          <span class="data-value">${data.hijriDate || "—"}</span>
        </div>
        <div class="data-row">
          <span class="data-label">اليوم</span>
          <span class="data-value">${data.dayOfWeek || "—"}</span>
        </div>
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
              <td><span class="item-number">${idx + 1}</span></td>
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
              <td><span class="item-number">${idx + 1}</span></td>
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
              <td><span class="item-number">${idx + 1}</span></td>
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
    <div class="footer-left">
      <span>${colors.name}</span>
      <span>|</span>
      <span>نظام التوثيق والمتابعة</span>
      <span>|</span>
      <span class="footer-official-text">حجاً مبروراً وسعياً مشكوراً</span>
    </div>
    <span>صفحة 1 من 1</span>
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
  <style>${getBaseCSS()}</style>
</head>
<body>
<div class="page">
  <div class="header-top">بسم الله الرحمن الرحيم</div>
  
  <div class="header">
    <div class="header-logo">
      <div class="logo-image">ق</div>
      <div class="logo-text">
        <div class="logo-number">${data.reportNumber || "1447/0001"}</div>
        <div class="logo-name">${colors.name}</div>
      </div>
    </div>
    <div class="header-center">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم الأداء</div>
    </div>
    <div class="header-right">
      <div class="header-field">
        <div class="header-label">رقم المرجع</div>
        <div class="header-value">${data.reportNumber || "1447/0001"}</div>
      </div>
      <div class="header-field">
        <div class="header-label">نوع المستند</div>
        <div class="header-value">تقرير تقييم</div>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-header">بيانات التقييم</div>
      <div class="section-body">
        <div class="data-row">
          <span class="data-label">التاريخ الهجري</span>
          <span class="data-value">${data.hijriDate || "—"}</span>
        </div>
        <div class="data-row">
          <span class="data-label">اليوم</span>
          <span class="data-value">${data.dayOfWeek || "—"}</span>
        </div>
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
        <div style="font-size:12px;font-weight:700;color:${scoreColor}">
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
        <div style="padding:12px 0;font-size:12px;line-height:1.8;color:#333">${data.notes.replace(/\n/g, "<br>")}</div>
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
    <div class="footer-left">
      <span>${colors.name}</span>
      <span>|</span>
      <span>نظام التوثيق والمتابعة</span>
      <span>|</span>
      <span class="footer-official-text">حجاً مبروراً وسعياً مشكوراً</span>
    </div>
    <span>صفحة 1 من 1</span>
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
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

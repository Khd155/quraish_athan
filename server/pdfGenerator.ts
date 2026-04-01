/**
 * خدمة توليد PDF عبر Google Apps Script
 * تصميم نهائي يطابق ملف PDF المرجعي بدقة
 * خط Tajawal مضمّن كـ Base64 لضمان الظهور الصحيح
 */
import axios from "axios";

// رابط Google Apps Script
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbzwym4kfmdQbknzPHmuJxNU7PsJSDT0j-S8GosiF3WQpPGZnXvA0cSKa7HtscVrFkgnWQ/exec";

// ألوان الهوية الرسمية 2026
const COMPANY_COLORS = {
  quraish: { 
    primary: "#4A3382",   // الخزامي الرئيسي
    accent: "#CFB88F",    // البيج الذهبي
    light: "#6B5CA6",     // الخزامي الفاتح
    secondary: "#f5f5f5", // الرمادي الفاتح
    name: "شركة قريش المحدودة",
    logo: "https://manus-storage.oss-cn-beijing.aliyuncs.com/user-file/e0e13e5e-e285-4ddd-b0e5-4be32ef3e7e0.png"
  },
  azan: { 
    primary: "#1a5c3a", 
    accent: "#c8a820",
    light: "#2d8a5e",
    secondary: "#f5f5f5",
    name: "شركة أذان المحدودة",
    logo: "https://manus-storage.oss-cn-beijing.aliyuncs.com/user-file/4b7d3a4e-5c6f-4e8a-9b2d-1f3e5a7c9d0b.png"
  },
};

// خريطة الإدارات
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

// خطوط Tajawal مضمّنة كـ Base64
const TAJAWAL_REGULAR_B64 = "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";
const TAJAWAL_BOLD_B64 = "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";

// CSS المشترك - تصميم مطابق للملف المرجعي
function getBaseCSS(primary: string, accent: string, light: string, secondary: string): string {
  return `
    @font-face {
      font-family: 'Tajawal';
      font-style: normal;
      font-weight: 400;
      src: url(data:font/woff2;base64,${TAJAWAL_REGULAR_B64}) format('woff2');
    }
    @font-face {
      font-family: 'Tajawal';
      font-style: normal;
      font-weight: 700;
      src: url(data:font/woff2;base64,${TAJAWAL_BOLD_B64}) format('woff2');
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #333;
      background: #fff;
      font-size: 13px;
      line-height: 1.7;
    }
    
    .page { 
      width: 210mm; 
      min-height: 297mm; 
      padding: 0; 
      position: relative; 
      padding-bottom: 50px;
    }
    
    /* ===== البسملة ===== */
    .besmalah {
      text-align: center;
      padding: 12px 0 6px 0;
      font-size: 13px;
      color: ${primary};
      font-weight: 400;
      letter-spacing: 1px;
    }
    
    /* ===== الهيدر - تصميم ثلاثي الأعمدة ===== */
    .header {
      background: white;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${accent};
      min-height: 140px;
    }
    
    /* العمود الأيسر - حقول الملء */
    .header-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-right: 20px;
    }
    
    .header-field {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #333;
    }
    
    .header-field-label {
      font-weight: 600;
      color: #333;
      min-width: 60px;
    }
    
    .header-field-line {
      flex: 1;
      border-bottom: 1px solid ${accent};
      height: 1px;
    }
    
    /* العمود الأوسط - الشعار والاسم */
    .header-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
    }
    
    .logo-box {
      width: 60px; 
      height: 60px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: flex; 
      align-items: center; 
      justify-content: center;
      overflow: hidden;
    }
    
    .logo-box img {
      width: 55px;
      height: 55px;
      object-fit: contain;
    }
    
    .logo-letter {
      color: ${primary}; 
      font-size: 28px; 
      font-weight: 700;
    }
    
    .company-name { 
      font-size: 18px; 
      font-weight: 700; 
      color: ${primary};
      text-align: center;
      line-height: 1.3;
    }
    
    .doc-type { 
      font-size: 11px; 
      color: #666;
      text-align: center;
      margin-top: 2px;
    }
    
    /* العمود الأيمن - معلومات المملكة والصندوق الأزرق */
    .header-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      padding-left: 20px;
    }
    
    .header-kingdom {
      text-align: right;
      font-size: 13px;
      line-height: 1.4;
      color: #333;
    }
    
    .kingdom-line {
      font-weight: 600;
      color: ${primary};
    }
    
    .ref-box {
      background: #1a5c7a;
      color: white;
      padding: 8px 16px;
      border-radius: 3px;
      min-width: 140px;
      text-align: center;
      margin-top: 8px;
    }
    
    .ref-number {
      font-size: 12px;
      font-weight: 700;
      color: white;
      text-align: center;
    }

    /* ===== شريط المعلومات ===== */
    .info-bar {
      background: #f8f8f8;
      padding: 10px 40px;
      font-size: 12px;
      display: flex; 
      justify-content: space-between;
      align-items: center;
      border-right: 5px solid ${accent};
      border-bottom: 1px solid #e0e0e0;
    }
    
    .info-date {
      color: ${primary};
      font-weight: 700;
      font-size: 13px;
    }
    
    .info-dept {
      background: #f0f0f0;
      padding: 4px 14px;
      border-radius: 3px;
      color: #333;
      font-weight: 600;
      font-size: 12px;
    }

    /* ===== المحتوى ===== */
    .content { 
      padding: 25px 40px 40px 40px; 
    }
    
    .main-title {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      color: #222;
      margin: 20px 0 30px 0;
      line-height: 1.5;
    }
    
    /* ===== رؤوس الأقسام ===== */
    .section-header {
      background: ${primary};
      color: white;
      padding: 10px 18px;
      margin-bottom: 0;
      margin-top: 25px;
      font-weight: 700;
      font-size: 14px;
      border-radius: 0;
    }

    /* ===== العناصر المرقمة ===== */
    .items-list {
      width: 100%;
      margin-bottom: 0;
    }
    
    .item-row {
      display: flex;
      align-items: center;
      padding: 12px 18px;
      border-bottom: 1px solid #e8e8e8;
      gap: 14px;
    }
    
    .item-row:last-child {
      border-bottom: none;
    }
    
    .item-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #f0f0f0;
      color: #333;
      border-radius: 4px;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
    }
    
    .item-text {
      flex: 1;
      font-size: 13px;
      line-height: 1.6;
    }

    /* ===== جدول الحضور ===== */
    .attendees-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      width: 100%;
    }
    
    .attendee-cell {
      width: 50%;
      padding: 10px 18px;
      border-bottom: 1px solid #e8e8e8;
      font-size: 13px;
    }
    
    .attendee-cell:nth-child(odd) {
      border-left: 1px solid #e8e8e8;
    }
    
    .attendee-cell:nth-child(1),
    .attendee-cell:nth-child(2) {
      background: ${secondary};
    }

    /* ===== التوقيع ===== */
    .signature-area {
      margin-top: 35px;
      padding-top: 10px;
    }
    
    .sig-block {
      display: inline-block;
    }
    
    .sig-line {
      border-top: 1.5px solid #555;
      width: 130px;
      margin-bottom: 6px;
    }
    
    .sig-name {
      font-weight: 700;
      font-size: 12px;
      color: #333;
    }
    
    .sig-role {
      font-size: 10px;
      color: #888;
    }

    /* ===== التذييل ===== */
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      border-top: 1px solid #ddd;
      padding: 10px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #777;
    }
    
    .footer-right {
      font-weight: 600;
      color: #555;
    }
    
    .footer-left {
      color: #999;
    }

    /* ===== جداول التقييم ===== */
    .eval-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 0; 
    }
    
    .eval-table td {
      padding: 12px 18px; 
      border-bottom: 1px solid #e8e8e8;
      font-size: 13px;
    }
    
    .eval-table .label-cell {
      font-weight: 700;
      color: ${primary};
      width: 120px;
    }

    /* ===== صندوق الدرجة ===== */
    .score-box {
      padding: 25px;
      border: 2px solid ${accent};
      border-radius: 8px;
      text-align: center;
      margin: 15px 0 25px 0;
    }
    
    .score-value {
      font-size: 42px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 4px;
    }
    
    .score-label {
      font-size: 12px;
      color: #888;
      margin-bottom: 15px;
    }
    
    .progress-bar {
      background: #e8e8e8;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 5px;
    }

    /* ===== ملاحظات ===== */
    .notes-box {
      padding: 15px 18px;
      background: ${secondary};
      border-right: 4px solid ${accent};
      margin: 15px 0 25px 0;
      line-height: 1.8;
      font-size: 13px;
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
  department: string;
  customDepartment?: string;
  elements?: string[];
  recommendations?: string[];
  attendees?: string[];
  createdByName?: string;
  meetingNumber?: string;
}): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;
  
  const departmentDisplay = data.customDepartment 
    ? data.customDepartment 
    : (DEPT_MAP[data.department as string] || data.department || "\u2014");

  const dayDate = [data.dayOfWeek, data.hijriDate].filter(Boolean).join(" | ");
  const todayGregorian = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent, colors.light, colors.secondary)}</style>
</head>
<body>
<div class="page">
  <div class="besmalah">\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645</div>
  
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">
        <img src="${colors.logo}" alt="logo" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=logo-letter>\u0642</span>'" />
      </div>
      <div class="header-info">
        <div class="company-name">${colors.name}</div>
        <div class="doc-type">\u0645\u062D\u0636\u0631 \u0627\u062C\u062A\u0645\u0627\u0639</div>
      </div>
    </div>
    <div class="ref-box">
      <div class="ref-number">${data.meetingNumber || "1447/0001"}</div>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-date">${dayDate || "\u2014"}</div>
    <div class="info-dept">${departmentDisplay}</div>
  </div>

  <div class="content">
    <div class="main-title">${data.title || "\u0645\u062D\u0636\u0631 \u0627\u062C\u062A\u0645\u0627\u0639"}</div>

    ${data.elements && data.elements.length > 0 ? `
    <div class="section-header">\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639</div>
    <div class="items-list">
      ${data.elements.map((elem: string, idx: number) => `
      <div class="item-row">
        <span class="item-number">${idx + 1}</span>
        <span class="item-text">${elem}</span>
      </div>`).join("")}
    </div>
    ` : ""}

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="section-header">\u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A</div>
    <div class="items-list">
      ${data.recommendations.map((rec: string, idx: number) => `
      <div class="item-row">
        <span class="item-number">${idx + 1}</span>
        <span class="item-text">${rec}</span>
      </div>`).join("")}
    </div>
    ` : ""}

    ${data.attendees && data.attendees.length > 0 ? `
    <div class="section-header">\u0627\u0644\u062D\u0636\u0648\u0631</div>
    <div class="attendees-grid">
      ${data.attendees.map((att: string) => `
      <div class="attendee-cell">${att}</div>`).join("")}
    </div>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div class="sig-role">\u0645\u064F\u0639\u062F \u0627\u0644\u0645\u062D\u0636\u0631</div>
      </div>
    </div>
    ` : ""}
  </div>

  <div class="footer">
    <span class="footer-right">${colors.name} | \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0648\u062B\u064A\u0642</span>
    <span class="footer-left">${todayGregorian}</span>
  </div>
</div>
</body>
</html>`;

  return sendHtmlToGoogleAppsScript(html, `\u0645\u062D\u0636\u0631_${data.meetingNumber || "1447-0000"}.pdf`);
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
  const scoreColor = data.score >= 70 ? "#1a9e3a" : data.score >= 50 ? colors.accent : "#d32f2f";
  const progressPct = Math.min(100, Math.max(0, data.score));
  const todayGregorian = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent, colors.light, colors.secondary)}</style>
</head>
<body>
<div class="page">
  <div class="besmalah">\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645</div>
  
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">
        <img src="${colors.logo}" alt="logo" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=logo-letter>\u0642</span>'" />
      </div>
      <div class="header-info">
        <div class="company-name">${colors.name}</div>
        <div class="doc-type">\u062A\u0642\u0631\u064A\u0631 \u062A\u0642\u064A\u064A\u0645</div>
      </div>
    </div>
    <div class="ref-box">
      <div class="ref-number">${data.reportNumber || "1447/0001"}</div>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-date">${data.hijriDate || "\u2014"}</div>
    <div class="info-dept">\u0642\u0633\u0645 \u0627\u0644\u062C\u0648\u062F\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0627\u0644\u0645\u0624\u0633\u0633\u064A</div>
  </div>

  <div class="content">
    <div class="main-title">\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645</div>

    <div class="section-header">\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645</div>
    <table class="eval-table">
      <tbody>
        <tr>
          <td class="label-cell">\u0627\u0644\u0645\u062D\u0648\u0631:</td>
          <td>${data.axis || "\u2014"}</td>
        </tr>
        <tr>
          <td class="label-cell">\u0627\u0644\u0645\u0633\u0627\u0631:</td>
          <td>${data.track || "\u2014"}</td>
        </tr>
        <tr>
          <td class="label-cell">\u0627\u0644\u0645\u0639\u064A\u0627\u0631:</td>
          <td>${data.criterion || "\u2014"}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-header">\u0627\u0644\u0646\u062A\u064A\u062C\u0629</div>
    <div class="score-box">
      <div class="score-value" style="color: ${scoreColor};">${data.score}</div>
      <div class="score-label">\u0645\u0646 100</div>
      <div class="progress-bar">
        <div class="progress-fill" style="background: ${scoreColor}; width: ${progressPct}%;"></div>
      </div>
    </div>

    ${data.notes ? `
    <div class="section-header">\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A</div>
    <div class="notes-box">${data.notes}</div>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div class="sig-role">\u0645\u0639\u062F \u0627\u0644\u062A\u0642\u0631\u064A\u0631</div>
      </div>
    </div>
    ` : ""}
  </div>

  <div class="footer">
    <span class="footer-right">${colors.name} | \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0648\u062B\u064A\u0642</span>
    <span class="footer-left">${todayGregorian}</span>
  </div>
</div>
</body>
</html>`;

  return sendHtmlToGoogleAppsScript(html, `\u062A\u0642\u0631\u064A\u0631_${data.reportNumber || "1447-0001"}.pdf`);
}

// ===== دالة الإرسال إلى Google Apps Script =====
async function sendHtmlToGoogleAppsScript(html: string, fileName: string): Promise<Buffer> {
  try {
    console.log(`\uD83D\uDCE4 جاري إرسال HTML إلى Google Apps Script: ${fileName}`);

    const response = await axios.post(
      APPS_SCRIPT_URL,
      {
        html: html,
        fileName: fileName,
      },
      {
        timeout: 60000, 
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      console.log(`\u2705 تم توليد PDF بنجاح: ${fileName}`);
      
      const pdfResponse = await axios.get(response.data.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      
      return Buffer.from(pdfResponse.data);
    } else {
      throw new Error(response.data.error || "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F PDF");
    }
  } catch (error: any) {
    console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0648\u0644\u064A\u062F PDF: ${error.message}`);
    throw error;
  }
}

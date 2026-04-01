/**
 * خدمة توليد PDF عبر Google Apps Script
 * تصميم جديد يطابق ملف PDF المرجعي - هيدر أزرق، حدود برتقالية، جداول محسّنة
 */
import axios from "axios";

// رابط Google Apps Script
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbzwym4kfmdQbknzPHmuJxNU7PsJSDT0j-S8GosiF3WQpPGZnXvA0cSKa7HtscVrFkgnWQ/exec";

// ألوان التصميم الجديد (بناءً على ملف PDF المرجعي)
const COMPANY_COLORS = {
  quraish: { 
    primary: "#4A3382",   // الخزامي الرئيسي (الهيدر والتذييل)
    accent: "#CFB88F",    // البيج الذهبي (الحدود والتمييز)
    secondary: "#f5f5f5", // الرمادي الفاتح (خلفيات الصفوف)
    name: "شركة قريش المحدودة" 
  },
  azan: { 
    primary: "#1a5c3a", 
    accent: "#c8a820", 
    secondary: "#f5f5f5",
    name: "شركة أذان المحدودة" 
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

// CSS المشترك - تصميم جديد يطابق ملف PDF المرجعي
function getBaseCSS(primary: string, accent: string, secondary: string): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Trebuchet MS', 'Tahoma', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      color: #333;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }
    .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
    
    /* ===== خطوط العناوين ===== */
    h1, h2, h3, .company-name, .section-header {
      font-family: 'Verdana', 'Tahoma', sans-serif;
      font-weight: bold;
    }
    
    /* ===== البسملة ===== */
    .besmalah {
      text-align: center;
      padding: 10px 0;
      font-size: 12px;
      color: ${primary};
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    /* ===== الهيدر ===== */
    .header {
      background: ${primary};
      color: white;
      padding: 20px 45px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-logo { 
      display: flex; 
      align-items: center; 
      gap: 12px;
      flex: 1;
    }
    
    .logo-box {
      width: 50px; 
      height: 50px;
      background: white;
      border-radius: 4px;
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: ${primary}; 
      font-size: 24px; 
      font-weight: bold;
    }
    
    .header-center {
      display: none;
    }
    
    .company-name { 
      font-size: 14px; 
      font-weight: 700; 
      color: white;
      margin-bottom: 0;
    }
    
    .doc-type { 
      font-size: 11px; 
      font-weight: 600; 
      color: white;
      opacity: 0.9;
    }
    
    .header-right {
      text-align: left;
    }
    
    .header-field {
      margin-bottom: 8px;
    }
    
    .header-label {
      font-size: 10px;
      opacity: 0.8;
    }
    
    .header-value {
      font-size: 14px;
      font-weight: 700;
    }

    /* ===== شريط المعلومات ===== */
    .info-bar {
      background: #f5f5f5;
      padding: 12px 45px;
      font-size: 12px;
      display: flex; 
      justify-content: space-between;
      align-items: center;
      border-right: 4px solid ${accent};
    }
    
    .info-bar-left {
      color: ${primary};
      font-weight: 600;
    }
    
    .info-bar-right {
      color: ${primary};
      font-weight: 600;
    }

    /* ===== المحتوى ===== */
    .content { 
      padding: 30px 45px; 
      min-height: 400px; 
    }
    
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${accent};
    }
    
    /* ===== رؤوس الأقسام ===== */
    .section-header {
      background: ${primary};
      color: white;
      padding: 12px 15px;
      margin-bottom: 15px;
      margin-top: 20px;
      font-weight: 700;
      font-size: 13px;
    }

    /* ===== الجداول ===== */
    .data-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 25px; 
      background: white;
    }
    
    .data-table th {
      background: ${primary};
      color: white;
      padding: 12px 15px; 
      text-align: right; 
      font-weight: 700;
      font-size: 12px;
      border: 1px solid #ddd;
    }
    
    .data-table td {
      padding: 12px 15px; 
      border: 1px solid #ddd;
      text-align: right;
    }
    
    .data-table tr:nth-child(even) { 
      background: ${secondary};
    }
    
    .data-table tr:hover {
      background: #efefef;
    }

    /* ===== أرقام التسلسل ===== */
    .item-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: ${accent};
      color: white;
      border-radius: 3px;
      font-weight: 700;
      font-size: 11px;
    }

    /* ===== التوقيع ===== */
    .signature-area {
      margin-top: 40px;
      padding-top: 30px;
      display: flex;
      justify-content: flex-end;
      gap: 60px;
    }
    
    .sig-block {
      text-align: center;
      min-width: 140px;
    }
    
    .sig-line {
      border-top: 2px solid #333;
      margin-bottom: 8px;
      width: 140px;
    }
    
    .sig-name {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 2px;
    }
    
    .sig-role {
      font-size: 10px;
      color: #666;
    }

    /* ===== التذييل الأزرق ===== */
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: ${primary};
      color: white;
      padding: 12px 45px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
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
    : (DEPT_MAP[data.department as string] || data.department || "—");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent, colors.secondary)}</style>
</head>
<body>
<div class="page">
  <!-- البسملة -->
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  
  <!-- الهيدر -->
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">ق</div>
      <div>
        <div style="font-size: 14px; font-weight: 700;">${colors.name}</div>
        <div style="font-size: 11px; opacity: 0.9;">محضر اجتماع</div>
      </div>
    </div>
    <div class="header-center">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">محضر اجتماع</div>
    </div>
    <div class="header-right">
      <div class="header-field">
        <div class="header-label">رقم المرجع</div>
        <div class="header-value">${data.meetingNumber || "1447/0001"}</div>
      </div>
    </div>
  </div>

  <!-- شريط المعلومات -->
  <div class="info-bar">
    <div class="info-bar-left">${departmentDisplay}</div>
    <div class="info-bar-right">التاريخ | ${data.hijriDate || "—"}</div>
  </div>

  <!-- المحتوى -->
  <div class="content">
    <div class="title">${data.title || "محضر اجتماع"}</div>

    ${data.elements && data.elements.length > 0 ? `
    <div class="section-header">عناصر الاجتماع</div>
    <table class="data-table">
      <tbody>
        ${data.elements.map((elem, idx) => `
        <tr>
          <td><span class="item-number">${idx + 1}</span></td>
          <td>${elem}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ` : ""}

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="section-header">التوصيات</div>
    <table class="data-table">
      <tbody>
        ${data.recommendations.map((rec, idx) => `
        <tr>
          <td><span class="item-number">${idx + 1}</span></td>
          <td>${rec}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ` : ""}

    ${data.attendees && data.attendees.length > 0 ? `
    <div class="section-header">الحضور</div>
    <table class="data-table">
      <tbody>
        ${data.attendees.map((att, idx) => `
        <tr>
          <td><span class="item-number">${idx + 1}</span></td>
          <td>${att}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div class="sig-role">مُعد المحضر</div>
      </div>
    </div>
    ` : ""}
  </div>

  <!-- التذييل الأزرق -->
  <div class="footer">
    <span>نظام التوثيق الذكي - ${colors.name}</span>
    <span>${data.hijriDate || "—"}</span>
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
  const scoreColor = data.score >= 70 ? "#1a9e3a" : data.score >= 50 ? colors.accent : "#d32f2f";
  const progressPct = Math.min(100, Math.max(0, data.score));

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>${getBaseCSS(colors.primary, colors.accent, colors.secondary)}</style>
</head>
<body>
<div class="page">
  <!-- البسملة -->
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  
  <!-- الهيدر -->
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">ق</div>
      <div>
        <div style="font-size: 14px; font-weight: 700;">${colors.name}</div>
        <div style="font-size: 11px; opacity: 0.9;">تقرير تقييم</div>
      </div>
    </div>
    <div class="header-center">
      <div class="company-name">${colors.name}</div>
      <div class="doc-type">تقرير تقييم</div>
    </div>
    <div class="header-right">
      <div class="header-field">
        <div class="header-label">رقم التقرير</div>
        <div class="header-value">${data.reportNumber || "1447/0001"}</div>
      </div>
    </div>
  </div>

  <!-- شريط المعلومات -->
  <div class="info-bar">
    <div class="info-bar-left">قسم الجودة والتميز المؤسسي</div>
    <div class="info-bar-right">التاريخ | ${data.hijriDate || "—"}</div>
  </div>

  <!-- المحتوى -->
  <div class="content">
    <div class="title">تقرير التقييم</div>

    <div class="section-header">معلومات التقييم</div>
    <table class="data-table">
      <tbody>
        <tr>
          <td style="font-weight: 600;">المحور:</td>
          <td>${data.axis || "—"}</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">المسار:</td>
          <td>${data.track || "—"}</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">المعيار:</td>
          <td>${data.criterion || "—"}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-header">النتيجة</div>
    <div style="padding: 20px; background: white; border: 2px solid ${colors.accent}; border-radius: 4px; margin-bottom: 20px;">
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="font-size: 36px; font-weight: 700; color: ${scoreColor};">${data.score}</div>
        <div style="font-size: 12px; color: #666;">من 100</div>
      </div>
      <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: ${scoreColor}; height: 100%; width: ${progressPct}%; transition: width 0.3s;"></div>
      </div>
    </div>

    ${data.notes ? `
    <div class="section-header">الملاحظات</div>
    <div style="padding: 15px; background: #f5f5f5; border-right: 4px solid ${colors.accent}; margin-bottom: 20px;">
      ${data.notes}
    </div>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div class="sig-role">معد التقرير</div>
      </div>
    </div>
    ` : ""}
  </div>

  <!-- التذييل الأزرق -->
  <div class="footer">
    <span>نظام التوثيق الذكي - ${colors.name}</span>
    <span>${data.hijriDate || "—"}</span>
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
        timeout: 60000, 
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      console.log(`✅ تم توليد PDF بنجاح: ${fileName}`);
      
      const pdfResponse = await axios.get(response.data.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      
      return Buffer.from(pdfResponse.data);
    } else {
      throw new Error(response.data.error || "فشل توليد PDF");
    }
  } catch (error: any) {
    console.error(`❌ خطأ في توليد PDF: ${error.message}`);
    throw error;
  }
}

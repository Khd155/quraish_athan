/**
 * خدمة توليد PDF عبر Google Apps Script
 * تم تحديث التصميم بناءً على هوية شركة قريش 2026
 */
import axios from "axios";

// رابط Google Apps Script
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbzwym4kfmdQbknzPHmuJxNU7PsJSDT0j-S8GosiF3WQpPGZnXvA0cSKa7HtscVrFkgnWQ/exec";

// ألوان الهوية البصرية 2026
const COMPANY_COLORS = {
  quraish: { 
    primary: "#4A3382",   // الخزامي الرئيسي
    accent: "#CFB88F",    // البيج الذهبي
    secondary: "#6B5CA6", // الخزامي فاتح
    name: "شركة قريش المحدودة" 
  },
  azan: { 
    primary: "#1a5c3a", 
    accent: "#c8a820", 
    secondary: "#2d7a4d",
    name: "شركة أذان المحدودة" 
  },
};

// خريطة الإدارات المحدثة
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

// CSS المشترك بتصميم 2026
function getBaseCSS(primary: string, accent: string, secondary: string): string {
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
    .header-logo { display: flex; align-items: center; gap: 15px; }
    .logo-box {
      width: 60px; height: 60px;
      background: ${primary}; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 28px; font-weight: bold;
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

    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .data-table th {
      background: #fcfaff; color: ${primary};
      padding: 10px 15px; text-align: right; border: 1px solid ${secondary}33;
      width: 25%; font-size: 12px;
    }
    .data-table td {
      padding: 10px 15px; border: 1px solid ${secondary}33;
      font-size: 12px; color: #444;
    }

    .list-item { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
    .item-num {
      min-width: 22px; height: 22px; background: ${accent};
      color: white; border-radius: 4px; display: flex;
      align-items: center; justify-content: center; font-weight: bold; font-size: 11px;
    }

    .recommendations-box {
      background: #fcfaff; border: 1px dashed ${secondary};
      padding: 15px 20px; border-radius: 8px; margin-top: 10px;
    }

    .signature-area { margin-top: 50px; display: flex; justify-content: flex-end; }
    .sig-block { text-align: center; width: 180px; }
    .sig-line { border-top: 1px solid ${primary}; margin-bottom: 5px; }
    .sig-name { font-weight: 700; color: ${primary}; }

    .footer {
      position: absolute; bottom: 0; width: 100%;
      border-top: 1px solid ${accent}; padding: 12px 45px;
      display: flex; justify-content: space-between;
      font-size: 10px; color: ${primary}; font-weight: 600;
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
  customDepartment?: string;
  attendees: string[];
  meetingNumber: string;
  createdByName?: string;
}): Promise<Buffer> {
  const colors = COMPANY_COLORS[data.company as keyof typeof COMPANY_COLORS] || COMPANY_COLORS.quraish;
  
  const deptDisplay = data.department === "other" && data.customDepartment 
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
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">${data.company === 'quraish' ? 'ق' : 'أ'}</div>
      <div class="company-name">${colors.name}</div>
    </div>
    <div class="doc-type">محضر اجتماع رسمي</div>
  </div>

  <div class="info-bar">
    <span>اليوم: ${data.dayOfWeek}</span>
    <span>التاريخ: ${data.hijriDate} هـ</span>
    <span>المرجع: ${data.meetingNumber || "1447/0000"}</span>
  </div>

  <div class="content">
    <div class="section-header">بيانات الاجتماع الأساسية</div>
    <table class="data-table">
      <tr><th>موضوع الاجتماع</th><td>${data.title || "—"}</td></tr>
      <tr><th>الإدارة / القسم</th><td>${deptDisplay}</td></tr>
    </table>

    ${data.elements && data.elements.length > 0 ? `
    <div class="section-header">أجندة وعناصر الاجتماع</div>
    ${data.elements.map((e, i) => `
      <div class="list-item">
        <div class="item-num">${i + 1}</div>
        <div>${e}</div>
      </div>
    `).join("")}
    ` : ""}

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div style="margin-top:25px;" class="section-header">التوصيات والقرارات</div>
    <div class="recommendations-box">
      ${data.recommendations.map(r => `<p style="margin-bottom:6px;">• ${r}</p>`).join("")}
    </div>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div style="font-size:10px; color:#666;">مُعد المحضر</div>
      </div>
    </div>
    ` : ""}
  </div>

  <div class="footer">
    <span>حجاً مبروراً وسعياً مشكوراً</span>
    <span>نظام التوثيق الذكي - ${colors.name}</span>
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
  <style>${getBaseCSS(colors.primary, colors.accent, colors.secondary)}</style>
</head>
<body>
<div class="page">
  <div class="besmalah">بسم الله الرحمن الرحيم</div>
  <div class="header">
    <div class="header-logo">
      <div class="logo-box">ت</div>
      <div class="company-name">${colors.name}</div>
    </div>
    <div class="doc-type">تقرير تقييم الأداء</div>
  </div>

  <div class="info-bar">
    <span>التاريخ: ${data.hijriDate} هـ</span>
    <span>الرقم المرجعي: ${data.reportNumber || "1447/0001"}</span>
  </div>

  <div class="content">
    <div class="section-header">بيانات التقييم</div>
    <table class="data-table">
      <tr><th>المحور الأساسي</th><td>${data.axis || "—"}</td></tr>
      <tr><th>المسار التشغيلي</th><td>${data.track || "—"}</td></tr>
      <tr><th>المعيار المطبق</th><td>${data.criterion || "—"}</td></tr>
    </table>

    <div style="display:flex; align-items:center; gap:30px; margin:30px 0; background:#f9f9f9; padding:20px; border-radius:10px; border:1px solid ${colors.accent};">
      <div style="text-align:center;">
        <div style="font-size:11px; color:#666;">النتيجة النهائية</div>
        <div style="font-size:42px; font-weight:bold; color:${scoreColor};">${data.score}%</div>
      </div>
      <div style="flex:1;">
        <div style="height:12px; background:#ddd; border-radius:6px; overflow:hidden;">
          <div style="width:${progressPct}%; height:100%; background:${scoreColor};"></div>
        </div>
        <div style="margin-top:8px; font-weight:bold; color:${scoreColor}; font-size:14px;">
          ${data.score >= 70 ? "أداء متميز" : data.score >= 50 ? "أداء مرضٍ" : "يحتاج إلى تطوير"}
        </div>
      </div>
    </div>

    ${data.notes ? `
    <div class="section-header">الملاحظات والتوصيات</div>
    <div style="white-space:pre-wrap; padding:15px; background:#fff; border:1px solid #eee; border-radius:6px;">${data.notes}</div>
    ` : ""}

    ${data.createdByName ? `
    <div class="signature-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${data.createdByName}</div>
        <div style="font-size:10px; color:#666;">المُقيم المسؤول</div>
      </div>
    </div>
    ` : ""}
  </div>

  <div class="footer">
    <span>${colors.name} | قسم الجودة والتميز المؤسسي</span>
    <span>نظام التوثيق - 2026</span>
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
      throw new Error(`فشل توليد PDF: ${response.data.error}`);
    }
  } catch (error: any) {
    console.error(`❌ خطأ في الاتصال بـ Google Apps Script:`, error.message);
    throw new Error(`فشل توليد PDF: ${error.message}`);
  }
}

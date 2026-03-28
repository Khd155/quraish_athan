import puppeteer, { Browser } from "puppeteer";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

interface MeetingPDFData {
  company: string;
  hijriDate: string;
  dayOfWeek: string;
  title: string;
  objectives?: string | null;
  recommendations?: string | null;
  department?: string | null;
  attendees?: string[] | null;
  createdByName?: string | null;
  status: string;
  reportNumber: string;
}

interface EvaluationPDFData {
  company: string;
  hijriDate: string;
  dayOfWeek: string;
  axis: string;
  track: string;
  criterion: string;
  score?: number | null;
  notes?: string | null;
  reportNumber: string;
  createdByName?: string | null;
  status: string;
}

function getCompanyInfo(company: string) {
  const isQuraish = company === "quraish";
  return {
    name: isQuraish ? "شركة قريش المحدودة" : "شركة أذان المحدودة",
    logo: isQuraish
      ? "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/quraish-logo_1ecf0210.png"
      : "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/azan-logo_ef925323.png",
    color: isQuraish ? "#1a365d" : "#8b5a3c",
  };
}

function generateMeetingHTML(data: MeetingPDFData): string {
  const company = getCompanyInfo(data.company);
  const now = new Date();
  const printDate = now.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const attendeesList = data.attendees
    ?.map((att, i) => `<tr><td style="text-align: right; padding: 8px;">${i + 1}. ${att}</td></tr>`)
    .join("") || "";

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>محضر اجتماع</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Cairo', sans-serif;
          background: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          border-bottom: 3px solid ${company.color};
          padding-bottom: 20px;
        }
        .logo {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: ${company.color};
          margin-bottom: 5px;
        }
        .document-title {
          font-size: 18px;
          font-weight: 600;
          color: #666;
        }
        .section-title {
          background: #f0f4f8;
          padding: 12px 15px;
          font-size: 16px;
          font-weight: 600;
          color: ${company.color};
          margin-top: 20px;
          margin-bottom: 15px;
          border-right: 4px solid ${company.color};
        }
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        .field {
          display: flex;
          flex-direction: column;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: ${company.color};
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .field-value {
          font-size: 14px;
          color: #333;
          padding: 10px;
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          min-height: 30px;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background: ${company.color};
          color: white;
          padding: 12px;
          text-align: right;
          font-weight: 600;
          font-size: 13px;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        tr:hover {
          background: #f9f9f9;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-final {
          background: #d4edda;
          color: #155724;
        }
        .status-draft {
          background: #fff3cd;
          color: #856404;
        }
        .signature-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .signature-field {
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin: 30px 0 5px 0;
        }
        .signature-label {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <img src="${company.logo}" alt="شعار الشركة" class="logo">
          <div class="header-text">
            <div class="company-name">${company.name}</div>
            <div class="document-title">محضر اجتماع</div>
          </div>
        </div>

        <div class="section-title">بيانات الاجتماع</div>
        
        <div class="field-row">
          <div class="field">
            <label class="field-label">التاريخ الهجري</label>
            <div class="field-value">${data.hijriDate}</div>
          </div>
          <div class="field">
            <label class="field-label">اليوم</label>
            <div class="field-value">${data.dayOfWeek}</div>
          </div>
        </div>

        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">عنوان الاجتماع</label>
            <div class="field-value">${data.title}</div>
          </div>
        </div>

        ${
          data.department
            ? `
        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">الإدارة</label>
            <div class="field-value">${data.department}</div>
          </div>
        </div>
        `
            : ""
        }

        ${
          data.objectives
            ? `
        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">الأهداف</label>
            <div class="field-value" style="min-height: 60px; white-space: pre-wrap;">${data.objectives}</div>
          </div>
        </div>
        `
            : ""
        }

        ${
          data.recommendations
            ? `
        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">التوصيات</label>
            <div class="field-value" style="min-height: 60px; white-space: pre-wrap;">${data.recommendations}</div>
          </div>
        </div>
        `
            : ""
        }

        ${
          data.attendees && data.attendees.length > 0
            ? `
        <div class="section-title">الحضور</div>
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>
            ${attendeesList}
          </tbody>
        </table>
        `
            : ""
        }

        <div style="margin-top: 20px;">
          <span class="status-badge ${data.status === "final" ? "status-final" : "status-draft"}">
            ${data.status === "final" ? "معتمد" : "مسودة"}
          </span>
        </div>

        <div class="signature-box">
          <div class="signature-field">
            <div class="signature-line"></div>
            <div class="signature-label">التوقيع</div>
          </div>
          <div class="signature-field">
            <div class="signature-label">${data.createdByName || "—"}</div>
            <div class="signature-label">${printDate}</div>
          </div>
        </div>

        <div class="footer">
          <p>نظام التوثيق والمتابعة | وثيقة رسمية</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateEvaluationHTML(data: EvaluationPDFData): string {
  const company = getCompanyInfo(data.company);
  const now = new Date();
  const printDate = now.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scorePercentage = data.score ?? 0;
  const scoreColor =
    scorePercentage >= 70 ? "#22c55e" : scorePercentage >= 40 ? "#f59e0b" : "#ef4444";

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تقرير تقييم</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Cairo', sans-serif;
          background: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          border-bottom: 3px solid ${company.color};
          padding-bottom: 20px;
        }
        .logo {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }
        .header-text {
          flex: 1;
        }
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: ${company.color};
          margin-bottom: 5px;
        }
        .document-title {
          font-size: 18px;
          font-weight: 600;
          color: #666;
        }
        .section-title {
          background: #f0f4f8;
          padding: 12px 15px;
          font-size: 16px;
          font-weight: 600;
          color: ${company.color};
          margin-top: 20px;
          margin-bottom: 15px;
          border-right: 4px solid ${company.color};
        }
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        .field {
          display: flex;
          flex-direction: column;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: ${company.color};
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .field-value {
          font-size: 14px;
          color: #333;
          padding: 10px;
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          min-height: 30px;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        .score-container {
          margin: 20px 0;
        }
        .score-bar {
          width: 100%;
          height: 30px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .score-fill {
          height: 100%;
          background: ${scoreColor};
          width: ${scorePercentage}%;
          transition: width 0.3s ease;
        }
        .score-text {
          position: absolute;
          font-weight: 700;
          font-size: 14px;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-final {
          background: #d4edda;
          color: #155724;
        }
        .status-draft {
          background: #fff3cd;
          color: #856404;
        }
        .signature-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .signature-field {
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin: 30px 0 5px 0;
        }
        .signature-label {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <img src="${company.logo}" alt="شعار الشركة" class="logo">
          <div class="header-text">
            <div class="company-name">${company.name}</div>
            <div class="document-title">تقرير تقييم</div>
          </div>
        </div>

        <div class="section-title">بيانات التقرير</div>
        
        <div class="field-row">
          <div class="field">
            <label class="field-label">رقم التقرير</label>
            <div class="field-value">${data.reportNumber}</div>
          </div>
          <div class="field">
            <label class="field-label">التاريخ الهجري</label>
            <div class="field-value">${data.hijriDate}</div>
          </div>
        </div>

        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">اليوم</label>
            <div class="field-value">${data.dayOfWeek}</div>
          </div>
        </div>

        <div class="section-title">تفاصيل التقييم</div>

        <div class="field-row">
          <div class="field">
            <label class="field-label">المحور</label>
            <div class="field-value">${data.axis}</div>
          </div>
          <div class="field">
            <label class="field-label">المسار</label>
            <div class="field-value">${data.track}</div>
          </div>
        </div>

        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">المعيار</label>
            <div class="field-value">${data.criterion}</div>
          </div>
        </div>

        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">الدرجة</label>
            <div class="score-container">
              <div class="score-bar">
                <div class="score-fill"></div>
                <span class="score-text">${scorePercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        ${
          data.notes
            ? `
        <div class="field-row full-width">
          <div class="field">
            <label class="field-label">ملاحظات</label>
            <div class="field-value" style="min-height: 60px; white-space: pre-wrap;">${data.notes}</div>
          </div>
        </div>
        `
            : ""
        }

        <div style="margin-top: 20px;">
          <span class="status-badge ${data.status === "final" ? "status-final" : "status-draft"}">
            ${data.status === "final" ? "معتمد" : "مسودة"}
          </span>
        </div>

        <div class="signature-box">
          <div class="signature-field">
            <div class="signature-line"></div>
            <div class="signature-label">التوقيع</div>
          </div>
          <div class="signature-field">
            <div class="signature-label">${data.createdByName || "—"}</div>
            <div class="signature-label">${printDate}</div>
          </div>
        </div>

        <div class="footer">
          <p>نظام التوثيق والمتابعة | وثيقة رسمية</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateMeetingPDFV2(data: MeetingPDFData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = generateMeetingHTML(data);
    await page.setContent(html, { waitUntil: "networkidle2" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function generateEvaluationPDFV2(data: EvaluationPDFData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = generateEvaluationHTML(data);
    await page.setContent(html, { waitUntil: "networkidle2" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

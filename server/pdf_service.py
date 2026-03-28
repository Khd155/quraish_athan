#!/usr/bin/python
"""
خدمة توليد PDF باستخدام WeasyPrint مع دعم كامل للعربية
تعمل كـ HTTP server صغير على بورت 5050
"""
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from io import BytesIO
import weasyprint

QURAISH_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/quraish-logo_1ecf0210.png"
AZAN_LOGO    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/azan-logo_ef925323.png"

CAIRO_FONT_CSS = """
@font-face {
  font-family: 'Cairo';
  font-style: normal;
  font-weight: 400;
  src: url('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvalIhTp2mxdt0UX8.woff2') format('woff2');
}
@font-face {
  font-family: 'Cairo';
  font-style: normal;
  font-weight: 700;
  src: url('https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvamImBJ2KWaGh8A.woff2') format('woff2');
}
"""

def get_company_info(company: str) -> dict:
    is_quraish = company == "quraish"
    return {
        "name": "شركة قريش المحدودة" if is_quraish else "شركة أذان المحدودة",
        "logo": QURAISH_LOGO if is_quraish else AZAN_LOGO,
        "color": "#1a365d" if is_quraish else "#8b5a3c",
    }

def common_styles(color: str) -> str:
    return f"""
    {CAIRO_FONT_CSS}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Cairo', 'Arial', sans-serif;
      background: white;
      color: #333;
      line-height: 1.8;
      direction: rtl;
    }}
    .page {{
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      background: white;
    }}
    .header {{
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 25px;
      border-bottom: 3px solid {color};
      padding-bottom: 15px;
    }}
    .logo {{ width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }}
    .header-text {{ flex: 1; text-align: right; }}
    .company-name {{ font-size: 22px; font-weight: 700; color: {color}; margin-bottom: 4px; }}
    .document-title {{ font-size: 16px; font-weight: 600; color: #666; }}
    .section-title {{
      background: #f0f4f8;
      padding: 10px 15px;
      font-size: 15px;
      font-weight: 700;
      color: {color};
      margin-top: 20px;
      margin-bottom: 12px;
      border-right: 5px solid {color};
    }}
    .info-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }}
    .info-table td {{
      padding: 9px 12px;
      border: 1px solid #ddd;
      font-size: 13px;
      vertical-align: top;
    }}
    .info-table td.label {{
      background: #f8f9fa;
      font-weight: 700;
      color: {color};
      width: 25%;
      white-space: nowrap;
    }}
    .info-table td.value {{
      background: white;
      color: #333;
    }}
    .attendees-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }}
    .attendees-table th {{
      background: {color};
      color: white;
      padding: 10px 12px;
      text-align: right;
      font-size: 13px;
    }}
    .attendees-table td {{
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 13px;
    }}
    .attendees-table tr:nth-child(even) td {{ background: #f9f9f9; }}
    .status-badge {{
      display: inline-block;
      padding: 5px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
    }}
    .status-final {{ background: #d4edda; color: #155724; }}
    .status-draft {{ background: #fff3cd; color: #856404; }}
    .signature-section {{
      margin-top: 35px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
    }}
    .signature-box {{ text-align: center; width: 45%; }}
    .signature-line {{ border-top: 1px solid #333; margin: 35px 0 8px 0; }}
    .signature-label {{ font-size: 12px; color: #555; }}
    .footer {{
      margin-top: 25px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 11px;
      color: #999;
    }}
    .score-bar-outer {{
      width: 100%;
      height: 24px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }}
    .score-bar-inner {{
      height: 100%;
      border-radius: 4px;
    }}
    .score-text {{
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-weight: 700;
      font-size: 13px;
      color: white;
    }}
    """

def generate_meeting_html(data: dict) -> str:
    company = get_company_info(data.get("company", "quraish"))
    color = company["color"]
    
    from datetime import datetime
    now = datetime.now()
    print_date = now.strftime("%Y/%m/%d")
    
    attendees = data.get("attendees") or []
    attendees_html = ""
    if attendees:
        rows = "".join(
            f'<tr><td style="text-align:center; width:50px;">{i+1}</td><td>{att}</td></tr>'
            for i, att in enumerate(attendees)
        )
        attendees_html = f"""
        <div class="section-title">قائمة الحضور</div>
        <table class="attendees-table">
          <thead>
            <tr><th style="width:50px;">#</th><th>الاسم</th></tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        """

    status = data.get("status", "draft")
    status_label = "معتمد" if status == "final" else "مسودة"
    status_class = "status-final" if status == "final" else "status-draft"
    created_by = data.get("createdByName") or "—"

    objectives = data.get("objectives") or ""
    recommendations = data.get("recommendations") or ""
    department = data.get("department") or ""

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>محضر اجتماع</title>
  <style>{common_styles(color)}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="{company['logo']}" alt="شعار الشركة" class="logo">
    <div class="header-text">
      <div class="company-name">{company['name']}</div>
      <div class="document-title">محضر اجتماع</div>
    </div>
  </div>

  <div class="section-title">بيانات الاجتماع</div>
  <table class="info-table">
    <tr>
      <td class="label">التاريخ الهجري</td>
      <td class="value">{data.get('hijriDate', '')}</td>
      <td class="label">اليوم</td>
      <td class="value">{data.get('dayOfWeek', '')}</td>
    </tr>
    <tr>
      <td class="label">عنوان الاجتماع</td>
      <td class="value" colspan="3">{data.get('title', '')}</td>
    </tr>
    {"<tr><td class='label'>الإدارة</td><td class='value' colspan='3'>" + department + "</td></tr>" if department else ""}
    {"<tr><td class='label'>الأهداف</td><td class='value' colspan='3' style='white-space:pre-wrap;'>" + objectives + "</td></tr>" if objectives else ""}
    {"<tr><td class='label'>التوصيات</td><td class='value' colspan='3' style='white-space:pre-wrap;'>" + recommendations + "</td></tr>" if recommendations else ""}
  </table>

  {attendees_html}

  <div style="margin-top: 15px;">
    <span class="status-badge {status_class}">{status_label}</span>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">التوقيع</div>
    </div>
    <div class="signature-box">
      <div class="signature-label" style="font-weight:700; font-size:13px;">{created_by}</div>
      <div class="signature-label">تاريخ الطباعة: {print_date}</div>
    </div>
  </div>

  <div class="footer">
    <p>نظام التوثيق والمتابعة | {company['name']} | وثيقة رسمية</p>
  </div>
</div>
</body>
</html>"""


def generate_evaluation_html(data: dict) -> str:
    company = get_company_info(data.get("company", "quraish"))
    color = company["color"]
    
    from datetime import datetime
    now = datetime.now()
    print_date = now.strftime("%Y/%m/%d")

    score = data.get("score") or 0
    score_color = "#22c55e" if score >= 70 else ("#f59e0b" if score >= 40 else "#ef4444")
    notes = data.get("notes") or ""
    status = data.get("status", "draft")
    status_label = "معتمد" if status == "final" else "مسودة"
    status_class = "status-final" if status == "final" else "status-draft"
    created_by = data.get("createdByName") or "—"
    report_number = data.get("reportNumber") or "—"

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير تقييم</title>
  <style>{common_styles(color)}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="{company['logo']}" alt="شعار الشركة" class="logo">
    <div class="header-text">
      <div class="company-name">{company['name']}</div>
      <div class="document-title">تقرير تقييم</div>
    </div>
  </div>

  <div class="section-title">بيانات التقرير</div>
  <table class="info-table">
    <tr>
      <td class="label">رقم التقرير</td>
      <td class="value">{report_number}</td>
      <td class="label">التاريخ الهجري</td>
      <td class="value">{data.get('hijriDate', '')}</td>
    </tr>
    <tr>
      <td class="label">اليوم</td>
      <td class="value" colspan="3">{data.get('dayOfWeek', '')}</td>
    </tr>
  </table>

  <div class="section-title">تفاصيل التقييم</div>
  <table class="info-table">
    <tr>
      <td class="label">المحور</td>
      <td class="value" colspan="3">{data.get('axis', '')}</td>
    </tr>
    <tr>
      <td class="label">المسار</td>
      <td class="value" colspan="3">{data.get('track', '')}</td>
    </tr>
    <tr>
      <td class="label">المعيار</td>
      <td class="value" colspan="3">{data.get('criterion', '')}</td>
    </tr>
    <tr>
      <td class="label">الدرجة</td>
      <td class="value" colspan="3">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="score-bar-outer" style="flex:1; position:relative;">
            <div class="score-bar-inner" style="width:{score}%; background:{score_color};"></div>
            <span class="score-text">{score}%</span>
          </div>
          <span style="font-weight:700; font-size:16px; color:{score_color};">{score}%</span>
        </div>
      </td>
    </tr>
    {"<tr><td class='label'>ملاحظات</td><td class='value' colspan='3' style='white-space:pre-wrap;'>" + notes + "</td></tr>" if notes else ""}
  </table>

  <div style="margin-top: 15px;">
    <span class="status-badge {status_class}">{status_label}</span>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">التوقيع</div>
    </div>
    <div class="signature-box">
      <div class="signature-label" style="font-weight:700; font-size:13px;">{created_by}</div>
      <div class="signature-label">تاريخ الطباعة: {print_date}</div>
    </div>
  </div>

  <div class="footer">
    <p>نظام التوثيق والمتابعة | {company['name']} | وثيقة رسمية</p>
  </div>
</div>
</body>
</html>"""


class PDFHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            if self.path == '/pdf/meeting':
                html = generate_meeting_html(data)
            elif self.path == '/pdf/evaluation':
                html = generate_evaluation_html(data)
            else:
                self.send_response(404)
                self.end_headers()
                return

            pdf_bytes = weasyprint.HTML(string=html, base_url=None).write_pdf()

            self.send_response(200)
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Length', str(len(pdf_bytes)))
            self.end_headers()
            self.wfile.write(pdf_bytes)

        except Exception as e:
            error_msg = str(e).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(error_msg)))
            self.end_headers()
            self.wfile.write(error_msg)
            print(f"PDF Service Error: {e}", file=sys.stderr)


if __name__ == '__main__':
    port = 5050
    server = HTTPServer(('127.0.0.1', port), PDFHandler)
    print(f"PDF Service running on port {port}", flush=True)
    server.serve_forever()

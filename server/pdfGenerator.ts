/**
 * خدمة توليد PDF في Node.js مع دعم كامل للعربية وRTL
 * تستخدم مكتبة pdf-lib مع خط Cairo العربي المضمّن
 */
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CAIRO_FONT_BASE64 } from "./cairoFontBase64";

// ألوان
const COLOR_PRIMARY = rgb(0.1, 0.3, 0.6); // أزرق داكن
const COLOR_ACCENT = rgb(0.9, 0.6, 0.1);  // ذهبي
const COLOR_DARK = rgb(0.15, 0.15, 0.15);
const COLOR_GRAY = rgb(0.5, 0.5, 0.5);
const COLOR_LIGHT_BG = rgb(0.96, 0.97, 0.99);
const COLOR_WHITE = rgb(1, 1, 1);

// تحميل الخط من Base64 المضمّن (يعمل في Production بدون اتصال خارجي)
let cachedFontBytes: ArrayBuffer | null = null;
async function loadCairoFont(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  // الخط مضمّن مباشرة في الكود - لا حاجة لاتصال خارجي
  const buffer = Buffer.from(CAIRO_FONT_BASE64, 'base64');
  cachedFontBytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return cachedFontBytes;
}

// عكس النص العربي للـ pdf-lib (RTL)
function reverseArabic(text: string): string {
  if (!text) return "";
  // pdf-lib لا تدعم RTL مباشرة، نعكس الكلمات
  return text.split(" ").reverse().join(" ");
}

// رسم مستطيل ملوّن
function drawRect(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number, y: number, w: number, h: number,
  color: ReturnType<typeof rgb>
) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

// كتابة نص مع دعم RTL (نعكس الكلمات)
function drawText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  options: {
    x: number; y: number; size: number;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }
) {
  if (!text) return;
  const { x, y, size, font, color = COLOR_DARK, maxWidth } = options;
  const reversed = reverseArabic(text);
  if (maxWidth) {
    // تقطيع النص إذا كان طويلاً
    const words = reversed.split(" ");
    let line = "";
    let currentY = y;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        line = word;
        currentY -= size * 1.5;
      } else {
        line = testLine;
      }
    }
    if (line) page.drawText(line, { x, y: currentY, size, font, color });
  } else {
    page.drawText(reversed, { x, y, size, font, color });
  }
}

// حساب عرض النص
function textWidth(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number
): number {
  return font.widthOfTextAtSize(reverseArabic(text), size);
}

// رسم نص محاذى لليمين
function drawTextRight(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  options: {
    rightX: number; y: number; size: number;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }
) {
  if (!text) return;
  const { rightX, y, size, font, color = COLOR_DARK, maxWidth } = options;
  const reversed = reverseArabic(text);
  const w = font.widthOfTextAtSize(reversed, size);
  const x = rightX - w;
  if (maxWidth && w > maxWidth) {
    // تقطيع
    const words = reversed.split(" ");
    let line = "";
    let currentY = y;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const lineW = font.widthOfTextAtSize(testLine, size);
      if (lineW > maxWidth && line) {
        const lw = font.widthOfTextAtSize(line, size);
        page.drawText(line, { x: rightX - lw, y: currentY, size, font, color });
        line = word;
        currentY -= size * 1.6;
      } else {
        line = testLine;
      }
    }
    if (line) {
      const lw = font.widthOfTextAtSize(line, size);
      page.drawText(line, { x: rightX - lw, y: currentY, size, font, color });
    }
  } else {
    page.drawText(reversed, { x, y, size, font, color });
  }
}

// رسم خط أفقي
function drawLine(
  page: ReturnType<PDFDocument["addPage"]>,
  x1: number, y1: number, x2: number, y2: number,
  color: ReturnType<typeof rgb> = COLOR_GRAY,
  thickness = 0.5
) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
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
  const fontBytes = await loadCairoFont();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const arabicFont = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 45;
  const contentWidth = width - margin * 2;
  const rightEdge = width - margin;

  // ===== Header =====
  drawRect(page, 0, height - 80, width, 80, COLOR_PRIMARY);
  // شريط ذهبي
  drawRect(page, 0, height - 85, width, 5, COLOR_ACCENT);

  // عنوان الشركة
  const companyName = data.company === "quraish"
    ? "شركة قريش المحدودة"
    : "شركة أذان المحدودة";
  const companyW = textWidth(companyName, arabicFont, 18);
  page.drawText(reverseArabic(companyName), {
    x: rightEdge - companyW,
    y: height - 38,
    size: 18,
    font: arabicFont,
    color: COLOR_WHITE,
  });

  // "محضر اجتماع"
  const docTypeW = textWidth("محضر اجتماع", arabicFont, 12);
  page.drawText(reverseArabic("محضر اجتماع"), {
    x: rightEdge - docTypeW,
    y: height - 60,
    size: 12,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  // رقم المحضر
  if (data.meetingNumber) {
    const numText = `رقم: ${data.meetingNumber}`;
    page.drawText(reverseArabic(numText), {
      x: margin,
      y: height - 50,
      size: 10,
      font: arabicFont,
      color: rgb(0.85, 0.9, 1),
    });
  }

  // ===== Info Bar =====
  let y = height - 110;
  drawRect(page, margin, y - 5, contentWidth, 32, COLOR_LIGHT_BG);
  drawRect(page, margin, y - 5, 3, 32, COLOR_ACCENT);

  // التاريخ والقسم
  const dateText = `${data.dayOfWeek}  |  ${data.hijriDate}`;
  const dateW = textWidth(dateText, arabicFont, 10);
  page.drawText(reverseArabic(dateText), {
    x: rightEdge - dateW,
    y: y + 8,
    size: 10,
    font: arabicFont,
    color: COLOR_PRIMARY,
  });

  if (data.department) {
    const deptMap: Record<string, string> = {
      technology: "إدارة التقنية",
      catering: "إدارة الإعاشة",
      transport: "إدارة النقل",
      cultural: "الإدارة الثقافية",
      media: "الإدارة الإعلامية",
      supervisors: "إدارة المشرفين",
    };
    const deptLabel = deptMap[data.department] || data.department;
    page.drawText(reverseArabic(deptLabel), {
      x: margin + 10,
      y: y + 8,
      size: 10,
      font: arabicFont,
      color: COLOR_GRAY,
    });
  }

  // ===== عنوان الاجتماع =====
  y -= 45;
  const titleW = textWidth(data.title, arabicFont, 15);
  page.drawText(reverseArabic(data.title), {
    x: rightEdge - Math.min(titleW, contentWidth),
    y,
    size: 15,
    font: arabicFont,
    color: COLOR_DARK,
  });
  y -= 8;
  drawLine(page, margin, y, rightEdge, y, COLOR_ACCENT, 1.5);

  // ===== عناصر الاجتماع =====
  y -= 28;
  if (data.elements) {
    // عنوان القسم
    drawRect(page, margin, y - 3, contentWidth, 22, COLOR_PRIMARY);
    const secW = textWidth("عناصر الاجتماع", arabicFont, 11);
    page.drawText(reverseArabic("عناصر الاجتماع"), {
      x: rightEdge - secW,
      y: y + 4,
      size: 11,
      font: arabicFont,
      color: COLOR_WHITE,
    });
    y -= 28;

    const items = data.elements.split("\n").filter(e => e.trim());
    for (let i = 0; i < items.length; i++) {
      const item = items[i].trim();
      if (!item) continue;
      // خلفية متناوبة
      if (i % 2 === 0) {
        drawRect(page, margin, y - 4, contentWidth, 20, COLOR_LIGHT_BG);
      }
      // رقم البند
      page.drawText(String(i + 1), {
        x: margin + 5,
        y: y + 2,
        size: 9,
        font: arabicFont,
        color: COLOR_ACCENT,
      });
      // نص البند
      const itemW = textWidth(item, arabicFont, 10);
      const itemX = rightEdge - Math.min(itemW, contentWidth - 25);
      page.drawText(reverseArabic(item), {
        x: itemX,
        y: y + 2,
        size: 10,
        font: arabicFont,
        color: COLOR_DARK,
      });
      y -= 22;
      if (y < 100) break;
    }
  }

  // ===== التوصيات =====
  if (data.recommendations && y > 120) {
    y -= 15;
    drawRect(page, margin, y - 3, contentWidth, 22, COLOR_PRIMARY);
    const recW = textWidth("التوصيات", arabicFont, 11);
    page.drawText(reverseArabic("التوصيات"), {
      x: rightEdge - recW,
      y: y + 4,
      size: 11,
      font: arabicFont,
      color: COLOR_WHITE,
    });
    y -= 28;

    const recs = data.recommendations.split("\n").filter(r => r.trim());
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i].trim();
      if (!rec) continue;
      if (i % 2 === 0) {
        drawRect(page, margin, y - 4, contentWidth, 20, COLOR_LIGHT_BG);
      }
      page.drawText(String(i + 1), {
        x: margin + 5,
        y: y + 2,
        size: 9,
        font: arabicFont,
        color: COLOR_ACCENT,
      });
      const recW2 = textWidth(rec, arabicFont, 10);
      page.drawText(reverseArabic(rec), {
        x: rightEdge - Math.min(recW2, contentWidth - 25),
        y: y + 2,
        size: 10,
        font: arabicFont,
        color: COLOR_DARK,
      });
      y -= 22;
      if (y < 100) break;
    }
  }

  // ===== الحضور =====
  if (data.attendees?.length > 0 && y > 120) {
    y -= 15;
    drawRect(page, margin, y - 3, contentWidth, 22, COLOR_PRIMARY);
    const attW = textWidth("الحضور", arabicFont, 11);
    page.drawText(reverseArabic("الحضور"), {
      x: rightEdge - attW,
      y: y + 4,
      size: 11,
      font: arabicFont,
      color: COLOR_WHITE,
    });
    y -= 28;

    const validAttendees = data.attendees.filter(a => a.trim());
    const colW = contentWidth / 2 - 5;
    for (let i = 0; i < validAttendees.length; i += 2) {
      if (i % 4 === 0) {
        drawRect(page, margin, y - 4, contentWidth, 20, COLOR_LIGHT_BG);
      }
      const att1 = validAttendees[i];
      const att1W = textWidth(att1, arabicFont, 10);
      page.drawText(reverseArabic(att1), {
        x: rightEdge - Math.min(att1W, colW),
        y: y + 2,
        size: 10,
        font: arabicFont,
        color: COLOR_DARK,
      });
      if (validAttendees[i + 1]) {
        const att2 = validAttendees[i + 1];
        const att2W = textWidth(att2, arabicFont, 10);
        page.drawText(reverseArabic(att2), {
          x: margin + colW - Math.min(att2W, colW),
          y: y + 2,
          size: 10,
          font: arabicFont,
          color: COLOR_DARK,
        });
      }
      y -= 22;
      if (y < 100) break;
    }
  }

  // ===== Footer =====
  drawRect(page, 0, 0, width, 40, COLOR_PRIMARY);
  drawRect(page, 0, 40, width, 2, COLOR_ACCENT);

  const footerText = `${companyName}  |  نظام التوثيق`;
  const footerW = textWidth(footerText, arabicFont, 9);
  page.drawText(reverseArabic(footerText), {
    x: rightEdge - footerW,
    y: 15,
    size: 9,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  const dateFooter = new Date().toLocaleDateString("ar-SA");
  page.drawText(reverseArabic(dateFooter), {
    x: margin,
    y: 15,
    size: 9,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
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
  const fontBytes = await loadCairoFont();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const arabicFont = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const margin = 45;
  const contentWidth = width - margin * 2;
  const rightEdge = width - margin;

  // ===== Header =====
  drawRect(page, 0, height - 80, width, 80, COLOR_PRIMARY);
  drawRect(page, 0, height - 85, width, 5, COLOR_ACCENT);

  const companyName = data.company === "quraish"
    ? "شركة قريش المحدودة"
    : "شركة أذان المحدودة";
  const companyW = textWidth(companyName, arabicFont, 18);
  page.drawText(reverseArabic(companyName), {
    x: rightEdge - companyW,
    y: height - 38,
    size: 18,
    font: arabicFont,
    color: COLOR_WHITE,
  });

  const docTypeW = textWidth("تقرير تقييم الأداء", arabicFont, 12);
  page.drawText(reverseArabic("تقرير تقييم الأداء"), {
    x: rightEdge - docTypeW,
    y: height - 60,
    size: 12,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  // رقم التقرير
  page.drawText(reverseArabic(`رقم: ${data.reportNumber}`), {
    x: margin,
    y: height - 50,
    size: 10,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  // ===== Info Bar =====
  let y = height - 110;
  drawRect(page, margin, y - 5, contentWidth, 32, COLOR_LIGHT_BG);
  drawRect(page, margin, y - 5, 3, 32, COLOR_ACCENT);

  const dateText = `${data.dayOfWeek}  |  ${data.hijriDate}`;
  const dateW = textWidth(dateText, arabicFont, 10);
  page.drawText(reverseArabic(dateText), {
    x: rightEdge - dateW,
    y: y + 8,
    size: 10,
    font: arabicFont,
    color: COLOR_PRIMARY,
  });

  // ===== بيانات التقييم =====
  y -= 45;

  // دالة رسم صف بيانات
  const drawDataRow = (label: string, value: string, rowY: number, highlight = false) => {
    if (highlight) {
      drawRect(page, margin, rowY - 6, contentWidth, 26, COLOR_LIGHT_BG);
    }
    drawLine(page, margin, rowY - 6, rightEdge, rowY - 6, rgb(0.88, 0.9, 0.95));

    // القيمة (يمين)
    const valW = textWidth(value, arabicFont, 11);
    page.drawText(reverseArabic(value), {
      x: rightEdge - Math.min(valW, contentWidth * 0.65),
      y: rowY + 2,
      size: 11,
      font: arabicFont,
      color: COLOR_DARK,
    });
    // التسمية (يسار)
    page.drawText(reverseArabic(label), {
      x: margin + 5,
      y: rowY + 2,
      size: 9,
      font: arabicFont,
      color: COLOR_GRAY,
    });
  };

  // عنوان القسم
  drawRect(page, margin, y - 3, contentWidth, 22, COLOR_PRIMARY);
  const secW = textWidth("بيانات التقييم", arabicFont, 11);
  page.drawText(reverseArabic("بيانات التقييم"), {
    x: rightEdge - secW,
    y: y + 4,
    size: 11,
    font: arabicFont,
    color: COLOR_WHITE,
  });
  y -= 35;

  drawDataRow("المحور", data.axis, y, true);
  y -= 32;
  drawDataRow("المسار", data.track, y, false);
  y -= 32;
  drawDataRow("المعيار", data.criterion, y, true);
  y -= 50;

  // ===== الدرجة =====
  drawRect(page, margin, y - 10, contentWidth, 70, COLOR_LIGHT_BG);
  drawRect(page, margin, y - 10, 4, 70, COLOR_ACCENT);

  const scoreLabel = "الدرجة المحققة";
  const scoreLabelW = textWidth(scoreLabel, arabicFont, 11);
  page.drawText(reverseArabic(scoreLabel), {
    x: rightEdge - scoreLabelW,
    y: y + 35,
    size: 11,
    font: arabicFont,
    color: COLOR_GRAY,
  });

  // الدرجة الكبيرة
  const scoreText = `${data.score}`;
  const scoreW = textWidth(scoreText, arabicFont, 36);
  page.drawText(scoreText, {
    x: rightEdge - scoreW,
    y: y,
    size: 36,
    font: arabicFont,
    color: data.score >= 70 ? rgb(0.1, 0.6, 0.2) : data.score >= 50 ? COLOR_ACCENT : rgb(0.8, 0.2, 0.2),
  });

  // من 100
  page.drawText(reverseArabic("/ 100"), {
    x: margin + 10,
    y: y + 10,
    size: 14,
    font: arabicFont,
    color: COLOR_GRAY,
  });

  // شريط التقدم
  y -= 20;
  drawRect(page, margin, y, contentWidth, 8, rgb(0.88, 0.9, 0.95));
  const progressWidth = (data.score / 100) * contentWidth;
  const progressColor = data.score >= 70
    ? rgb(0.1, 0.6, 0.2)
    : data.score >= 50 ? COLOR_ACCENT : rgb(0.8, 0.2, 0.2);
  drawRect(page, margin, y, progressWidth, 8, progressColor);

  // ===== الملاحظات =====
  if (data.notes) {
    y -= 35;
    drawRect(page, margin, y - 3, contentWidth, 22, COLOR_PRIMARY);
    const notesW = textWidth("الملاحظات", arabicFont, 11);
    page.drawText(reverseArabic("الملاحظات"), {
      x: rightEdge - notesW,
      y: y + 4,
      size: 11,
      font: arabicFont,
      color: COLOR_WHITE,
    });
    y -= 30;

    drawRect(page, margin, y - 8, contentWidth, 60, COLOR_LIGHT_BG);
    const notesLines = data.notes.split("\n");
    for (const line of notesLines) {
      if (!line.trim() || y < 100) break;
      const lineW = textWidth(line, arabicFont, 10);
      page.drawText(reverseArabic(line), {
        x: rightEdge - Math.min(lineW, contentWidth - 10),
        y,
        size: 10,
        font: arabicFont,
        color: COLOR_DARK,
      });
      y -= 18;
    }
  }

  // ===== توقيع =====
  if (data.createdByName && y > 150) {
    y -= 40;
    drawLine(page, margin, y, margin + 120, y, COLOR_GRAY);
    const sigW = textWidth(data.createdByName, arabicFont, 9);
    page.drawText(reverseArabic(data.createdByName), {
      x: margin + 60 - sigW / 2,
      y: y - 15,
      size: 9,
      font: arabicFont,
      color: COLOR_GRAY,
    });
    const sigLabelW = textWidth("المُعِد", arabicFont, 8);
    page.drawText(reverseArabic("المُعِد"), {
      x: margin + 60 - sigLabelW / 2,
      y: y - 27,
      size: 8,
      font: arabicFont,
      color: COLOR_GRAY,
    });
  }

  // ===== Footer =====
  drawRect(page, 0, 0, width, 40, COLOR_PRIMARY);
  drawRect(page, 0, 40, width, 2, COLOR_ACCENT);

  const footerText = `${companyName}  |  نظام التوثيق`;
  const footerW = textWidth(footerText, arabicFont, 9);
  page.drawText(reverseArabic(footerText), {
    x: rightEdge - footerW,
    y: 15,
    size: 9,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  const dateFooter = new Date().toLocaleDateString("ar-SA");
  page.drawText(reverseArabic(dateFooter), {
    x: margin,
    y: 15,
    size: 9,
    font: arabicFont,
    color: rgb(0.85, 0.9, 1),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

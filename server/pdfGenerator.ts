import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to reverse Arabic text for PDFKit (basic RTL support)
function reverseArabic(text: string): string {
  // PDFKit doesn't natively support RTL, so we reverse the text
  // Split by lines, reverse each line's characters
  return text.split("\n").map(line => {
    // Reverse the characters in each line for RTL display
    return line.split("").reverse().join("");
  }).join("\n");
}

// Get font path - use local font file
function getFontPath(): string {
  const localFont = path.join(__dirname, "fonts", "Cairo-Regular.ttf");
  if (fs.existsSync(localFont)) return localFont;
  // Fallback to system font
  return "Helvetica";
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

function drawHeader(doc: InstanceType<typeof PDFDocument>, company: string, title: string) {
  const companyName = company === "quraish" ? "شركة قريش" : "شركة أذان";
  const fontPath = getFontPath();
  
  // Header background
  doc.rect(0, 0, doc.page.width, 100).fill("#1a365d");
  
  // Company name
  if (fontPath !== "Helvetica") {
    doc.font(fontPath);
  }
  doc.fontSize(22).fillColor("#ffffff");
  doc.text(reverseArabic(companyName), 50, 25, { 
    width: doc.page.width - 100, 
    align: "center" 
  });
  
  // Document title
  doc.fontSize(14).fillColor("#d4af37");
  doc.text(reverseArabic(title), 50, 60, { 
    width: doc.page.width - 100, 
    align: "center" 
  });
  
  // Gold line
  doc.moveTo(50, 100).lineTo(doc.page.width - 50, 100).strokeColor("#d4af37").lineWidth(2).stroke();
  
  doc.fillColor("#333333");
  return 120;
}

function drawField(doc: InstanceType<typeof PDFDocument>, label: string, value: string, y: number, options?: { width?: number; x?: number }) {
  const x = options?.x || 50;
  const width = options?.width || doc.page.width - 100;
  const fontPath = getFontPath();
  
  if (fontPath !== "Helvetica") doc.font(fontPath);
  
  // Label
  doc.fontSize(10).fillColor("#1a365d");
  doc.text(reverseArabic(label), x, y, { width, align: "right" });
  
  // Value
  doc.fontSize(11).fillColor("#333333");
  const valueY = y + 16;
  doc.text(reverseArabic(value || "—"), x, valueY, { width, align: "right" });
  
  // Underline
  doc.moveTo(x, valueY + 16).lineTo(x + width, valueY + 16).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  
  return valueY + 25;
}

function drawSignature(doc: InstanceType<typeof PDFDocument>, createdByName: string, hijriDate: string) {
  const fontPath = getFontPath();
  if (fontPath !== "Helvetica") doc.font(fontPath);
  
  const y = doc.y + 40;
  
  // Signature box
  doc.rect(doc.page.width - 250, y, 200, 80).strokeColor("#1a365d").lineWidth(1).stroke();
  
  doc.fontSize(9).fillColor("#666666");
  doc.text(reverseArabic("التوقيع والاعتماد"), doc.page.width - 250, y + 5, { width: 200, align: "center" });
  
  doc.fontSize(11).fillColor("#1a365d");
  doc.text(reverseArabic(createdByName || "—"), doc.page.width - 250, y + 25, { width: 200, align: "center" });
  
  doc.fontSize(9).fillColor("#666666");
  doc.text(reverseArabic(`التاريخ: ${hijriDate}`), doc.page.width - 250, y + 45, { width: 200, align: "center" });
  
  // Print timestamp
  const now = new Date();
  const printDate = `${now.toLocaleDateString("ar-SA")} ${now.toLocaleTimeString("ar-SA")}`;
  doc.fontSize(8).fillColor("#999999");
  doc.text(reverseArabic(`تاريخ الطباعة: ${printDate}`), doc.page.width - 250, y + 60, { width: 200, align: "center" });
}

function drawFooter(doc: InstanceType<typeof PDFDocument>) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#d4af37").lineWidth(1).stroke();
  
  const fontPath = getFontPath();
  if (fontPath !== "Helvetica") doc.font(fontPath);
  
  doc.fontSize(8).fillColor("#999999");
  doc.text(reverseArabic("نظام التوثيق - وثيقة رسمية"), 50, y + 5, { 
    width: doc.page.width - 100, 
    align: "center" 
  });
}

export function generateMeetingPDF(data: MeetingPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        info: {
          Title: `محضر اجتماع - ${data.title}`,
          Author: data.createdByName || "نظام التوثيق",
        }
      });
      
      const chunks: Buffer[] = [];
      const stream = new PassThrough();
      doc.pipe(stream);
      
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      
      // Header
      let y = drawHeader(doc, data.company, "محضر اجتماع");
      
      // Date and Day
      const halfWidth = (doc.page.width - 120) / 2;
      y = drawField(doc, "التاريخ الهجري", data.hijriDate, y, { width: halfWidth, x: doc.page.width - 50 - halfWidth });
      y -= 25; // Same line
      drawField(doc, "اليوم", data.dayOfWeek, y - 16 + 16, { width: halfWidth, x: 50 });
      y += 10;
      
      // Title
      y = drawField(doc, "عنوان الاجتماع", data.title, y);
      
      // Department
      if (data.department) {
        y = drawField(doc, "الإدارة", data.department, y);
      }
      
      // Objectives
      if (data.objectives) {
        y = drawField(doc, "الأهداف", data.objectives, y);
        y += 10;
      }
      
      // Recommendations
      if (data.recommendations) {
        y = drawField(doc, "التوصيات", data.recommendations, y);
        y += 10;
      }
      
      // Attendees
      if (data.attendees && data.attendees.length > 0) {
        const fontPath = getFontPath();
        if (fontPath !== "Helvetica") doc.font(fontPath);
        
        doc.fontSize(10).fillColor("#1a365d");
        doc.text(reverseArabic("الحضور"), 50, y, { width: doc.page.width - 100, align: "right" });
        y += 18;
        
        data.attendees.forEach((attendee, i) => {
          doc.fontSize(11).fillColor("#333333");
          doc.text(reverseArabic(`${i + 1}. ${attendee}`), 50, y, { width: doc.page.width - 100, align: "right" });
          y += 18;
        });
        y += 5;
      }
      
      // Status badge
      const fontPath = getFontPath();
      if (fontPath !== "Helvetica") doc.font(fontPath);
      
      const statusText = data.status === "final" ? "معتمد" : "مسودة";
      const statusColor = data.status === "final" ? "#22c55e" : "#f59e0b";
      doc.fontSize(10).fillColor(statusColor);
      doc.text(reverseArabic(`الحالة: ${statusText}`), 50, y, { width: doc.page.width - 100, align: "right" });
      
      // Signature
      drawSignature(doc, data.createdByName || "", data.hijriDate);
      
      // Footer
      drawFooter(doc);
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateEvaluationPDF(data: EvaluationPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        info: {
          Title: `تقرير تقييم - ${data.reportNumber}`,
          Author: data.createdByName || "نظام التوثيق",
        }
      });
      
      const chunks: Buffer[] = [];
      const stream = new PassThrough();
      doc.pipe(stream);
      
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      
      // Header
      let y = drawHeader(doc, data.company, "تقرير تقييم");
      
      // Report number
      y = drawField(doc, "رقم التقرير", data.reportNumber, y);
      
      // Date and Day
      const halfWidth = (doc.page.width - 120) / 2;
      y = drawField(doc, "التاريخ الهجري", data.hijriDate, y, { width: halfWidth, x: doc.page.width - 50 - halfWidth });
      y -= 25;
      drawField(doc, "اليوم", data.dayOfWeek, y - 16 + 16, { width: halfWidth, x: 50 });
      y += 10;
      
      // Evaluation details
      y = drawField(doc, "المحور", data.axis, y);
      y = drawField(doc, "المسار", data.track, y);
      y = drawField(doc, "المعيار", data.criterion, y);
      
      // Score with visual bar
      const fontPath = getFontPath();
      if (fontPath !== "Helvetica") doc.font(fontPath);
      
      doc.fontSize(10).fillColor("#1a365d");
      doc.text(reverseArabic("الدرجة"), 50, y, { width: doc.page.width - 100, align: "right" });
      y += 18;
      
      // Score bar
      const barWidth = doc.page.width - 100;
      const barHeight = 20;
      const scoreVal = data.score ?? 0;
      
      // Background bar
      doc.roundedRect(50, y, barWidth, barHeight, 5).fill("#e2e8f0");
      
      // Score fill
      const scoreColor = scoreVal >= 70 ? "#22c55e" : scoreVal >= 40 ? "#f59e0b" : "#ef4444";
      if (scoreVal > 0) {
        doc.roundedRect(50, y, (barWidth * scoreVal) / 100, barHeight, 5).fill(scoreColor);
      }
      
      // Score text
      doc.fontSize(12).fillColor("#1a365d");
      doc.text(`${scoreVal}%`, 50, y + 3, { width: barWidth, align: "center" });
      y += barHeight + 15;
      
      // Notes
      if (data.notes) {
        y = drawField(doc, "ملاحظات", data.notes, y);
        y += 10;
      }
      
      // Status
      const statusText = data.status === "final" ? "معتمد" : "مسودة";
      const statusColor2 = data.status === "final" ? "#22c55e" : "#f59e0b";
      if (fontPath !== "Helvetica") doc.font(fontPath);
      doc.fontSize(10).fillColor(statusColor2);
      doc.text(reverseArabic(`الحالة: ${statusText}`), 50, y, { width: doc.page.width - 100, align: "right" });
      
      // Signature
      drawSignature(doc, data.createdByName || "", data.hijriDate);
      
      // Footer
      drawFooter(doc);
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

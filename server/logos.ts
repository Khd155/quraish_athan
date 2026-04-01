// تحويل الشعارات إلى Base64
import fs from "fs";
import path from "path";

export function getLogoBase64(company: string): string {
  try {
    const logoPath = company === "quraish" 
      ? "/home/ubuntu/upload/شعار-قريش-1.png"
      : "/home/ubuntu/upload/شعار-أذان-1.png";
    
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error(`Error reading logo for ${company}:`, error);
    return "";
  }
}

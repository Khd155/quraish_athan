import { toast } from "sonner";

/**
 * تنزيل PDF بطريقة موثوقة تعمل في جميع المتصفحات
 * المشكلة السابقة: a.click() بدون إضافة العنصر للـ DOM لا يعمل في بعض المتصفحات
 */
export async function downloadPdf(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `خطأ ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    // إنشاء رابط مؤقت وإضافته للـ DOM قبل النقر
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // تنظيف بعد التنزيل
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    toast.success("تم تنزيل PDF بنجاح");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل في تنزيل PDF";
    toast.error(message);
    throw err;
  }
}

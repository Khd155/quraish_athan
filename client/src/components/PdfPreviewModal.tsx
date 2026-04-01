/**
 * مودال معاينة PDF — نسخة مُصلَحة
 *
 * الحل #3 (حلقة التكرار):
 *   - المشكلة الأصلية: objectUrl كانت في dependency array لـ useEffect،
 *     مما يجعل الـ effect يُعاد تشغيله في كل مرة يُنشأ فيها objectUrl جديد،
 *     فيُلغى ويُعاد الجلب... وهكذا إلى ما لا نهاية.
 *   - الحل: إزالة objectUrl من الـ dependency array تماماً،
 *     واستخدام useRef لتخزين الـ URL الحالي وإلغائه عند الحاجة.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X, RefreshCw } from "lucide-react";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;   // مثال: /api/pdf/meeting/123
  fileName: string;
  title: string;
}

export default function PdfPreviewModal({
  open,
  onClose,
  pdfUrl,
  fileName,
  title,
}: PdfPreviewModalProps) {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // ── الحل #3: useRef لتخزين الـ URL الحالي وإلغائه بأمان ──
  const currentObjectUrl = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokeCurrentUrl = () => {
    if (currentObjectUrl.current) {
      URL.revokeObjectURL(currentObjectUrl.current);
      currentObjectUrl.current = null;
    }
  };

  // ── دالة الجلب مستقلة عن الـ state لمنع إعادة التشغيل ──
  const fetchPdf = useCallback(async (url: string) => {
    // إلغاء أي طلب سابق
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // إلغاء الـ objectUrl السابق قبل إنشاء واحد جديد
    revokeCurrentUrl();

    setLoading(true);
    setError(null);
    setObjectUrl(null);

    try {
      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `خطأ ${res.status}`);
      }

      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);
      currentObjectUrl.current = newUrl;   // حفظ المرجع للإلغاء لاحقاً
      setObjectUrl(newUrl);
    } catch (err: any) {
      if (err.name === "AbortError") return; // تم الإلغاء بشكل متعمد — تجاهل
      setError(err.message || "فشل في تحميل PDF");
    } finally {
      setLoading(false);
    }
  }, []); // dependency array فارغ — الدالة لا تتغير أبداً

  // ── الحل #3: effect يعتمد فقط على open و pdfUrl (لا objectUrl) ──
  useEffect(() => {
    if (!open) {
      // تنظيف عند الإغلاق
      abortRef.current?.abort();
      revokeCurrentUrl();
      setObjectUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    fetchPdf(pdfUrl);
    // objectUrl مقصود عدم إضافتها هنا — إضافتها تسبب الحلقة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfUrl]);

  // تنظيف نهائي عند unmount المكوّن
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      revokeCurrentUrl();
    };
  }, []);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  };

  const handleRetry = () => fetchPdf(pdfUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0"
        dir="rtl"
      >
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {objectUrl && (
              <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                تنزيل PDF
              </Button>
            )}
            {error && !loading && (
              <Button size="sm" variant="outline" onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">جاري تحميل المستند...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-destructive">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm font-medium">فشل في تحميل المستند</p>
              <p className="text-xs text-muted-foreground max-w-xs text-center">{error}</p>
              <Button size="sm" variant="outline" onClick={handleRetry} className="gap-2 mt-2">
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {objectUrl && !loading && !error && (
            <iframe
              src={objectUrl}
              className="w-full h-full border-0"
              title={title}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

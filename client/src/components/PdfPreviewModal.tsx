import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X, RefreshCw } from "lucide-react";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string; // e.g. /api/pdf/meeting/123
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setObjectUrl(null);
    setRetryCount(0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 ثانية timeout

    fetch(pdfUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `خطأ ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          setError("انتهت مهلة الانتظار - تأكد من اتصالك بالإنترنت");
        } else {
          setError(err.message || "فشل في تحميل PDF");
        }
        setLoading(false);
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfUrl]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRetry = () => {
    if (retryCount >= MAX_RETRIES) {
      setError(`فشل بعد ${MAX_RETRIES} محاولات. يرجى المحاولة لاحقاً.`);
      return;
    }
    setLoading(true);
    setError(null);
    setObjectUrl(null);
    setRetryCount(prev => prev + 1);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    fetch(pdfUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`خطأ ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        setObjectUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          setError("انتهت مهلة الانتظار");
        } else {
          setError(err.message || "فشل في تحميل PDF");
        }
        setLoading(false);
      })
      .finally(() => clearTimeout(timeoutId));
  };

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
            {error && (
              <Button size="sm" variant="outline" onClick={handleRetry} className="gap-2" disabled={retryCount >= MAX_RETRIES}>
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
              <p className="text-xs text-muted-foreground">قد يستغرق بعض الوقت</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-destructive">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm font-medium">فشل في تحميل المستند</p>
              <p className="text-xs text-muted-foreground max-w-xs text-center">{error}</p>
              {retryCount < MAX_RETRIES && (
                <Button size="sm" variant="outline" onClick={handleRetry} className="gap-2 mt-2">
                  <RefreshCw className="w-4 h-4" />
                  إعادة المحاولة ({retryCount}/{MAX_RETRIES})
                </Button>
              )}
            </div>
          )}

          {objectUrl && !loading && (
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

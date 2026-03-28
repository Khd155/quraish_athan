import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileIcon, Loader2, Trash2, Upload, Image, FileText } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface FileUploadZoneProps {
  entityType: "meeting" | "evaluation";
  entityId: number;
}

export default function FileUploadZone({ entityType, entityId }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: existingFiles, refetch } = trpc.attachments.getByEntity.useQuery(
    { entityType, entityId },
    { enabled: !!entityId }
  );

  const uploadMutation = trpc.attachments.upload.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم رفع الملف بنجاح");
    },
    onError: (err) => toast.error(err.message || "فشل رفع الملف"),
  });

  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم حذف الملف");
    },
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`الملف ${file.name} أكبر من 10 ميجابايت`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadMutation.mutate({
          entityType,
          entityId,
          fileName: file.name,
          fileData: base64,
          mimeType: file.type,
          fileSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [entityType, entityId, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploadMutation.isPending ? (
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        ) : (
          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground mt-2">
          اسحب الملفات هنا أو اضغط للاختيار
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          صور، PDF، Word، Excel - الحد الأقصى 10 ميجابايت
        </p>
      </div>

      {/* File List */}
      {existingFiles && existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
              {getFileIcon(file.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} كيلوبايت` : ""}
                </p>
              </div>
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                عرض
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMutation.mutate({ id: file.id })}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

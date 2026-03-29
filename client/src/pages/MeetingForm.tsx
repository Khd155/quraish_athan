"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { DAYS_OF_WEEK, getDayFromHijriDate, formatHijriDate, gregorianToHijri, getDayOfWeek } from "@shared/hijriUtils";
import { ArrowRight, Loader2, Plus, X, FileDown, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import HijriDatePicker from "@/components/HijriDatePicker";
import { useAuth } from "@/_core/hooks/useAuth";
import { downloadPdf } from "@/lib/downloadPdf";

const DEPARTMENTS = [
  { value: "technology", label: "إدارة التقنية" },
  { value: "catering", label: "إدارة الإعاشة" },
  { value: "transport", label: "إدارة النقل" },
  { value: "cultural", label: "الإدارة الثقافية" },
  { value: "media", label: "الإدارة الإعلامية" },
  { value: "supervisors", label: "إدارة المشرفين" },
];

export default function MeetingForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const company = localStorage.getItem("selectedCompany") as "quraish" | "azan" || "quraish";

  const [hijriDate, setHijriDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [title, setTitle] = useState("");
  const [elements, setElements] = useState<string[]>([""]);
  const [recommendations, setRecommendations] = useState<string[]>([""]);
  const [department, setDepartment] = useState("");
  const [attendees, setAttendees] = useState<string[]>([""]);
  const [entityId, setEntityId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Auto-detect: set today's hijri date and day
  useEffect(() => {
    if (!isEdit) {
      const today = new Date();
      const h = gregorianToHijri(today);
      const formatted = formatHijriDate(h.year, h.month, h.day);
      setHijriDate(formatted);
      setDayOfWeek(getDayOfWeek(today));
    }
  }, [isEdit]);

  // Auto-detect day when hijri date changes
  const handleHijriDateChange = useCallback((value: string) => {
    setHijriDate(value);
    const detectedDay = getDayFromHijriDate(value);
    if (detectedDay) setDayOfWeek(detectedDay);
  }, []);

  // Load existing meeting for edit
  const { data: existingMeeting } = trpc.meetings.getById.useQuery(
    { id: Number(params.id) },
    { enabled: !!isEdit }
  );

  useEffect(() => {
    if (existingMeeting) {
      setHijriDate(existingMeeting.hijriDate);
      setDayOfWeek(existingMeeting.dayOfWeek);
      setTitle(existingMeeting.title as string);
      const elemStr = (existingMeeting.elements as string) || "";
      setElements(elemStr ? elemStr.split("\n").filter(e => e.trim()) : [""]);
      const recStr = (existingMeeting.recommendations as string) || "";
      setRecommendations(recStr ? recStr.split("\n").filter(r => r.trim()) : [""]);
      setDepartment(existingMeeting.department || "");
      setAttendees((existingMeeting.attendees as string[]) || [""]);
      setEntityId(existingMeeting.id);
    }
  }, [existingMeeting]);

  const createMutation = trpc.meetings.create.useMutation({
    onSuccess: (data) => {
      setEntityId(data.id);
      toast.success("تم حفظ المحضر بنجاح");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.meetings.update.useMutation({
    onSuccess: () => toast.success("تم تحديث المحضر"),
    onError: (err) => toast.error(err.message),
  });

  const handleSave = (status: "draft" | "final") => {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان المحضر");
      return;
    }
    const data = {
      company,
      hijriDate,
      gregorianDate: "", // لم نعد نستخدمه لكن الحقل موجود في قاعدة البيانات
      dayOfWeek,
      title: title.trim(),
      elements: elements.filter(e => e.trim()).join("\n"),
      recommendations: recommendations.filter(r => r.trim()).join("\n"),
      department: department as "technology" | "catering" | "transport" | "cultural" | "media" | "supervisors" | undefined || undefined,
      attendees: attendees.filter(a => a.trim()),
      status,
    };

    if (isEdit && existingMeeting) {
      updateMutation.mutate({ id: existingMeeting.id, ...data });
    } else if (entityId) {
      updateMutation.mutate({ id: entityId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // PDF Export - using reliable download utility
  const handleExportPDF = async () => {
    if (!entityId) {
      toast.error("يرجى حفظ المحضر أولاً");
      return;
    }
    setGenerating(true);
    try {
      await downloadPdf(
        `/api/pdf/meeting/${entityId}`,
        `محضر_اجتماع_${hijriDate.replace(/\//g, "-")}.pdf`
      );
    } finally {
      setGenerating(false);
    }
  };

  // Elements handlers
  const addElement = () => setElements([...elements, ""]);
  const removeElement = (index: number) => {
    if (elements.length <= 1) return;
    setElements(elements.filter((_, i) => i !== index));
  };
  const updateElement = (index: number, value: string) => {
    const updated = [...elements];
    updated[index] = value;
    setElements(updated);
  };

  // Recommendations handlers
  const addRecommendation = () => setRecommendations([...recommendations, ""]);
  const removeRecommendation = (index: number) => {
    if (recommendations.length <= 1) return;
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };
  const updateRecommendation = (index: number, value: string) => {
    const updated = [...recommendations];
    updated[index] = value;
    setRecommendations(updated);
  };

  // Attendees handlers
  const addAttendee = () => setAttendees([...attendees, ""]);
  const removeAttendee = (index: number) => {
    if (attendees.length <= 1) return;
    setAttendees(attendees.filter((_, i) => i !== index));
  };
  const updateAttendee = (index: number, value: string) => {
    const updated = [...attendees];
    updated[index] = value;
    setAttendees(updated);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "تعديل محضر الاجتماع" : "محضر اجتماع جديد"}</h1>
            <p className="text-muted-foreground text-sm">
              {company === "quraish" ? "شركة قريش" : "شركة أذان"}
            </p>
          </div>
        </div>
        {entityId && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
              <Eye className="w-4 h-4" />
              معاينة PDF
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              تنزيل PDF
            </Button>
          </div>
        )}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بيانات المحضر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Row - Hijri only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التاريخ الهجري</Label>
              <HijriDatePicker value={hijriDate} onChange={handleHijriDateChange} />
            </div>
            <div className="space-y-2">
              <Label>اليوم</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>عنوان الاجتماع</Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان الاجتماع"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>الإدارة</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الإدارة" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Elements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>عناصر الاجتماع</Label>
              <Button type="button" variant="outline" size="sm" onClick={addElement} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                إضافة عنصر
              </Button>
            </div>
            <div className="space-y-2">
              {elements.map((el, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Textarea
                    value={el}
                    onChange={(e) => updateElement(index, e.target.value)}
                    placeholder={`عنصر ${index + 1}`}
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  {elements.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0" onClick={() => removeElement(index)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>التوصيات</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRecommendation} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                إضافة توصية
              </Button>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Textarea
                    value={rec}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    placeholder={`توصية ${index + 1}`}
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  {recommendations.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0" onClick={() => removeRecommendation(index)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>الحضور</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAttendee} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                إضافة حاضر
              </Button>
            </div>
            <div className="space-y-2">
              {attendees.map((att, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={att}
                    onChange={(e) => updateAttendee(index, e.target.value)}
                    placeholder={`اسم الحاضر ${index + 1}`}
                    className="flex-1"
                  />
                  {attendees.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeAttendee(index)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>الشواهد والمرفقات</Label>
            {entityId ? (
              <FileUploadZone
                entityType="meeting"
                entityId={entityId}
              />
            ) : (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                احفظ المحضر أولاً لإضافة المرفقات
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-start">
        <Button onClick={() => handleSave("final")} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          حفظ واعتماد
        </Button>
        <Button variant="outline" onClick={() => handleSave("draft")} disabled={isPending}>
          حفظ كمسودة
        </Button>
        <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
          إلغاء
        </Button>
      </div>

      {/* PDF Preview Modal */}
      {entityId && (
        <PdfPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          pdfUrl={`/api/pdf/meeting/${entityId}`}
          fileName={`محضر_اجتماع_${hijriDate.replace(/\//g, "-")}.pdf`}
          title={`معاينة: ${title}`}
        />
      )}
    </div>
  );
}

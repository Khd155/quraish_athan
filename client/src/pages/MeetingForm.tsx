"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DAYS_OF_WEEK, gregorianToHijri, formatHijriDate, getDayOfWeek, getDayFromHijriDate, hijriToGregorian } from "@shared/hijriUtils";
import { ArrowRight, Loader2, Plus, Save, X, FileDown, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const [gregorianDate, setGregorianDate] = useState("");
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
      setHijriDate(formatHijriDate(h.year, h.month, h.day));
      setGregorianDate(today.toISOString().split("T")[0]);
      setDayOfWeek(getDayOfWeek(today));
    }
  }, [isEdit]);

  // Auto-detect day from hijri date change (ربط ذكي)
  const handleHijriDateChange = useCallback((value: string) => {
    setHijriDate(value);
    const detectedDay = getDayFromHijriDate(value);
    if (detectedDay) {
      setDayOfWeek(detectedDay);
    }
    // Convert hijri to gregorian
    const parts = value.split("/");
    if (parts.length === 3) {
      const hijriYear = parseInt(parts[0]);
      const hijriMonth = parseInt(parts[1]);
      const hijriDay = parseInt(parts[2]);
      const g = hijriToGregorian(hijriYear, hijriMonth, hijriDay);
      setGregorianDate(g.toISOString().split("T")[0]);
    }
  }, []);

  // Handle gregorian date change
  const handleGregorianDateChange = (value: string) => {
    setGregorianDate(value);
    const date = new Date(value + "T00:00:00");
    const h = gregorianToHijri(date);
    setHijriDate(formatHijriDate(h.year, h.month, h.day));
    setDayOfWeek(getDayOfWeek(date));
  };

  // Load existing meeting for edit
  const { data: existingMeeting } = trpc.meetings.getById.useQuery(
    { id: Number(params.id) },
    { enabled: !!isEdit }
  );

  useEffect(() => {
    if (existingMeeting) {
      setHijriDate(existingMeeting.hijriDate);
      setGregorianDate(existingMeeting.gregorianDate || "");
      setDayOfWeek(existingMeeting.dayOfWeek);
      setTitle(existingMeeting.title as string);
      // Parse elements and recommendations as arrays
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
      gregorianDate,
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

  // PDF Export (direct download)
  const handleExportPDF = async () => {
    if (!entityId) {
      toast.error("يرجى حفظ المحضر أولاً");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/pdf/meeting/${entityId}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "فشل في إنشاء PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `محضر_اجتماع_${hijriDate.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير PDF بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل في تصدير PDF");
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowRight className="w-5 h-5" />
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
          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>التاريخ الهجري</Label>
              <Input
                type="text"
                value={hijriDate}
                onChange={(e) => handleHijriDateChange(e.target.value)}
                placeholder="1447/01/01"
                dir="ltr"
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label>التاريخ الميلادي</Label>
              <Input
                type="date"
                value={gregorianDate}
                onChange={(e) => handleGregorianDateChange(e.target.value)}
              />
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
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Elements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>عناصر الاجتماع</Label>
              <Button variant="ghost" size="sm" onClick={addElement}>
                <Plus className="w-4 h-4 ml-1" /> إضافة عنصر
              </Button>
            </div>
            <div className="space-y-2">
              {elements.map((element, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={element}
                    onChange={(e) => updateElement(index, e.target.value)}
                    placeholder={`عنصر ${index + 1}`}
                    className="flex-1"
                    rows={2}
                  />
                  {elements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeElement(index)}
                      className="text-destructive"
                    >
                      <X className="w-4 h-4" />
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
              <Button variant="ghost" size="sm" onClick={addRecommendation}>
                <Plus className="w-4 h-4 ml-1" /> إضافة توصية
              </Button>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={rec}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    placeholder={`توصية ${index + 1}`}
                    className="flex-1"
                    rows={2}
                  />
                  {recommendations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecommendation(index)}
                      className="text-destructive"
                    >
                      <X className="w-4 h-4" />
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
              <Button variant="ghost" size="sm" onClick={addAttendee}>
                <Plus className="w-4 h-4 ml-1" /> إضافة حاضر
              </Button>
            </div>
            <div className="space-y-2">
              {attendees.map((attendee, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={attendee}
                    onChange={(e) => updateAttendee(index, e.target.value)}
                    placeholder={`اسم الحاضر ${index + 1}`}
                    className="flex-1"
                  />
                  {attendees.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttendee(index)}
                      className="text-destructive"
                    >
                      <X className="w-4 h-4" />
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
              <FileUploadZone entityType="meeting" entityId={entityId} />
            ) : (
              <p className="text-sm text-muted-foreground">احفظ المحضر أولاً لإضافة المرفقات</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>
          إلغاء
        </Button>
        <Button
          onClick={() => handleSave("draft")}
          disabled={isPending}
          variant="outline"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          حفظ كمسودة
        </Button>
        <Button
          onClick={() => handleSave("final")}
          disabled={isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          <Save className="w-4 h-4 ml-2" />
          حفظ واعتماد
        </Button>
      </div>
      {/* PDF Preview Modal */}
      {entityId && (
        <PdfPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          pdfUrl={`/api/pdf/meeting/${entityId}`}
          fileName={`محضر_اجتماع_${hijriDate.replace(/\//g, "-")}.pdf`}
          title={`معاينة: ${title || "محضر الاجتماع"}`}
        />
      )}
    </div>
  );
}

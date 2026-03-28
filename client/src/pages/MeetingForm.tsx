import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DAYS_OF_WEEK, gregorianToHijri, formatHijriDate, getDayOfWeek, getDayFromHijriDate } from "@shared/hijriUtils";
import { ArrowRight, Loader2, Plus, Save, X, FileDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";

export default function MeetingForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const company = localStorage.getItem("selectedCompany") as "quraish" | "azan" || "quraish";

  const [hijriDate, setHijriDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [department, setDepartment] = useState("");
  const [attendees, setAttendees] = useState<string[]>([""]);
  const [entityId, setEntityId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  // Auto-detect: set today's hijri date and day
  useEffect(() => {
    if (!isEdit) {
      const today = new Date();
      const h = gregorianToHijri(today);
      setHijriDate(formatHijriDate(h.year, h.month, h.day));
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
      setObjectives((existingMeeting.objectives as string) || "");
      setRecommendations((existingMeeting.recommendations as string) || "");
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
      dayOfWeek,
      title: title.trim(),
      objectives: objectives.trim(),
      recommendations: recommendations.trim(),
      department: department.trim(),
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

  // PDF Export
  const handleExportPDF = async () => {
    if (!entityId) {
      toast.error("يرجى حفظ المحضر أولاً");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/pdf/meeting/${entityId}`);
      if (!res.ok) throw new Error("فشل في إنشاء PDF");
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
          <Button variant="outline" onClick={handleExportPDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <FileDown className="w-4 h-4 ml-2" />}
            تصدير PDF
          </Button>
        )}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بيانات المحضر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date & Day Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التاريخ الهجري</Label>
              <Input
                value={hijriDate}
                onChange={(e) => handleHijriDateChange(e.target.value)}
                placeholder="1447/01/01"
                dir="ltr"
                className="text-center"
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
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="اسم الإدارة"
            />
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <Label>الأهداف</Label>
            <Textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="أهداف الاجتماع..."
              rows={4}
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <Label>التوصيات</Label>
            <Textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="توصيات الاجتماع..."
              rows={4}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>الحضور</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAttendee}>
                <Plus className="w-4 h-4 ml-1" />
                إضافة
              </Button>
            </div>
            {attendees.map((attendee, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={attendee}
                  onChange={(e) => updateAttendee(index, e.target.value)}
                  placeholder={`الحاضر ${index + 1}`}
                />
                {attendees.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAttendee(index)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* File Upload */}
          {entityId && (
            <div className="space-y-2">
              <Label>الشواهد والمرفقات</Label>
              <FileUploadZone entityType="meeting" entityId={entityId} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave("draft")} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ كمسودة
        </Button>
        <Button onClick={() => handleSave("final")} disabled={isPending} className="navy-gradient">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
          اعتماد وحفظ
        </Button>
      </div>
    </div>
  );
}

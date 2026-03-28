import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { evaluationAxes, getTracksByAxis, getCriteriaByTrack } from "@shared/evaluationData";
import { DAYS_OF_WEEK, gregorianToHijri, formatHijriDate, getDayOfWeek, getDayFromHijriDate } from "@shared/hijriUtils";
import { ArrowRight, Loader2, Save, FileDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";

export default function EvaluationForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const company = localStorage.getItem("selectedCompany") as "quraish" | "azan" || "quraish";

  const [hijriDate, setHijriDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [selectedAxis, setSelectedAxis] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [score, setScore] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [entityId, setEntityId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  // Auto-detect today
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

  // Dynamic tracks based on axis
  const tracks = useMemo(() => getTracksByAxis(selectedAxis), [selectedAxis]);
  // Dynamic criteria based on track
  const criteria = useMemo(() => getCriteriaByTrack(selectedAxis, selectedTrack), [selectedAxis, selectedTrack]);

  // Reset dependent fields
  useEffect(() => { setSelectedTrack(""); setSelectedCriterion(""); }, [selectedAxis]);
  useEffect(() => { setSelectedCriterion(""); }, [selectedTrack]);

  // Load existing report
  const { data: existingReport } = trpc.evaluations.getById.useQuery(
    { id: Number(params.id) },
    { enabled: !!isEdit }
  );

  useEffect(() => {
    if (existingReport) {
      setHijriDate(existingReport.hijriDate);
      setDayOfWeek(existingReport.dayOfWeek);
      setSelectedAxis(existingReport.axis);
      setScore(existingReport.score ?? 0);
      setNotes(existingReport.notes ?? "");
      setEntityId(existingReport.id);
      setTimeout(() => {
        setSelectedTrack(existingReport.track);
        setTimeout(() => {
          setSelectedCriterion(existingReport.criterion);
        }, 50);
      }, 50);
    }
  }, [existingReport]);

  const createMutation = trpc.evaluations.create.useMutation({
    onSuccess: (data) => {
      setEntityId(data.id);
      toast.success(`تم حفظ التقرير برقم ${data.reportNumber}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.evaluations.update.useMutation({
    onSuccess: () => toast.success("تم تحديث التقرير"),
    onError: (err) => toast.error(err.message),
  });

  const handleSave = (status: "draft" | "final") => {
    if (!selectedAxis) {
      toast.error("يرجى اختيار المحور");
      return;
    }
    if (!selectedTrack) {
      toast.error("يرجى اختيار المسار");
      return;
    }
    if (!selectedCriterion) {
      toast.error("يرجى اختيار المعيار");
      return;
    }
    const axisObj = evaluationAxes.find(a => a.id === selectedAxis);
    const trackObj = tracks.find(t => t.id === selectedTrack);
    const criterionObj = criteria.find(c => c.id === selectedCriterion);

    const data = {
      company,
      hijriDate,
      dayOfWeek,
      axis: axisObj?.name || selectedAxis,
      track: trackObj?.name || selectedTrack,
      criterion: criterionObj?.name || selectedCriterion,
      score,
      notes: notes.trim(),
      status,
    };

    if (isEdit && existingReport) {
      updateMutation.mutate({ id: existingReport.id, ...data });
    } else if (entityId) {
      updateMutation.mutate({ id: entityId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!entityId) {
      toast.error("يرجى حفظ التقرير أولاً");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/pdf/evaluation/${entityId}`);
      if (!res.ok) throw new Error("فشل في إنشاء PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير_تقييم_${hijriDate.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير PDF بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل في تصدير PDF");
    } finally {
      setGenerating(false);
    }
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
            <h1 className="text-2xl font-bold">{isEdit ? "تعديل تقرير التقييم" : "تقرير تقييم جديد"}</h1>
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
          <CardTitle className="text-lg">بيانات التقرير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date & Day */}
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

          {/* Dynamic Dropdowns */}
          <div className="space-y-4 p-4 rounded-xl bg-muted/30 border">
            <h3 className="font-semibold text-sm text-muted-foreground">معايير التقييم</h3>

            {/* Axis */}
            <div className="space-y-2">
              <Label>المحور</Label>
              <Select value={selectedAxis} onValueChange={setSelectedAxis}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المحور" />
                </SelectTrigger>
                <SelectContent>
                  {evaluationAxes.map((axis) => (
                    <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Track */}
            <div className="space-y-2">
              <Label>المسار</Label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack} disabled={!selectedAxis}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedAxis ? "اختر المسار" : "اختر المحور أولاً"} />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.name} ({track.criteria.length} معايير)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criterion */}
            <div className="space-y-2">
              <Label>المعيار</Label>
              <Select value={selectedCriterion} onValueChange={setSelectedCriterion} disabled={!selectedTrack}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedTrack ? "اختر المعيار" : "اختر المسار أولاً"} />
                </SelectTrigger>
                <SelectContent>
                  {criteria.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>الدرجة</Label>
              <span className="text-2xl font-bold text-primary">{score}%</span>
            </div>
            <Slider
              value={[score]}
              onValueChange={([v]) => setScore(v)}
              max={100}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={4}
            />
          </div>

          {/* File Upload */}
          {entityId && (
            <div className="space-y-2">
              <Label>الشواهد والمرفقات</Label>
              <FileUploadZone entityType="evaluation" entityId={entityId} />
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

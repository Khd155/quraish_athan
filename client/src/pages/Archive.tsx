import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck, FileText, Search, Trash2, Eye, FileDown, Pencil } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import PdfPreviewModal from "@/components/PdfPreviewModal";

export default function Archive() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("meetings");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const openMeetingPreview = (m: { id: number; hijriDate: string; title: unknown }) => {
    setPreviewUrl(`/api/pdf/meeting/${m.id}`);
    setPreviewFileName(`محضر_اجتماع_${String(m.hijriDate).replace(/\//g, "-")}.pdf`);
    setPreviewTitle(`معاينة: ${String(m.title)}`);
    setPreviewOpen(true);
  };

  const openReportPreview = (r: { id: number; hijriDate: string; reportNumber: string }) => {
    setPreviewUrl(`/api/pdf/evaluation/${r.id}`);
    setPreviewFileName(`تقرير_تقييم_${String(r.hijriDate).replace(/\//g, "-")}.pdf`);
    setPreviewTitle(`معاينة: تقرير ${r.reportNumber}`);
    setPreviewOpen(true);
  };

  const downloadPdf = async (url: string, fileName: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("فشل في تحميل PDF");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objUrl);
      toast.success("تم تنزيل PDF");
    } catch {
      toast.error("فشل في تنزيل PDF");
    }
  };

  const { data: allMeetings, refetch: refetchMeetings } = trpc.meetings.all.useQuery(
    { company: companyFilter, search },
    { enabled: activeTab === "meetings" }
  );

  const { data: allReports, refetch: refetchReports } = trpc.evaluations.all.useQuery(
    { company: companyFilter, search },
    { enabled: activeTab === "evaluations" }
  );

  const deleteMeetingMutation = trpc.meetings.delete.useMutation({
    onSuccess: () => { refetchMeetings(); toast.success("تم حذف المحضر"); },
  });

  const deleteReportMutation = trpc.evaluations.delete.useMutation({
    onSuccess: () => { refetchReports(); toast.success("تم حذف التقرير"); },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">أرشيف المستندات</h1>
        <p className="text-muted-foreground">البحث في جميع المحاضر والتقارير</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="الشركة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الشركات</SelectItem>
            <SelectItem value="quraish">شركة قريش</SelectItem>
            <SelectItem value="azan">شركة أذان</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meetings" className="gap-2">
            <FileText className="w-4 h-4" />
            المحاضر
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meetings" className="mt-4">
          {!allMeetings || allMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد محاضر
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allMeetings.map((m) => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setLocation(`/meetings/${m.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">{m.title as string}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.hijriDate} - {m.dayOfWeek} | {m.company === "quraish" ? "قريش" : "أذان"} | بواسطة: {m.createdByName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${m.status === "final" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {m.status === "final" ? "نهائي" : "مسودة"}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="معاينة PDF" onClick={() => openMeetingPreview(m)}>
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تنزيل PDF" onClick={() => downloadPdf(`/api/pdf/meeting/${m.id}`, `محضر_اجتماع_${String(m.hijriDate).replace(/\//g, "-")}.pdf`)}>
                        <FileDown className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تعديل" onClick={() => setLocation(`/meetings/${m.id}`)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="حذف"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا المحضر؟")) {
                            deleteMeetingMutation.mutate({ id: m.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          {!allReports || allReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد تقارير
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allReports.map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setLocation(`/evaluations/${r.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[oklch(0.6_0.12_85)] shrink-0" />
                        <div>
                          <p className="font-medium">{r.reportNumber} - {r.track}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.hijriDate} | {r.axis} | {r.company === "quraish" ? "قريش" : "أذان"} | بواسطة: {r.createdByName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${r.status === "final" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "final" ? "نهائي" : "مسودة"}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="معاينة PDF" onClick={() => openReportPreview(r)}>
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تنزيل PDF" onClick={() => downloadPdf(`/api/pdf/evaluation/${r.id}`, `تقرير_تقييم_${String(r.hijriDate).replace(/\//g, "-")}.pdf`)}>
                        <FileDown className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تعديل" onClick={() => setLocation(`/evaluations/${r.id}`)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="حذف"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا التقرير؟")) {
                            deleteReportMutation.mutate({ id: r.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfUrl={previewUrl}
        fileName={previewFileName}
        title={previewTitle}
      />
    </div>
  );
}

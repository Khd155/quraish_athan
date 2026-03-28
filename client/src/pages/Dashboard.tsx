import { useAuth } from "@/_core/hooks/useAuth";
import { FileText, ClipboardCheck, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const company = localStorage.getItem("selectedCompany") || "quraish";
  const companyName = company === "quraish" ? "شركة قريش" : "شركة أذان";

  const { data: myMeetings } = trpc.meetings.myMeetings.useQuery();
  const { data: myReports } = trpc.evaluations.myReports.useQuery();

  const recentMeetings = (myMeetings || []).slice(0, 5);
  const recentReports = (myReports || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مرحباً، {user?.name || "مستخدم"}</h1>
          <p className="text-muted-foreground mt-1">{companyName} - لوحة التحكم</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30 group"
          onClick={() => setLocation("/meetings/new")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl navy-gradient flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">محضر اجتماع جديد</h3>
              <p className="text-sm text-muted-foreground">إنشاء محضر اجتماع وتوثيقه</p>
            </div>
            <Plus className="w-5 h-5 text-muted-foreground mr-auto" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30 group"
          onClick={() => setLocation("/evaluations/new")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">تقرير تقييم جديد</h3>
              <p className="text-sm text-muted-foreground">إنشاء تقرير تقييم بالمعايير</p>
            </div>
            <Plus className="w-5 h-5 text-muted-foreground mr-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              آخر المحاضر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMeetings.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">لا توجد محاضر بعد</p>
            ) : (
              <div className="space-y-3">
                {recentMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/meetings/${m.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{m.title as string}</p>
                      <p className="text-xs text-muted-foreground">{m.hijriDate} - {m.dayOfWeek}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.status === "final" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {m.status === "final" ? "نهائي" : "مسودة"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[oklch(0.6_0.12_85)]" />
              آخر التقارير
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">لا توجد تقارير بعد</p>
            ) : (
              <div className="space-y-3">
                {recentReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/evaluations/${r.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{r.reportNumber} - {r.track}</p>
                      <p className="text-xs text-muted-foreground">{r.hijriDate} - {r.criterion}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${r.status === "final" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.status === "final" ? "نهائي" : "مسودة"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

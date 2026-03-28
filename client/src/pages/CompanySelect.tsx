import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useLocation } from "wouter";

const companies = [
  {
    id: "quraish",
    name: "شركة قريش",
    nameEn: "Quraish",
    color: "from-[oklch(0.3_0.06_250)] to-[oklch(0.4_0.05_250)]",
    borderColor: "border-[oklch(0.35_0.05_250)]",
    hoverShadow: "hover:shadow-[0_8px_30px_oklch(0.35_0.05_250/0.2)]",
  },
  {
    id: "azan",
    name: "شركة أذان",
    nameEn: "Azan",
    color: "from-[oklch(0.55_0.12_85)] to-[oklch(0.65_0.12_85)]",
    borderColor: "border-[oklch(0.6_0.1_85)]",
    hoverShadow: "hover:shadow-[0_8px_30px_oklch(0.6_0.1_85/0.2)]",
  },
];

export default function CompanySelect() {
  const [, setLocation] = useLocation();

  const handleSelect = (companyId: string) => {
    localStorage.setItem("selectedCompany", companyId);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.97_0.005_250)] via-[oklch(0.985_0.003_90)] to-[oklch(0.96_0.01_85)] p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">اختر الشركة</h1>
          <p className="text-muted-foreground text-lg">حدد الشركة التي ترغب في العمل عليها</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {companies.map((company) => (
            <Card
              key={company.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${company.borderColor} ${company.hoverShadow} hover:-translate-y-1 bg-white/90 backdrop-blur-sm overflow-hidden group`}
              onClick={() => handleSelect(company.id)}
            >
              <div className={`h-2 bg-gradient-to-l ${company.color}`} />
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${company.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                  <Building2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">{company.name}</h2>
                <p className="text-sm text-muted-foreground">{company.nameEn}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

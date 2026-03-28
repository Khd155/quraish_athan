import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

const LOGO_URLS = {
  quraish: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/quraish-logo_1ecf0210.png",
  azan: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/azan-logo_ef925323.png",
  combined: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346868864/TJtk4unPLR36oJYebaM6yg/combined-logo_017b3a89.png",
};

const companies = [
  {
    id: "quraish",
    name: "شركة قريش المحدودة",
    nameEn: "Quraish Company Limited",
    logo: LOGO_URLS.quraish,
    borderColor: "border-[oklch(0.35_0.05_250)]",
    hoverBorder: "hover:border-[oklch(0.45_0.08_250)]",
    accentColor: "bg-[oklch(0.35_0.05_250)]",
  },
  {
    id: "azan",
    name: "شركة أذان المحدودة",
    nameEn: "Athan Company Limited",
    logo: LOGO_URLS.azan,
    borderColor: "border-[oklch(0.55_0.08_55)]",
    hoverBorder: "hover:border-[oklch(0.6_0.12_55)]",
    accentColor: "bg-[oklch(0.55_0.08_55)]",
  },
];

export default function CompanySelect() {
  const [, setLocation] = useLocation();

  const handleSelect = (companyId: string) => {
    localStorage.setItem("selectedCompany", companyId);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.97_0.005_250)] via-[oklch(0.985_0.003_90)] to-[oklch(0.96_0.01_85)] p-4">
      {/* الشعار الموحد */}
      <div className="mb-8">
        <img
          src={LOGO_URLS.combined}
          alt="شركة قريش وأذان لخدمات حجاج الداخل المحدودة"
          className="h-40 w-auto object-contain drop-shadow-md"
        />
      </div>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">نظام التوثيق والمتابعة</h1>
          <p className="text-muted-foreground text-lg">حدد الشركة التي ترغب في العمل عليها</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {companies.map((company) => (
            <Card
              key={company.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${company.borderColor} ${company.hoverBorder} hover:shadow-xl hover:-translate-y-2 bg-white/95 backdrop-blur-sm overflow-hidden group`}
              onClick={() => handleSelect(company.id)}
            >
              <div className={`h-1.5 ${company.accentColor}`} />
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-36 h-36 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">{company.name}</h2>
                <p className="text-sm text-muted-foreground">{company.nameEn}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

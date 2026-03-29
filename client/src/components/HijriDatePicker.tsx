import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HIJRI_MONTHS, formatHijriDate } from "@shared/hijriUtils";

interface HijriDatePickerProps {
  value: string; // "1447/10/09"
  onChange: (value: string) => void;
  className?: string;
}

// نطاق السنوات الهجرية المتاح
const HIJRI_YEAR_START = 1440;
const HIJRI_YEAR_END = 1460;

function parseHijri(value: string): { year: number; month: number; day: number } {
  const parts = value.split("/");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
  }
  return { year: 1447, month: 1, day: 1 };
}

// عدد أيام الشهر الهجري (تقريبي: يتناوب بين 29 و30)
function daysInHijriMonth(month: number): number {
  return month % 2 === 1 ? 30 : 29;
}

export default function HijriDatePicker({ value, onChange, className }: HijriDatePickerProps) {
  const { year, month, day } = parseHijri(value);
  const maxDays = daysInHijriMonth(month);

  const handleChange = (field: "year" | "month" | "day", newVal: number) => {
    let y = year, m = month, d = day;
    if (field === "year") y = newVal;
    if (field === "month") m = newVal;
    if (field === "day") d = newVal;
    // تصحيح اليوم إذا تجاوز عدد أيام الشهر الجديد
    const maxD = daysInHijriMonth(m);
    if (d > maxD) d = maxD;
    onChange(formatHijriDate(y, m, d));
  };

  return (
    <div className={`flex gap-2 ${className ?? ""}`} dir="rtl">
      {/* السنة */}
      <Select value={String(year)} onValueChange={(v) => handleChange("year", parseInt(v))}>
        <SelectTrigger className="w-[90px]">
          <SelectValue placeholder="السنة" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: HIJRI_YEAR_END - HIJRI_YEAR_START + 1 }, (_, i) => {
            const y = HIJRI_YEAR_START + i;
            return (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* الشهر */}
      <Select value={String(month)} onValueChange={(v) => handleChange("month", parseInt(v))}>
        <SelectTrigger className="flex-1 min-w-[130px]">
          <SelectValue placeholder="الشهر" />
        </SelectTrigger>
        <SelectContent>
          {HIJRI_MONTHS.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {String(i + 1).padStart(2, "0")} - {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* اليوم */}
      <Select value={String(day)} onValueChange={(v) => handleChange("day", parseInt(v))}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="اليوم" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: maxDays }, (_, i) => {
            const d = i + 1;
            return (
              <SelectItem key={d} value={String(d)}>
                {String(d).padStart(2, "0")}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

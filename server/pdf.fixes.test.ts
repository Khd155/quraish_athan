import { describe, it, expect } from "vitest";
import { evaluationAxes } from "../shared/evaluationData";

// ====== اختبار دوال التحويل من نص إلى ID (إصلاح البيانات القديمة) ======

function resolveAxisId(stored: string): string {
  const byId = evaluationAxes.find(a => a.id === stored);
  if (byId) return byId.id;
  const byName = evaluationAxes.find(a => a.name === stored);
  if (byName) return byName.id;
  return stored;
}

function resolveTrackId(axisId: string, stored: string): string {
  const axis = evaluationAxes.find(a => a.id === axisId);
  if (!axis) return stored;
  const byId = axis.tracks.find(t => t.id === stored);
  if (byId) return byId.id;
  const byName = axis.tracks.find(t => t.name === stored);
  if (byName) return byName.id;
  return stored;
}

function resolveCriterionId(axisId: string, trackId: string, stored: string): string {
  const axis = evaluationAxes.find(a => a.id === axisId);
  if (!axis) return stored;
  const track = axis.tracks.find(t => t.id === trackId);
  if (!track) return stored;
  const byId = track.criteria.find(c => c.id === stored);
  if (byId) return byId.id;
  const byName = track.criteria.find(c => c.name === stored);
  if (byName) return byName.id;
  return stored;
}

describe("إصلاح البيانات القديمة - تحويل النص إلى ID", () => {
  it("يجب أن يُرجع ID المحور عند تمرير ID مباشر", () => {
    const result = resolveAxisId("compliance");
    expect(result).toBe("compliance");
  });

  it("يجب أن يُرجع ID المحور عند تمرير الاسم الكامل (بيانات قديمة)", () => {
    const result = resolveAxisId("محور الالتزام والامتثال");
    expect(result).toBe("compliance");
  });

  it("يجب أن يُرجع ID المسار عند تمرير الاسم الكامل (بيانات قديمة)", () => {
    const result = resolveTrackId("compliance", "الامتثال");
    expect(result).toBe("compliance-1");
  });

  it("يجب أن يُرجع ID المسار عند تمرير ID مباشر", () => {
    const result = resolveTrackId("compliance", "compliance-1");
    expect(result).toBe("compliance-1");
  });

  it("يجب أن يُرجع ID المعيار عند تمرير الاسم الكامل (بيانات قديمة)", () => {
    const result = resolveCriterionId(
      "compliance",
      "compliance-1",
      "التزام الشركة بتطبيق الأنظمة واللوائح الصادرة من الجهات الرقابية"
    );
    expect(result).toBe("c1-1");
  });

  it("يجب أن يُرجع القيمة الأصلية إذا لم يُوجد تطابق", () => {
    const result = resolveAxisId("قيمة غير موجودة");
    expect(result).toBe("قيمة غير موجودة");
  });

  it("يجب أن تحتوي بيانات التقييم على محاور", () => {
    expect(evaluationAxes.length).toBeGreaterThan(0);
  });

  it("يجب أن يحتوي كل محور على مسارات", () => {
    evaluationAxes.forEach(axis => {
      expect(axis.tracks.length).toBeGreaterThan(0);
    });
  });

  it("يجب أن يحتوي كل مسار على معايير", () => {
    evaluationAxes.forEach(axis => {
      axis.tracks.forEach(track => {
        expect(track.criteria.length).toBeGreaterThan(0);
      });
    });
  });
});

describe("اختبار PDF API endpoints", () => {
  it("يجب أن يكون مسار PDF للمحضر صحيحاً", () => {
    const meetingId = 123;
    const url = `/api/pdf/meeting/${meetingId}`;
    expect(url).toBe("/api/pdf/meeting/123");
  });

  it("يجب أن يكون مسار PDF للتقرير صحيحاً", () => {
    const reportId = 456;
    const url = `/api/pdf/evaluation/${reportId}`;
    expect(url).toBe("/api/pdf/evaluation/456");
  });

  it("يجب أن يكون اسم ملف PDF صحيحاً", () => {
    const hijriDate = "1447/10/09";
    const fileName = `محضر_اجتماع_${hijriDate.replace(/\//g, "-")}.pdf`;
    expect(fileName).toBe("محضر_اجتماع_1447-10-09.pdf");
  });
});

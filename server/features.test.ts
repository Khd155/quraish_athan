import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  gregorianToHijri,
  formatHijriDate,
  getDayOfWeek,
  getDayFromHijriDate,
  hijriToGregorian,
  DAYS_OF_WEEK,
  HIJRI_MONTHS,
} from "../shared/hijriUtils";
import {
  evaluationAxes,
  getTracksByAxis,
  getCriteriaByTrack,
} from "../shared/evaluationData";

// ============ Helper: Create mock contexts ============
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-test",
    email: "admin@test.com",
    name: "مدير النظام",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-test",
    email: "user@test.com",
    name: "مستخدم عادي",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ============ 1. Hijri Date Utilities ============
describe("Hijri Date Utilities", () => {
  it("converts Gregorian to Hijri correctly", () => {
    const date = new Date(2025, 2, 28); // March 28, 2025
    const hijri = gregorianToHijri(date);
    expect(hijri.year).toBeGreaterThanOrEqual(1446);
    expect(hijri.year).toBeLessThanOrEqual(1447);
    expect(hijri.month).toBeGreaterThanOrEqual(1);
    expect(hijri.month).toBeLessThanOrEqual(12);
    expect(hijri.day).toBeGreaterThanOrEqual(1);
    expect(hijri.day).toBeLessThanOrEqual(30);
  });

  it("formats Hijri date correctly", () => {
    const formatted = formatHijriDate(1447, 1, 5);
    expect(formatted).toBe("1447/01/05");
  });

  it("formats Hijri date with padding", () => {
    const formatted = formatHijriDate(1447, 10, 9);
    expect(formatted).toBe("1447/10/09");
  });

  it("gets day of week from Gregorian date", () => {
    const day = getDayOfWeek(new Date(2025, 2, 28)); // Friday
    expect(DAYS_OF_WEEK).toContain(day);
  });

  it("DAYS_OF_WEEK has 7 days", () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("HIJRI_MONTHS has 12 months", () => {
    expect(HIJRI_MONTHS).toHaveLength(12);
  });

  it("hijriToGregorian returns a valid Date", () => {
    const date = hijriToGregorian(1447, 1, 1);
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it("getDayFromHijriDate returns a valid day name", () => {
    const day = getDayFromHijriDate("1447/01/01");
    expect(day).toBeTruthy();
    expect(DAYS_OF_WEEK).toContain(day);
  });

  it("getDayFromHijriDate returns empty for invalid input", () => {
    expect(getDayFromHijriDate("invalid")).toBe("");
    expect(getDayFromHijriDate("1447/13/01")).toBe("");
    expect(getDayFromHijriDate("1447/01/31")).toBe("");
  });

  it("round-trip: Gregorian -> Hijri -> Gregorian preserves approximate date", () => {
    const original = new Date(2025, 5, 15);
    const hijri = gregorianToHijri(original);
    const roundTrip = hijriToGregorian(hijri.year, hijri.month, hijri.day);
    // Allow 2 days difference due to approximation
    const diffDays = Math.abs(original.getTime() - roundTrip.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeLessThan(3);
  });
});

// ============ 2. Evaluation Data Structure ============
describe("Evaluation Data Structure", () => {
  it("has exactly 2 axes", () => {
    expect(evaluationAxes).toHaveLength(2);
  });

  it("first axis is الالتزام والامتثال", () => {
    expect(evaluationAxes[0].name).toContain("الالتزام");
  });

  it("second axis is جودة أداء الخدمات", () => {
    expect(evaluationAxes[1].name).toContain("جودة");
  });

  it("getTracksByAxis returns tracks for valid axis", () => {
    const tracks = getTracksByAxis(evaluationAxes[0].id);
    expect(tracks.length).toBeGreaterThan(0);
  });

  it("getTracksByAxis returns empty for invalid axis", () => {
    const tracks = getTracksByAxis("invalid-axis");
    expect(tracks).toHaveLength(0);
  });

  it("getCriteriaByTrack returns criteria for valid track", () => {
    const tracks = getTracksByAxis(evaluationAxes[0].id);
    if (tracks.length > 0) {
      const criteria = getCriteriaByTrack(evaluationAxes[0].id, tracks[0].id);
      expect(criteria.length).toBeGreaterThan(0);
    }
  });

  it("getCriteriaByTrack returns empty for invalid track", () => {
    const criteria = getCriteriaByTrack(evaluationAxes[0].id, "invalid-track");
    expect(criteria).toHaveLength(0);
  });

  it("first axis has 8 tracks (compliance)", () => {
    const tracks = getTracksByAxis(evaluationAxes[0].id);
    expect(tracks).toHaveLength(8);
  });

  it("second axis has 7 tracks (quality)", () => {
    const tracks = getTracksByAxis(evaluationAxes[1].id);
    expect(tracks).toHaveLength(7);
  });

  it("each track has at least one criterion", () => {
    for (const axis of evaluationAxes) {
      const tracks = getTracksByAxis(axis.id);
      for (const track of tracks) {
        expect(track.criteria.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ============ 3. Auth & Role-Based Access ============
describe("Auth & Role-Based Access", () => {
  it("auth.me returns user for authenticated context", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.role).toBe("admin");
  });

  it("auth.me returns null for anonymous context", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("admin can access stats.overview", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.overview();
    expect(result).toHaveProperty("totalMeetings");
    expect(result).toHaveProperty("totalReports");
    expect(result).toHaveProperty("totalUsers");
  });

  it("regular user cannot access stats.overview", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.stats.overview()).rejects.toThrow();
  });

  it("admin can access users.list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("regular user cannot access users.list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("anonymous user cannot create meetings", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.meetings.create({
        company: "quraish",
        hijriDate: "1447/01/01",
        dayOfWeek: "السبت",
        title: "اجتماع تجريبي",
        status: "draft",
      })
    ).rejects.toThrow();
  });

  it("anonymous user cannot access admin routes", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
    await expect(caller.stats.overview()).rejects.toThrow();
  });
});

// ============ 4. Router Structure ============
describe("Router Structure", () => {
  it("appRouter has auth namespace", () => {
    expect(appRouter._def.procedures).toBeDefined();
  });

  it("auth.logout works for authenticated user", async () => {
    const user: AuthenticatedUser = {
      id: 1,
      openId: "test",
      email: "test@test.com",
      name: "Test",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const cookies: any[] = [];
    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, opts: any) => cookies.push({ name, opts }),
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cookies.length).toBe(1);
  });
});

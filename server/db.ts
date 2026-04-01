import { eq, desc, and, like, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertMeeting, meetings,
  InsertEvaluationReport, evaluationReports,
  InsertAttachment, attachments,
  reportCounters,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ عمليات المستخدمين ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  username: string;
  password: string;
  name: string;
  role: "admin" | "user";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await bcrypt.hash(data.password, 12);
  const openId = `local_${data.username}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    username: data.username,
    passwordHash,
    name: data.name,
    role: data.role,
    loginMethod: "local",
    lastSignedIn: new Date(),
  });
  return getUserByUsername(data.username);
}

export async function verifyLocalUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || !user.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  // Update last signed in
  const db = await getDb();
  if (db) {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  }
  return user;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    role: users.role,
    email: users.email,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) return;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ============ عمليات محاضر الاجتماعات ============
export async function createMeeting(data: InsertMeeting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(meetings).values(data);
  return result[0].insertId;
}

export async function updateMeeting(id: number, data: Partial<InsertMeeting>) {
  const db = await getDb();
  if (!db) return;
  await db.update(meetings).set(data).where(eq(meetings.id, id));
}

export async function getMeetingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMeetingsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetings).where(eq(meetings.createdById, userId)).orderBy(desc(meetings.createdAt));
}

export async function getAllMeetings(filters?: { company?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.company && filters.company !== "all") {
    conditions.push(eq(meetings.company, filters.company as any));
  }
  if (filters?.search) {
    conditions.push(like(meetings.title, `%${filters.search}%`));
  }
  if (conditions.length > 0) {
    return db.select().from(meetings).where(and(...conditions)).orderBy(desc(meetings.createdAt));
  }
  return db.select().from(meetings).orderBy(desc(meetings.createdAt));
}

export async function deleteMeeting(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attachments).where(and(eq(attachments.entityType, "meeting"), eq(attachments.entityId, id)));
  await db.delete(meetings).where(eq(meetings.id, id));
}

// ============ عمليات تقارير التقييم ============
// دالة مشتركة لجلب أكبر رقم من المحاضر والتقارير
export async function getNextDocumentNumber(hijriYear: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // جلب أكبر رقم من التقارير
  const reportCounterRecord = await db.select().from(reportCounters).where(eq(reportCounters.year, hijriYear)).limit(1);
  const reportLastNumber = reportCounterRecord.length > 0 ? reportCounterRecord[0].lastNumber : 0;

  // جلب أكبر رقم من المحاضر (من معرّف آخر محضر)
  const lastMeeting = await db.select().from(meetings).orderBy(desc(meetings.id)).limit(1);
  const meetingLastNumber = lastMeeting.length > 0 ? lastMeeting[0].id : 0;

  // أخذ أكبر قيمة من الاثنين
  const nextNum = Math.max(reportLastNumber, meetingLastNumber) + 1;

  // تحديث جدول reportCounters
  if (reportCounterRecord.length === 0) {
    await db.insert(reportCounters).values({ year: hijriYear, lastNumber: nextNum });
  } else {
    await db.update(reportCounters).set({ lastNumber: nextNum }).where(eq(reportCounters.id, reportCounterRecord[0].id));
  }

  return `${hijriYear}/${String(nextNum).padStart(4, "0")}`;
}

export async function getNextReportNumber(hijriYear: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(reportCounters).where(eq(reportCounters.year, hijriYear)).limit(1);
  let nextNum: number;
  if (existing.length === 0) {
    await db.insert(reportCounters).values({ year: hijriYear, lastNumber: 1 });
    nextNum = 1;
  } else {
    nextNum = existing[0].lastNumber + 1;
    await db.update(reportCounters).set({ lastNumber: nextNum }).where(eq(reportCounters.id, existing[0].id));
  }
  return `${hijriYear}/${String(nextNum).padStart(4, "0")}`;
}

export async function createEvaluationReport(data: InsertEvaluationReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(evaluationReports).values(data);
  return result[0].insertId;
}

export async function updateEvaluationReport(id: number, data: Partial<InsertEvaluationReport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(evaluationReports).set(data).where(eq(evaluationReports.id, id));
}

export async function getEvaluationReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluationReports).where(eq(evaluationReports.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEvaluationReportsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evaluationReports).where(eq(evaluationReports.createdById, userId)).orderBy(desc(evaluationReports.createdAt));
}

export async function getAllEvaluationReports(filters?: { company?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.company && filters.company !== "all") {
    conditions.push(eq(evaluationReports.company, filters.company as any));
  }
  if (filters?.search) {
    conditions.push(or(
      like(evaluationReports.axis, `%${filters.search}%`),
      like(evaluationReports.track, `%${filters.search}%`),
      like(evaluationReports.criterion, `%${filters.search}%`),
    ));
  }
  if (conditions.length > 0) {
    return db.select().from(evaluationReports).where(and(...conditions)).orderBy(desc(evaluationReports.createdAt));
  }
  return db.select().from(evaluationReports).orderBy(desc(evaluationReports.createdAt));
}

export async function deleteEvaluationReport(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attachments).where(and(eq(attachments.entityType, "evaluation"), eq(attachments.entityId, id)));
  await db.delete(evaluationReports).where(eq(evaluationReports.id, id));
}

// ============ عمليات المرفقات ============
export async function createAttachment(data: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attachments).values(data);
  return result[0].insertId;
}

export async function getAttachmentsByEntity(entityType: "meeting" | "evaluation", entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments)
    .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
    .orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attachments).where(eq(attachments.id, id));
}

// ============ إحصائيات ============
export async function getStats() {
  const db = await getDb();
  if (!db) return { totalMeetings: 0, totalReports: 0, totalUsers: 0, draftMeetings: 0, draftReports: 0, finalMeetings: 0, finalReports: 0, quraishMeetings: 0, azanMeetings: 0, quraishReports: 0, azanReports: 0 };

  const [meetingStats] = await db.select({
    total: sql<number>`COUNT(*)`,
    drafts: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
    finals: sql<number>`SUM(CASE WHEN status = 'final' THEN 1 ELSE 0 END)`,
    quraish: sql<number>`SUM(CASE WHEN company = 'quraish' THEN 1 ELSE 0 END)`,
    azan: sql<number>`SUM(CASE WHEN company = 'azan' THEN 1 ELSE 0 END)`,
  }).from(meetings);

  const [reportStats] = await db.select({
    total: sql<number>`COUNT(*)`,
    drafts: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
    finals: sql<number>`SUM(CASE WHEN status = 'final' THEN 1 ELSE 0 END)`,
    quraish: sql<number>`SUM(CASE WHEN company = 'quraish' THEN 1 ELSE 0 END)`,
    azan: sql<number>`SUM(CASE WHEN company = 'azan' THEN 1 ELSE 0 END)`,
  }).from(evaluationReports);

  const [userStats] = await db.select({
    total: sql<number>`COUNT(*)`,
  }).from(users);

  return {
    totalMeetings: Number(meetingStats.total) || 0,
    totalReports: Number(reportStats.total) || 0,
    totalUsers: Number(userStats.total) || 0,
    draftMeetings: Number(meetingStats.drafts) || 0,
    draftReports: Number(reportStats.drafts) || 0,
    finalMeetings: Number(meetingStats.finals) || 0,
    finalReports: Number(reportStats.finals) || 0,
    quraishMeetings: Number(meetingStats.quraish) || 0,
    azanMeetings: Number(meetingStats.azan) || 0,
    quraishReports: Number(reportStats.quraish) || 0,
    azanReports: Number(reportStats.azan) || 0,
  };
}

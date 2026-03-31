import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

// ============ جدول المستخدمين ============
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // حقول المصادقة المحلية
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ جدول محاضر الاجتماعات ============
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  company: mysqlEnum("company", ["quraish", "azan"]).notNull(),
  hijriDate: varchar("hijriDate", { length: 20 }).notNull(),
  gregorianDate: varchar("gregorianDate", { length: 20 }),
  dayOfWeek: varchar("dayOfWeek", { length: 20 }).notNull(),
  title: text("title").notNull(),
  elements: text("elements"),
  recommendations: text("recommendations"),
  department: mysqlEnum("department", ["technology", "catering", "transport", "cultural", "media", "supervisors", "registration", "mina_preparation", "arafat_preparation", "muzdalifah_preparation", "quality", "other"]),
  customDepartment: varchar("customDepartment", { length: 255 }),
  attendees: json("attendees"),
  status: mysqlEnum("status", ["draft", "final"]).default("draft").notNull(),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }),
  pdfUrl: text("pdfUrl"),
  pdfKey: text("pdfKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

// ============ جدول تقارير التقييم ============
export const evaluationReports = mysqlTable("evaluation_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportNumber: varchar("reportNumber", { length: 20 }).notNull().unique(),
  company: mysqlEnum("company", ["quraish", "azan"]).notNull(),
  hijriDate: varchar("hijriDate", { length: 20 }).notNull(),
  dayOfWeek: varchar("dayOfWeek", { length: 20 }).notNull(),
  axis: varchar("axis", { length: 255 }).notNull(),
  track: varchar("track", { length: 255 }).notNull(),
  criterion: varchar("criterion", { length: 500 }).notNull(),
  score: int("score"),
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "final"]).default("draft").notNull(),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }),
  pdfUrl: text("pdfUrl"),
  pdfKey: text("pdfKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EvaluationReport = typeof evaluationReports.$inferSelect;
export type InsertEvaluationReport = typeof evaluationReports.$inferInsert;

// ============ جدول المرفقات والشواهد ============
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["meeting", "evaluation"]).notNull(),
  entityId: int("entityId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

// ============ جدول عداد الترقيم ============
export const reportCounters = mysqlTable("report_counters", {
  id: int("id").autoincrement().primaryKey(),
  year: varchar("year", { length: 10 }).notNull(),
  lastNumber: int("lastNumber").default(0).notNull(),
});

export type ReportCounter = typeof reportCounters.$inferSelect;

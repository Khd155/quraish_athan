import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { uploadPdfToGoogleDrive } from "./googleDrive";
import { generateMeetingPdf, generateEvaluationPdf } from "./pdfGenerator";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // تسجيل دخول محلي
    localLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.verifyLocalUser(input.username, input.password);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, name: user.name, role: user.role, username: user.username } };
      }),
  }),

  // ============ إدارة المستخدمين (Admin فقط) ============
  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    create: adminProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(["admin", "user"]),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم موجود مسبقاً" });
        }
        return db.createLocalUser(input);
      }),
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.userId);
        return { success: true };
      }),
    resetPassword: adminProcedure
      .input(z.object({ userId: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        await db.updateUserPassword(input.userId, input.newPassword);
        return { success: true };
      }),
  }),

  // ============ محاضر الاجتماعات ============
  meetings: router({
    create: protectedProcedure
      .input(z.object({
        company: z.enum(["quraish", "azan"]),
        hijriDate: z.string(),
        gregorianDate: z.string().optional(),
        dayOfWeek: z.string(),
        title: z.string(),
        elements: z.string().optional(),
        recommendations: z.string().optional(),
        department: z.enum(["technology", "catering", "transport", "cultural", "media", "supervisors"]).optional(),
        attendees: z.array(z.string()).optional(),
        status: z.enum(["draft", "final"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createMeeting({
          ...input,
          attendees: input.attendees ?? [],
          createdById: ctx.user.id,
          createdByName: ctx.user.name ?? "",
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        company: z.enum(["quraish", "azan"]).optional(),
        hijriDate: z.string().optional(),
        gregorianDate: z.string().optional(),
        dayOfWeek: z.string().optional(),
        title: z.string().optional(),
        elements: z.string().optional(),
        recommendations: z.string().optional(),
        department: z.enum(["technology", "catering", "transport", "cultural", "media", "supervisors"]).optional(),
        attendees: z.array(z.string()).optional(),
        status: z.enum(["draft", "final"]).optional(),
        pdfUrl: z.string().optional(),
        pdfKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMeeting(id, data);
        return { success: true };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetingById(input.id);
      }),
    myMeetings: protectedProcedure.query(async ({ ctx }) => {
      return db.getMeetingsByUser(ctx.user.id);
    }),
    all: adminProcedure
      .input(z.object({
        company: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllMeetings(input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const meeting = await db.getMeetingById(input.id);
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
        if (meeting.createdById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deleteMeeting(input.id);
        return { success: true };
      }),
  }),

  // ============ تقارير التقييم ============
  evaluations: router({
    create: protectedProcedure
      .input(z.object({
        company: z.enum(["quraish", "azan"]),
        hijriDate: z.string(),
        dayOfWeek: z.string(),
        axis: z.string(),
        track: z.string(),
        criterion: z.string(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "final"]).default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const hijriYear = input.hijriDate.split("/")[0] || "1447";
        const reportNumber = await db.getNextDocumentNumber(hijriYear);
        const id = await db.createEvaluationReport({
          ...input,
          reportNumber,
          createdById: ctx.user.id,
          createdByName: ctx.user.name ?? "",
        });
        return { id, reportNumber };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        company: z.enum(["quraish", "azan"]).optional(),
        hijriDate: z.string().optional(),
        dayOfWeek: z.string().optional(),
        axis: z.string().optional(),
        track: z.string().optional(),
        criterion: z.string().optional(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "final"]).optional(),
        pdfUrl: z.string().optional(),
        pdfKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEvaluationReport(id, data);
        return { success: true };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEvaluationReportById(input.id);
      }),
    myReports: protectedProcedure.query(async ({ ctx }) => {
      return db.getEvaluationReportsByUser(ctx.user.id);
    }),
    all: adminProcedure
      .input(z.object({
        company: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllEvaluationReports(input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const report = await db.getEvaluationReportById(input.id);
        if (!report) throw new TRPCError({ code: "NOT_FOUND" });
        if (report.createdById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deleteEvaluationReport(input.id);
        return { success: true };
      }),
  }),

  // ============ المرفقات ============
  attachments: router({
    upload: protectedProcedure
      .input(z.object({
        entityType: z.enum(["meeting", "evaluation"]),
        entityId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        fileSize: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `attachments/${input.entityType}/${input.entityId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const id = await db.createAttachment({
          entityType: input.entityType,
          entityId: input.entityId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: fileKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          uploadedById: ctx.user.id,
        });
        return { id, url, fileKey };
      }),
    getByEntity: protectedProcedure
      .input(z.object({
        entityType: z.enum(["meeting", "evaluation"]),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getAttachmentsByEntity(input.entityType, input.entityId);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAttachment(input.id);
        return { success: true };
      }),
  }),

  // ============ الإحصائيات ============
  stats: router({
    overview: adminProcedure.query(async () => {
      return db.getStats();
    }),
  }),

  // ============ تصدير إلى Google Drive ============
  googleDrive: router({
    exportMeeting: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const meeting = await db.getMeetingById(input.id);
          if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "المحضر غير موجود" });

          // توليد PDF
          const pdfBuffer = await generateMeetingPdf({
            id: meeting.id,
            title: meeting.title,
            hijriDate: meeting.hijriDate,
            dayOfWeek: meeting.dayOfWeek,
            elements: (typeof meeting.elements === 'string' ? meeting.elements.split('\n').filter(e => e.trim()) : meeting.elements) || [],
            recommendations: (typeof meeting.recommendations === 'string' ? meeting.recommendations.split('\n').filter(r => r.trim()) : meeting.recommendations) || [],
            attendees: (typeof meeting.attendees === 'string' ? [meeting.attendees] : Array.isArray(meeting.attendees) ? meeting.attendees : []) || [],
            company: meeting.company,
            department: meeting.department || undefined,
            meetingNumber: `1447/${String(meeting.id).padStart(4, "0")}`, // TODO: استخدام getNextDocumentNumber
            createdByName: meeting.createdByName || "",
          });

          // رفع إلى Google Drive
          const fileName = `محضر_${meeting.hijriDate}_${meeting.title?.slice(0, 20) || "بدون_عنوان"}.pdf`;
          const result = await uploadPdfToGoogleDrive(pdfBuffer, fileName, "meeting");

          if (result.success) {
            return { success: true, fileId: result.fileId, fileUrl: result.fileUrl };
          } else {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
          }
        } catch (error: any) {
          console.error("خطأ في تصدير المحضر:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "فشل التصدير" });
        }
      }),

    exportEvaluation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const report = await db.getEvaluationReportById(input.id);
          if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "التقرير غير موجود" });

          // توليد PDF
          const pdfBuffer = await generateEvaluationPdf({
            id: report.id,
            reportNumber: report.reportNumber,
            company: report.company,
            hijriDate: report.hijriDate,
            dayOfWeek: report.dayOfWeek,
            axis: report.axis,
            track: report.track,
            criterion: report.criterion,
            score: report.score || 0,
            notes: report.notes || "",
            createdByName: report.createdByName || "",
          });

          // رفع إلى Google Drive
          const fileName = `تقرير_${report.reportNumber}_${report.axis?.slice(0, 15) || "بدون_محور"}.pdf`;
          const result = await uploadPdfToGoogleDrive(pdfBuffer, fileName, "evaluation");

          if (result.success) {
            return { success: true, fileId: result.fileId, fileUrl: result.fileUrl };
          } else {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
          }
        } catch (error: any) {
          console.error("خطأ في تصدير التقرير:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "فشل التصدير" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

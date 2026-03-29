import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";
import { generateMeetingPdf, generateEvaluationPdf } from "../pdfGenerator";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // PDF Generation Routes (using pdf-lib Node.js - works in Production)
  app.get("/api/pdf/meeting/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meeting = await db.getMeetingById(id);
      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      const pdfBuffer = await generateMeetingPdf({
        id: meeting.id,
        company: meeting.company,
        hijriDate: meeting.hijriDate,
        dayOfWeek: meeting.dayOfWeek || "",
        title: meeting.title,
        elements: meeting.elements || "",
        recommendations: meeting.recommendations || "",
        department: meeting.department || undefined,
        attendees: (meeting.attendees as string[]) || [],
        createdByName: meeting.createdByName || undefined,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="meeting_${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      res.status(500).json({ error: "فشل في إنشاء PDF: " + err.message });
    }
  });

  app.get("/api/pdf/evaluation/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await db.getEvaluationReportById(id);
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      const pdfBuffer = await generateEvaluationPdf({
        id: report.id,
        company: report.company,
        hijriDate: report.hijriDate,
        dayOfWeek: report.dayOfWeek || "",
        axis: report.axis || "",
        track: report.track || "",
        criterion: report.criterion || "",
        score: report.score || 0,
        notes: report.notes || "",
        reportNumber: report.reportNumber || String(report.id),
        createdByName: report.createdByName || undefined,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="evaluation_${report.reportNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      res.status(500).json({ error: "فشل في إنشاء PDF: " + err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

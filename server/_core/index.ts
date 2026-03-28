import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { spawn, ChildProcess } from "child_process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_SERVICE_PORT = 5050;
let pdfServiceProcess: ChildProcess | null = null;

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

function startPdfService(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Kill any existing process on port 5050
    try {
      const { execSync } = await import('child_process');
      execSync(`fuser -k ${PDF_SERVICE_PORT}/tcp 2>/dev/null || true`);
      await new Promise(r => setTimeout(r, 500));
    } catch { /* ignore */ }
    const scriptPath = path.join(__dirname, "../pdf_service.py");
    // Use python3.11 explicitly to avoid version conflicts with uv/python3.13
    const pythonBin = "/usr/bin/python";
    // Remove PYTHONHOME/PYTHONPATH to prevent Python 3.13 (uv) from interfering
    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONHOME;
    delete cleanEnv.PYTHONPATH;
    delete cleanEnv.NUITKA_PYTHONPATH;
    pdfServiceProcess = spawn(pythonBin, [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: cleanEnv,
    });

    pdfServiceProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg.includes("running on port")) {
        console.log(`[PDF Service] ${msg}`);
        resolve();
      }
    });

    pdfServiceProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes("UserWarning") && !msg.includes("fonttools")) {
        console.error(`[PDF Service Error] ${msg}`);
      }
    });

    pdfServiceProcess.on("error", (err) => {
      console.error("[PDF Service] Failed to start:", err.message);
      reject(err);
    });

    // Timeout fallback
    setTimeout(() => resolve(), 4000);
  });
}

async function callPdfService(endpoint: string, data: object): Promise<Buffer> {
  try {
    const response = await fetch(`http://127.0.0.1:${PDF_SERVICE_PORT}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PDF Service] Error response (${response.status}):`, errText.substring(0, 200));
      throw new Error(`PDF service error (${response.status}): ${errText.substring(0, 100)}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("PDF service returned empty response");
    }
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error(`[PDF Service] Call failed for ${endpoint}:`, err.message);
    throw err;
  }
}

async function startServer() {
  // Start the Python PDF service
  try {
    await startPdfService();
  } catch (err) {
    console.error("[PDF Service] Could not start, PDF generation will be unavailable:", err);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // PDF Generation Routes (using WeasyPrint Python service for proper Arabic support)
  app.get("/api/pdf/meeting/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meeting = await db.getMeetingById(id);
      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      const pdfBuffer = await callPdfService("/pdf/meeting", {
        company: meeting.company,
        hijriDate: meeting.hijriDate,
        dayOfWeek: meeting.dayOfWeek,
        title: meeting.title,
        objectives: meeting.objectives,
        recommendations: meeting.recommendations,
        department: meeting.department,
        attendees: meeting.attendees as string[],
        createdByName: meeting.createdByName,
        status: meeting.status,
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
      const pdfBuffer = await callPdfService("/pdf/evaluation", {
        company: report.company,
        hijriDate: report.hijriDate,
        dayOfWeek: report.dayOfWeek,
        axis: report.axis,
        track: report.track,
        criterion: report.criterion,
        score: report.score,
        notes: report.notes,
        reportNumber: report.reportNumber,
        createdByName: report.createdByName,
        status: report.status,
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

  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    if (pdfServiceProcess) pdfServiceProcess.kill();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    if (pdfServiceProcess) pdfServiceProcess.kill();
    process.exit(0);
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

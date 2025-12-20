// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import uploadRoutes from "./routes/uploadRoutes.js";
import excelUploadRoutes from "./routes/excelUploadRoutes.js";
import serviceManagerRoutes from "./routes/serviceManagerRoutes.js";
import rbacRoutes from "./routes/rbacRoutes.js";
import bookingListRoutes from "./routes/bookingListRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import carServiceRoutes from "./routes/carServiceRoutes.js";

// Middleware
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();
const app = express();

/* -------------------- __dirname for ES Modules -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- Upload folders -------------------- */
const uploadsDir = path.join(__dirname, "uploads");
const excelUploadsDir = path.join(__dirname, "uploads", "excel");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

if (!fs.existsSync(excelUploadsDir)) {
  fs.mkdirSync(excelUploadsDir, { recursive: true });
  console.log("📁 Created Excel uploads directory");
}

// Configure CORS with explicit options
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development, or specific origins in production
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, you can whitelist specific origins if needed
    // For now, allow all origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// CORS middleware already handles preflight OPTIONS requests automatically
// No need for explicit app.options() - the cors() middleware handles it

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/* -------------------- Routes -------------------- */
app.use("/api", uploadRoutes);
app.use("/api/excel", excelUploadRoutes);
app.use("/api/service-manager", serviceManagerRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/booking-list", bookingListRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", carServiceRoutes);

/* -------------------- Health Check -------------------- */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Auto Backend API is running",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

/* -------------------- 404 Handler -------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

/* -------------------- Global Error Handler -------------------- */
app.use(errorHandler);

/* -------------------- MongoDB Connection -------------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB URI:", process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");

    if (process.env.NODE_ENV !== "production") {
      const PORT = process.env.PORT || 5000;
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });

      // Graceful shutdown
      process.on("SIGTERM", () => {
        console.log("SIGTERM received, shutting down...");
        server.close(() => {
          console.log("Process terminated");
        });
      });
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

/* -------------------- Export for Vercel / Testing -------------------- */
export default app;

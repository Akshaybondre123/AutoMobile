import express from "express";
import multer from "multer";
import { 
  uploadExcel, 
  getUploadHistory, 
  getUploadStats,
  getFileDetails,
  deleteUploadedFile
} from "../controllers/excelUploadController.js";

const router = express.Router();

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads/excel/';
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept Excel files
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls')) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Excel Upload Routes

/**
 * POST /api/excel/upload
 * Upload Excel file with automatic case detection and processing
 * Body: multipart/form-data with file and metadata
 */
router.post("/upload", upload.single("excelFile"), uploadExcel);

/**
 * GET /api/excel/history/:showroomId
 * Get upload history for a specific showroom
 * Query params: fileType (optional), limit (optional)
 */
router.get("/history/:showroomId", getUploadHistory);

/**
 * GET /api/excel/stats/:showroomId
 * Get upload statistics for a specific showroom
 * Query params: fileType (optional)
 */
router.get("/stats/:showroomId", getUploadStats);

/**
 * GET /api/excel/file/:fileId
 * Get detailed information about a specific uploaded file
 */
router.get("/file/:fileId", getFileDetails);

/**
 * DELETE /api/excel/file/:fileId
 * Delete an uploaded file and its associated data
 * Query params: deleteData (boolean) - whether to delete associated data records
 */
router.delete("/file/:fileId", deleteUploadedFile);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.'
      });
    }
  }
  
  if (error.message === "Only Excel files (.xlsx, .xls) are allowed") {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'
    });
  }
  
  next(error);
});

export default router;

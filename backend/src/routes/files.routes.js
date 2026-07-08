import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import {
  uploadFile,
  listFiles,
  downloadFile,
} from "../controllers/files.controller.js";

const uploadsDir = path.resolve("uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// Memory storage, not disk — the controller encrypts the buffer with
// AES-256-GCM before it ever touches disk (see files.controller.js).
// Swap for a multer-s3 storage engine (encrypting the buffer first, same
// as here) when you're ready to move off local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cap, tune to taste
});

const router = Router();

router.post("/upload", upload.single("file"), uploadFile);
router.get("/room/:roomCode", listFiles);
router.get("/:id/download", downloadFile);

export default router;

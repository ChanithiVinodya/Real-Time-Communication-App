import mongoose from "mongoose";

// Only metadata lives in Mongo — the actual file bytes sit encrypted on
// disk under backend/uploads (see files.controller.js). Swap for S3 in
// production: store the S3 key here instead of storedName, encrypt before
// upload the same way, and generate a signed URL on download instead of
// streaming from local disk.
const fileAssetSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, default: "Guest" },
    // AES-256-GCM parameters needed to decrypt this specific file. The key
    // itself lives only in FILE_ENCRYPTION_KEY (an env var), never in Mongo.
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("FileAsset", fileAssetSchema);

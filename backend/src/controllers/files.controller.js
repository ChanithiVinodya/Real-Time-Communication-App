import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import FileAsset from '../models/FileAsset.js';
import User from '../models/User.js';

const ENCRYPTION_KEY = Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex'); // 32 bytes for AES-256
const DOWNLOAD_TOKEN_TTL_MS = 60 * 60 * 1000; // signed download links expire after 1 hour

// --- Signed, expiring download links --------------------------------
//
// Anyone with a file's Mongo id could otherwise guess/enumerate download
// URLs. Each link instead carries an expiry + HMAC signature so it's only
// valid for a limited window and can't be forged without JWT_SECRET.

function signDownloadToken(fileId) {
  const expires = Date.now() + DOWNLOAD_TOKEN_TTL_MS;
  const payload = `${fileId}.${expires}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  return `${expires}.${signature}`;
}

function verifyDownloadToken(token, fileId) {
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  if (Date.now() > Number(expires)) return false;

  const payload = `${fileId}.${expires}`;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');

  // Constant-time comparison — a plain === here would leak timing
  // information an attacker could use to guess the signature byte by byte.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function toClientShape(asset) {
  return {
    id: asset._id,
    originalName: asset.originalName,
    size: asset.size,
    mimeType: asset.mimeType,
    uploadedBy: asset.uploadedBy,
    createdAt: asset.createdAt,
    downloadUrl: `/api/files/${asset._id}/download?token=${signDownloadToken(asset._id.toString())}`,
  };
}

export async function uploadFile(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'roomCode is required' });

    // requireAuth guarantees req.userId is a verified id, not something
    // the client typed in — look the display name up rather than trust a
    // client-supplied "uploadedBy" field.
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // AES-256-GCM: a fresh random IV per file, and an auth tag that lets
    // decryption detect if the ciphertext was tampered with.
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const storedName = `${crypto.randomUUID()}.enc`;
    await fs.writeFile(path.resolve('uploads', storedName), encrypted);

    const asset = await FileAsset.create({
      roomCode,
      originalName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user.name,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    });

    // Let everyone currently in the room see the file appear live, instead
    // of only picking it up on their next page load.
    const io = req.app.get('io');
    io.to(roomCode).emit('file-shared', toClientShape(asset));

    res.status(201).json(toClientShape(asset));
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

export async function listFiles(req, res) {
  try {
    const files = await FileAsset.find({ roomCode: req.params.roomCode }).sort({ createdAt: -1 });
    res.json(files.map(toClientShape));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files' });
  }
}

export async function downloadFile(req, res) {
  try {
    const asset = await FileAsset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'File not found' });

    if (!verifyDownloadToken(req.query.token, asset._id.toString())) {
      return res.status(403).json({ error: 'Invalid or expired download link' });
    }

    const encrypted = await fs.readFile(path.resolve('uploads', asset.storedName));
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(asset.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(asset.authTag, 'hex'));
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    res.set('Content-Type', asset.mimeType);
    res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(asset.originalName)}"`);
    res.send(decrypted);
  } catch (err) {
    console.error('Download failed:', err);
    res.status(500).json({ error: 'Download failed' });
  }
}
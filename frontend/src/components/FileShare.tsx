import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { socket } from '../lib/socket';
import { API_BASE_URL } from '../lib/api';
import { getToken } from '../lib/auth';

interface FileMeta {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  downloadUrl: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileShare({ roomCode }: { roomCode: string }) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load whatever's already been shared in this room. Upload/list are
    // protected routes now, so this needs the auth header too.
    fetch(`${API_BASE_URL}/api/files/room/${roomCode}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then(setFiles)
      .catch(() => {});

    // ...then keep the list live for anything shared after we joined.
    socket.on('file-shared', (file: FileMeta) => {
      setFiles((prev) => [file, ...prev]);
    });

    return () => {
      socket.off('file-shared');
    };
  }, [roomCode]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomCode', roomCode);
    // No "uploadedBy" field — the server derives the uploader's name from
    // the verified JWT instead of trusting whatever the client sends.

    try {
      await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      // No need to update state here — the 'file-shared' socket event
      // above fires for every room member, including us, once the upload
      // completes server-side.
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-serif text-xl text-pistachio tracking-wide">
            Shared Room Artifacts
          </h2>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-blue-dust/40 mt-0.5 font-sans">
            Instantly distribute files in real-time
          </p>
        </div>

        {/* Upload button */}
        <label
          className={`flex-shrink-0 px-4 py-1.5 text-[11px] font-semibold tracking-widest uppercase rounded border cursor-pointer transition-all duration-150 font-sans ${
            uploading
              ? 'border-blue-dust/20 text-blue-dust/40 cursor-not-allowed'
              : 'border-pistachio/50 text-pistachio hover:bg-pistachio/10'
          }`}
        >
          {uploading ? 'Uploading…' : 'Upload File'}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-[12px] text-blue-dust/40 font-sans py-4 text-center">
          No files shared yet. Upload something to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between bg-prussian-blue-dark/50 border border-blue-dust/10 rounded-xl px-4 py-3 hover:border-blue-dust/20 transition-colors"
            >
              <div className="min-w-0 mr-4">
                <p className="text-[13px] text-white/80 font-medium truncate font-sans">
                  {f.originalName}
                </p>
                <p className="text-[10px] text-blue-dust/40 tracking-wide uppercase font-sans mt-0.5">
                  {formatSize(f.size)} &bull; Shared by {f.uploadedBy}
                </p>
              </div>
              <a
                href={`${API_BASE_URL}${f.downloadUrl}`}
                className="flex-shrink-0 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase rounded border border-blue-dust/25 text-blue-dust hover:border-pistachio/50 hover:text-pistachio transition-all duration-150 font-sans"
                download
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
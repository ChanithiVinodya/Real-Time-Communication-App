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
    <div className="bg-gray-900 rounded-lg p-3 text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Shared files</h2>
        <label className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-500 cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload file'}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-gray-400">No files shared yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between text-sm bg-gray-800 rounded px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate">{f.originalName}</p>
                <p className="text-xs text-gray-400">
                  {formatSize(f.size)} · shared by {f.uploadedBy}
                </p>
              </div>
              <a
                href={`${API_BASE_URL}${f.downloadUrl}`}
                className="text-blue-400 hover:text-blue-300 ml-3 shrink-0"
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
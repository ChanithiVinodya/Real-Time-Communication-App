import { useEffect, useRef, useState, ChangeEvent } from "react";
import { socket } from "../lib/socket";
import { API_BASE_URL } from "../lib/api";

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
  const displayName = localStorage.getItem("displayName") || "Guest";

  useEffect(() => {
    // Load whatever's already been shared in this room...
    fetch(`${API_BASE_URL}/api/files/room/${roomCode}`)
      .then((res) => res.json())
      .then(setFiles)
      .catch(() => {});

    // ...then keep the list live for anything shared after we joined.
    socket.on("file-shared", (file: FileMeta) => {
      setFiles((prev) => [file, ...prev]);
    });

    return () => {
      socket.off("file-shared");
    };
  }, [roomCode]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomCode", roomCode);
    formData.append("uploadedBy", displayName);

    try {
      await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
      });
      // No need to update state here — the 'file-shared' socket event
      // above fires for every room member, including us, once the upload
      // completes server-side.
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bg-prussian-blue/40 rounded-2xl p-5 shadow-2xl border border-blue-dust/10 glass antialiased">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg font-normal text-pistachio tracking-wide">Shared Room Artifacts</h2>
          <p className="text-[10px] text-blue-dust/60 uppercase tracking-widest font-medium">Instantly distribute files in real-time</p>
        </div>
        <label
          htmlFor="file-upload-input"
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer select-none shadow-md ${
            uploading 
              ? 'bg-prussian-blue-darker text-blue-dust border-blue-dust/15 animate-pulse' 
              : 'bg-pistachio text-prussian-blue-darker border-pistachio hover:bg-pistachio-light hover:shadow-pistachio/20'
          }`}
        >
          {uploading ? "Uploading…" : "Upload file"}
        </label>
        <input
          id="file-upload-input"
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-blue-dust/20 rounded-xl bg-prussian-blue-darker/35">
          <p className="text-xs text-blue-dust/60 uppercase tracking-widest font-medium">No assets shared yet</p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between text-sm bg-prussian-blue-darker/60 rounded-xl px-4 py-3 border border-blue-dust/10 hover:border-blue-dust/20 transition-all group"
            >
              <div className="min-w-0 flex-1 pr-4">
                <p className="truncate font-sans font-medium text-white group-hover:text-pistachio transition-colors">{f.originalName}</p>
                <p className="text-[10px] text-blue-dust/60 uppercase tracking-widest mt-0.5">
                  {formatSize(f.size)} &bull; Shared by {f.uploadedBy}
                </p>
              </div>
              <a
                href={`${API_BASE_URL}${f.downloadUrl}`}
                className="text-xs font-bold uppercase tracking-wider text-pistachio hover:text-pistachio-light border border-pistachio/25 rounded-md px-3 py-1.5 hover:bg-pistachio/5 transition-all shrink-0"
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

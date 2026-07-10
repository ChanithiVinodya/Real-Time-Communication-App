import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import Whiteboard from "../components/Whiteboard";
import FileShare from "../components/FileShare";

// ── Video Tile ─────────────────────────────────────────────────────────────
function VideoTile({
  stream,
  label,
  cameraOn = true,
  micOn = true,
}: {
  stream?: MediaStream;
  label: string;
  cameraOn?: boolean;
  micOn?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="rounded-xl overflow-hidden relative aspect-[4/3] bg-[#0a1220] border border-blue-dust/10">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={label === "You (Presenter)"}
        className={`w-full h-full object-cover ${cameraOn ? "" : "invisible"}`}
      />

      {!cameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-prussian-blue-dark/60">
          <div className="w-10 h-10 rounded-full border border-pistachio/30 bg-prussian-blue-dark/50 text-pistachio flex items-center justify-center text-sm font-serif">
            {label.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] text-blue-dust/60 tracking-wider uppercase font-sans">
            Camera off
          </span>
        </div>
      )}

      <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded font-sans">
        {label}
        {!micOn && <span title="Muted">🔇</span>}
      </span>
    </div>
  );
}

// ── Nav Button ─────────────────────────────────────────────────────────────
function NavButton({
  active,
  danger,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (danger) {
    return (
      <button
        onClick={onClick}
        className="px-4 py-1.5 rounded text-[11px] font-semibold tracking-widest uppercase font-sans border border-matte-red/50 text-matte-red hover:bg-matte-red/10 transition-all duration-150"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-[11px] font-semibold tracking-widest uppercase font-sans border transition-all duration-150 ${
        active
          ? "border-pistachio/60 bg-pistachio/10 text-pistachio"
          : "border-blue-dust/25 bg-prussian-blue-dark/50 text-blue-dust hover:border-blue-dust/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ── Room Page ──────────────────────────────────────────────────────────────
export default function Room() {
  const { roomCode = "default" } = useParams();
  const navigate = useNavigate();

  const {
    localStream,
    peers,
    isScreenSharing,
    toggleScreenShare,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  } = useWebRTC(roomCode);

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const memberCount = 1 + Object.keys(peers).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-prussian-blue-darker font-sans">

      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-blue-dust/10 bg-prussian-blue-darker/90 backdrop-blur-md z-20">

        {/* Left: Branding + room badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-matte-red text-sm">●</span>
            <span className="font-serif text-xl text-pistachio tracking-wide">Symphony</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold tracking-widest uppercase text-blue-dust/50 font-sans">
              Active Workspace
            </span>
            <span className="text-[10px] font-mono bg-prussian-blue/60 border border-blue-dust/20 text-blue-dust px-2 py-0.5 rounded tracking-wider">
              {roomCode}
            </span>
          </div>
        </div>

        {/* Right: Control buttons */}
        <div className="flex items-center gap-2">
          <NavButton
            active={showFiles}
            onClick={() => setShowFiles((v) => !v)}
          >
            {showFiles ? "Hide Files" : "Files"}
          </NavButton>

          <NavButton
            active={showWhiteboard}
            onClick={() => setShowWhiteboard((v) => !v)}
          >
            {showWhiteboard ? "Hide Board" : "Whiteboard"}
          </NavButton>

          <NavButton
            danger={!isMicOn}
            onClick={toggleMic}
          >
            {isMicOn ? "Mute" : "Unmute"}
          </NavButton>

          <NavButton
            danger={!isCameraOn}
            onClick={toggleCamera}
          >
            {isCameraOn ? "Cam Off" : "Cam On"}
          </NavButton>

          <NavButton
            danger={isScreenSharing}
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </NavButton>

          {/* Exit Workspace */}
          <NavButton danger onClick={() => navigate("/lobby")}>
            Exit Suite
          </NavButton>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left content area ─────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto min-w-0">

          {/* Whiteboard panel */}
          {showWhiteboard && (
            <Whiteboard />
          )}

          {/* File sharing panel */}
          {showFiles && (
            <FileShare roomCode={roomCode} />
          )}

          {/* Empty state when nothing is toggled */}
          {!showWhiteboard && !showFiles && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center select-none">
              <p className="font-serif text-2xl text-pistachio/40">Symphony</p>
              <p className="text-[11px] text-blue-dust/30 tracking-widest uppercase font-sans">
                Toggle Files or Whiteboard to get started
              </p>
            </div>
          )}
        </main>

        {/* ── Right Sidebar: Video Members ───────────────────────────────── */}
        <aside className="flex-shrink-0 w-[300px] border-l border-blue-dust/10 bg-prussian-blue-dark/30 flex flex-col overflow-y-auto">

          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-blue-dust/50 font-sans">
              Room Members ({memberCount})
            </p>
          </div>

          {/* Video tiles */}
          <div className="flex flex-col gap-3 px-4 pb-4">
            <VideoTile
              stream={localStream ?? undefined}
              label="You (Presenter)"
              cameraOn={isScreenSharing ? true : isCameraOn}
              micOn={isMicOn}
            />
            {Object.values(peers).map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                label={peer.displayName}
                cameraOn={peer.cameraOn}
                micOn={peer.micOn}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

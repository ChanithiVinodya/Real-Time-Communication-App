import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import Whiteboard from '../components/Whiteboard';
import FileShare from '../components/FileShare';

function VideoTile({ stream, label }: { stream?: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  // Initial letter for fallback
  const initial = label.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="rounded-xl overflow-hidden glass aspect-video relative shadow-lg border border-blue-dust/10 group transition-all duration-300 hover:border-pistachio/30 bg-prussian-blue-darker/60 flex items-center justify-center">
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={label === 'You'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-prussian-blue to-bean/40 flex flex-col items-center justify-center space-y-2 select-none">
          <div className="w-12 h-12 rounded-full bg-pistachio/10 border border-pistachio/30 flex items-center justify-center text-pistachio font-serif text-lg font-bold shadow-inner">
            {initial}
          </div>
          <span className="text-[10px] text-blue-dust/60 uppercase tracking-widest font-medium">Camera Off</span>
        </div>
      )}
      
      <span className="absolute bottom-3 left-3 text-[11px] font-medium text-pistachio bg-prussian-blue-darker/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-blue-dust/10 shadow-sm select-none">
        {label}
      </span>
    </div>
  );
}

export default function Room() {
  const { roomCode = 'default' } = useParams();
  const navigate = useNavigate();
  const displayName = localStorage.getItem('displayName') || 'Guest';
  const { localStream, peers, isScreenSharing, toggleScreenShare } = useWebRTC(roomCode, displayName);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  function handleLeave() {
    // Navigate back to login
    navigate('/');
  }

  const isSidebarActive = showWhiteboard || showFiles;

  return (
    <div className="min-h-screen text-white antialiased flex flex-col p-4 md:p-6">
      {/* Background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-dust/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-bean/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-blue-dust/10 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-pistachio animate-pulse" />
            <h1 className="font-serif text-2xl font-normal text-pistachio tracking-wide">
              Symphony
            </h1>
          </div>
          <div className="text-xs text-blue-dust font-medium flex items-center gap-2">
            <span className="uppercase tracking-wider">Active Workspace</span>
            <span className="text-white px-2 py-0.5 bg-prussian-blue border border-blue-dust/20 rounded font-mono text-[10px]">
              {roomCode}
            </span>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFiles((v) => !v)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all duration-200 ${
              showFiles 
                ? 'bg-pistachio text-prussian-blue-darker border-pistachio shadow-md shadow-pistachio/15' 
                : 'bg-prussian-blue text-blue-dust border-blue-dust/15 hover:border-blue-dust/40 hover:text-white'
            }`}
          >
            {showFiles ? 'Hide Files' : 'Files'}
          </button>
          
          <button
            onClick={() => setShowWhiteboard((v) => !v)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all duration-200 ${
              showWhiteboard 
                ? 'bg-pistachio text-prussian-blue-darker border-pistachio shadow-md shadow-pistachio/15' 
                : 'bg-prussian-blue text-blue-dust border-blue-dust/15 hover:border-blue-dust/40 hover:text-white'
            }`}
          >
            {showWhiteboard ? 'Hide Board' : 'Whiteboard'}
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all duration-200 ${
              isScreenSharing 
                ? 'bg-matte-red border-matte-red text-prussian-blue-darker hover:bg-matte-red-light' 
                : 'bg-prussian-blue text-blue-dust border-blue-dust/15 hover:border-blue-dust/40 hover:text-white'
            }`}
          >
            {isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
          </button>

          <button
            onClick={handleLeave}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border border-matte-red/30 bg-matte-red/10 text-matte-red hover:bg-matte-red hover:text-prussian-blue-darker transition-all duration-250 ml-2"
          >
            Exit Suite
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 relative z-10">
        {isSidebarActive ? (
          // Two-column layout if tools are active
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {showWhiteboard && <Whiteboard />}
              {showFiles && <FileShare roomCode={roomCode} />}
            </div>
            
            <div className="lg:col-span-4 space-y-4 bg-prussian-blue/20 border border-blue-dust/10 rounded-2xl p-4 glass">
              <h2 className="text-xs font-bold text-blue-dust/70 uppercase tracking-widest mb-1">
                Room Members ({Object.keys(peers).length + 1})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <VideoTile stream={localStream ?? undefined} label="You (Presenter)" />
                {Object.values(peers).map((peer) => (
                  <VideoTile key={peer.socketId} stream={peer.stream} label={peer.displayName} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Full-width grid layout when no tools are active
          <div className="max-w-6xl mx-auto py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-blue-dust/70 uppercase tracking-widest">
                Members in Session ({Object.keys(peers).length + 1})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <VideoTile stream={localStream ?? undefined} label="You" />
              {Object.values(peers).map((peer) => (
                <VideoTile key={peer.socketId} stream={peer.stream} label={peer.displayName} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
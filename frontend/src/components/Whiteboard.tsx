import { useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  isEraser?: boolean;
}

// Fixed internal drawing resolution. The canvas is scaled to fit its
// container via CSS, but coordinates are always translated back to this
// resolution before being sent or drawn — so everyone in the room draws
// on the same coordinate space regardless of their screen size.
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 500;

const COLORS = ['#ffffff', '#F2CEAE', '#93AEBF', '#D48D91', '#10b981', '#eab308'];

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  function drawSegment(seg: Segment) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    
    if (seg.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = seg.size * 2.5; // Eraser often needs to be a bit bigger
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = seg.size;
    }
    
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Reset to default for next draws
    ctx.globalCompositeOperation = 'source-over';
  }

  function getBoardPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = BOARD_WIDTH / rect.width;
    const scaleY = BOARD_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    lastPoint.current = getBoardPoint(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPoint.current) return;

    const point = getBoardPoint(e);
    const segment: Segment = { 
      x0: lastPoint.current.x, 
      y0: lastPoint.current.y, 
      x1: point.x, 
      y1: point.y, 
      color, 
      size,
      isEraser 
    };

    drawSegment(segment);
    socket.emit('draw-segment', segment);
    lastPoint.current = point;
  }

  function handlePointerUp() {
    isDrawing.current = false;
    lastPoint.current = null;
  }

  function handleClear() {
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    socket.emit('clear-board');
  }

  useEffect(() => {
    // request local board state
    socket.emit('request-board-state');

    socket.on('board-state', (segments: Segment[]) => {
      segments.forEach(drawSegment);
    });

    socket.on('draw-segment', (segment: Segment) => {
      drawSegment(segment);
    });

    socket.on('clear-board', () => {
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    });

    return () => {
      socket.off('board-state');
      socket.off('draw-segment');
      socket.off('clear-board');
    };
  }, []);

  return (
    <div className="bg-prussian-blue/40 rounded-2xl p-5 shadow-2xl border border-blue-dust/10 glass antialiased">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div>
          <h3 className="text-xs font-bold text-blue-dust/70 uppercase tracking-widest mb-1.5">Brush Color</h3>
          <div className="flex items-center gap-2 p-1 bg-prussian-blue-darker/60 rounded-full border border-blue-dust/15">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 relative ${!isEraser && color === c ? 'scale-110 ring-2 ring-pistachio/80' : 'ring-1 ring-white/10'}`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-blue-dust/70 uppercase tracking-widest mb-1.5">Drawing Tool</h3>
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
              isEraser 
                ? 'bg-matte-red text-prussian-blue-darker border-matte-red shadow-md shadow-matte-red/15' 
                : 'bg-prussian-blue-darker/60 text-blue-dust border-blue-dust/15 hover:border-blue-dust/40 hover:text-white'
            }`}
            title="Eraser tool"
          >
            <span>🧽</span>
            <span>Eraser</span>
          </button>
        </div>

        <div className="flex-1 min-w-[120px] max-w-[160px]">
          <h3 className="text-xs font-bold text-blue-dust/70 uppercase tracking-widest mb-2 flex justify-between">
            <span>Size</span>
            <span className="font-mono text-pistachio">{size}px</span>
          </h3>
          <input
            type="range"
            min={1}
            max={20}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-pistachio cursor-pointer bg-prussian-blue-darker rounded-lg appearance-none h-1"
          />
        </div>

        <button
          onClick={handleClear}
          className="ml-auto px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg bg-matte-red/10 text-matte-red hover:bg-matte-red hover:text-prussian-blue-darker border border-matte-red/35 transition-all duration-200"
        >
          Clear Board
        </button>
      </div>

      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-auto bg-prussian-blue-darker/70 rounded-xl shadow-inner touch-none border border-blue-dust/15 transition-all duration-300 group-hover:border-blue-dust/30 ${
            isEraser ? 'cursor-cell' : 'cursor-crosshair'
          }`}
        />
        <div className="absolute inset-0 pointer-events-none rounded-xl border border-transparent group-hover:border-pistachio/5 transition-colors" />
      </div>
    </div>
  );
}
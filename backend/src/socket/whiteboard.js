// In-memory store of each room's whiteboard strokes, so a user who joins
// mid-session sees what's already been drawn. Resets on server restart —
// swap for Redis or periodic snapshots to a DB if you need it to survive
// restarts or you're worried about memory growth on long-running rooms.
const boards = new Map(); // roomCode -> Segment[]

export function registerWhiteboard(io) {
  io.on('connection', (socket) => {
    // Relies on socket.data.roomCode already being set by the signaling
    // handler's 'join-room' event (same socket, same connection).
    socket.on('request-board-state', () => {
      const roomCode = socket.data.roomCode;
      socket.emit('board-state', boards.get(roomCode) || []);
    });

    socket.on('draw-segment', (segment) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      if (!boards.has(roomCode)) boards.set(roomCode, []);
      boards.get(roomCode).push(segment);

      socket.to(roomCode).emit('draw-segment', segment);
    });

    socket.on('clear-board', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      boards.set(roomCode, []);
      socket.to(roomCode).emit('clear-board');
    });
  });
}
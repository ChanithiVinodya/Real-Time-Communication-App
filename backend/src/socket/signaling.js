// Tracks which sockets are currently in which room: { roomCode: Set(socketId) }
// This is in-memory and resets on server restart — fine for now, swap for
// Redis if you ever need multiple signaling server instances.
const rooms = new Map();

export function registerSignaling(io) {
  io.on('connection', (socket) => {
    // socket.data.userId / displayName were already set by the io.use()
    // auth middleware in index.js, from the verified JWT — never trust a
    // display name the client sends over the wire instead.
    console.log('Socket connected:', socket.id, socket.data.displayName);

    socket.on('join-room', ({ roomCode }) => {
      socket.data.roomCode = roomCode;

      if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
      const peers = rooms.get(roomCode);

      // Tell the new peer who is already in the room. The new peer will
      // initiate a WebRTC offer to each of them (mesh topology).
      const existingPeers = Array.from(peers).map((id) => ({
        socketId: id,
        displayName: io.sockets.sockets.get(id)?.data.displayName,
      }));
      socket.emit('existing-peers', existingPeers);

      peers.add(socket.id);
      socket.join(roomCode);

      socket.to(roomCode).emit('peer-joined', {
        socketId: socket.id,
        displayName: socket.data.displayName,
      });
    });

    // The signaling server never inspects or stores SDP/ICE payloads —
    // it only relays them to the intended recipient by socket id.
    socket.on('offer', ({ to, offer }) => {
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // Relays camera/mic on-off state so peers can show a "camera off" /
    // "muted" indicator on each other's tiles.
    socket.on('media-state', ({ camera, mic }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      socket.to(roomCode).emit('media-state', { from: socket.id, camera, mic });
    });

    socket.on('disconnect', () => {
      const { roomCode } = socket.data;
      if (roomCode && rooms.has(roomCode)) {
        rooms.get(roomCode).delete(socket.id);
        if (rooms.get(roomCode).size === 0) rooms.delete(roomCode);
        socket.to(roomCode).emit('peer-left', { socketId: socket.id });
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
}
import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:5050';

// autoConnect is off — the room page connects explicitly once it has a
// display name and room code ready to send with 'join-room'.
export const socket: Socket = io(SIGNALING_URL, { autoConnect: false });

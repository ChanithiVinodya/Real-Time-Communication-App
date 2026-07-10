// The Express API and the Socket.io signaling server run on the same
// process/port, so this is the same URL used for the socket connection.
export const API_BASE_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:5050';
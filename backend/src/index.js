import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";

import { validateEnv } from "./config/validateEnv.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import filesRoutes from "./routes/files.routes.js";
import turnRoutes from "./routes/turn.routes.js";
import { registerSignaling } from "./socket/signaling.js";
import { registerWhiteboard } from "./socket/whiteboard.js";

validateEnv();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// General limiter for everything...
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ...and a much stricter one specifically for auth, since login/signup
// endpoints are the ones worth protecting against brute-forcing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts — please try again later" },
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/turn", turnRoutes);

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});
app.set("io", io);
registerSignaling(io);
registerWhiteboard(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
});

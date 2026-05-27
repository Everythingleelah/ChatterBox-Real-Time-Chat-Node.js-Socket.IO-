/**
 * ChatterBox — Real-Time Chat Server
 * Node.js + Express + Socket.IO
 * Author: Your Name | License: MIT
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

// ──────────────────────────────────────────
// Setup
// ──────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
});

const PORT = process.env.PORT || 3000;

// In-memory store (swap for Redis in production)
const rooms = new Map();       // roomId -> { name, messages[], users{} }
const users = new Map();       // socketId -> { username, room, color }

// ──────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────

const COLORS = [
  "#4f9cf9", "#7b5ea7", "#f59e0b", "#4ade80",
  "#f87171", "#34d399", "#fb923c", "#a78bfa",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function generateId() {
  return crypto.randomBytes(4).toString("hex");
}

function getOrCreateRoom(roomId, roomName) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      name: roomName || `Room #${roomId}`,
      messages: [],
      users: {},
      created: new Date().toISOString(),
    });
  }
  return rooms.get(roomId);
}

function getRoomUsers(roomId) {
  return Object.values(rooms.get(roomId)?.users || {});
}

function sanitize(str) {
  return str?.toString().trim().slice(0, 500).replace(/</g, "&lt;").replace(/>/g, "&gt;") || "";
}

// ──────────────────────────────────────────
// Static files
// ──────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/rooms", (req, res) => {
  const list = [...rooms.values()].map((r) => ({
    id: r.id,
    name: r.name,
    userCount: Object.keys(r.users).length,
    messageCount: r.messages.length,
  }));
  res.json({ rooms: list });
});

// ──────────────────────────────────────────
// Socket.IO Events
// ──────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── Join a room ──────────────────────────
  socket.on("join", ({ username, roomId, roomName }) => {
    username = sanitize(username) || `User_${generateId()}`;
    roomId = roomId || "general";

    const room = getOrCreateRoom(roomId, roomName || "General");
    const user = {
      id: socket.id,
      username,
      color: randomColor(),
      joinedAt: new Date().toISOString(),
    };

    users.set(socket.id, { username, room: roomId, color: user.color });
    room.users[socket.id] = user;

    socket.join(roomId);

    // Send history to joining user (last 50 messages)
    socket.emit("history", room.messages.slice(-50));

    // Send current user list
    socket.emit("room_users", getRoomUsers(roomId));

    // Announce join to room
    const joinMsg = {
      id: generateId(),
      type: "system",
      text: `${username} joined the room`,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(joinMsg);
    io.to(roomId).emit("message", joinMsg);

    // Update user list for everyone
    io.to(roomId).emit("room_users", getRoomUsers(roomId));

    console.log(`[join] ${username} → room:${roomId} (${Object.keys(room.users).length} users)`);
  });

  // ── Send message ─────────────────────────
  socket.on("message", ({ text }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const room = rooms.get(user.room);
    if (!room) return;

    const cleanText = sanitize(text);
    if (!cleanText) return;

    const msg = {
      id: generateId(),
      type: "chat",
      text: cleanText,
      author: user.username,
      color: user.color,
      timestamp: new Date().toISOString(),
    };

    room.messages.push(msg);
    if (room.messages.length > 200) room.messages.shift(); // keep last 200

    io.to(user.room).emit("message", msg);
  });

  // ── Typing indicator ─────────────────────
  socket.on("typing", ({ isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit("user_typing", {
      username: user.username,
      isTyping,
    });
  });

  // ── Private message ──────────────────────
  socket.on("private_message", ({ targetId, text }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const cleanText = sanitize(text);
    if (!cleanText) return;

    const msg = {
      id: generateId(),
      type: "private",
      text: cleanText,
      author: sender.username,
      color: sender.color,
      timestamp: new Date().toISOString(),
      private: true,
    };

    socket.emit("private_message", msg);
    io.to(targetId).emit("private_message", msg);
  });

  // ── Disconnect ───────────────────────────
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (!user) return;

    const room = rooms.get(user.room);
    if (room) {
      delete room.users[socket.id];

      const leaveMsg = {
        id: generateId(),
        type: "system",
        text: `${user.username} left the room`,
        timestamp: new Date().toISOString(),
      };
      room.messages.push(leaveMsg);
      io.to(user.room).emit("message", leaveMsg);
      io.to(user.room).emit("room_users", getRoomUsers(user.room));
    }

    users.delete(socket.id);
    console.log(`[-] Disconnected: ${user.username}`);
  });
});

// ──────────────────────────────────────────
// Start
// ──────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n✓ ChatterBox server running at http://localhost:${PORT}`);
  console.log(`  Rooms API: GET http://localhost:${PORT}/api/rooms`);
});

# ChatterBox 💬

A real-time multi-room chat application built with **Node.js, Express, and Socket.IO**. No account required — just pick a username and start chatting.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black?logo=socket.io) ![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- ⚡ **Real-time messaging** — instant delivery via WebSocket
- 🏠 **Multi-room support** — join any named room
- 📜 **Message history** — last 50 messages delivered on join
- ✍️ **Typing indicators** — see who's typing in real time
- 👥 **Live user sidebar** — online users with color avatars
- 🔒 **Private messages** — direct messaging between users
- 🧹 **System events** — join/leave announcements

---

## Quick Start

```bash
git clone https://github.com/yourusername/chatterbox.git
cd chatterbox
npm install
npm start
```

Open `http://localhost:3000` in multiple browser tabs to test real-time messaging.

For development with hot reload:
```bash
npm run dev
```

---

## Architecture

```
Client (Browser)
    │
    │  WebSocket (Socket.IO)
    │
Server (Node.js + Express)
    │
    ├── rooms Map    { roomId: { name, messages[], users{} } }
    └── users Map    { socketId: { username, room, color } }
```

**In-memory storage** — swap `rooms` and `users` Maps for Redis in production for horizontal scaling.

---

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ username, roomId, roomName }` | Join a room |
| `message` | `{ text }` | Send a chat message |
| `typing` | `{ isTyping }` | Typing indicator |
| `private_message` | `{ targetId, text }` | Direct message |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `history` | `Message[]` | Last 50 messages on join |
| `message` | `Message` | New message in room |
| `room_users` | `User[]` | Updated user list |
| `user_typing` | `{ username, isTyping }` | Typing state of another user |
| `private_message` | `Message` | Incoming DM |

---

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rooms` | List all active rooms |

---

## Project Structure

```
chatterbox/
├── server.js           # Node.js server + Socket.IO logic
├── package.json
├── public/
│   └── index.html      # Frontend (HTML + CSS + JS)
└── README.md
```

---

## Deployment

### Railway / Render

```bash
# Set environment variables:
PORT=3000
NODE_ENV=production
```

Push to GitHub and connect your repo to Railway or Render for one-click deploys.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Extending the Project

- **Redis adapter** — `socket.io-redis` for multi-instance horizontal scaling
- **Authentication** — JWT-based login with user accounts
- **Persistent storage** — PostgreSQL for message history
- **File uploads** — image sharing via Multer + S3
- **Reactions** — emoji reactions to messages
- **Read receipts** — double-tick delivery confirmation

---

## License

MIT: free to use.

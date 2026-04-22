import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use('/shared', express.static(join(__dirname, 'shared')));
app.use(express.static(join(__dirname, 'client')));

// ── Room Management ──
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoom = null;

  socket.on('create-room', (data, callback) => {
    const code = generateRoomCode();
    const room = {
      code,
      host: socket.id,
      players: new Map(),
      state: 'lobby', // lobby | combat | reward
      currentMap: 0,
      gameData: {}
    };
    room.players.set(socket.id, {
      id: socket.id,
      name: data.name || 'Player',
      character: data.character,
      x: 400, y: 300,
      ready: false
    });
    rooms.set(code, room);
    socket.join(code);
    currentRoom = code;
    callback({ success: true, code, playerId: socket.id });
    console.log(`Room ${code} created by ${socket.id}`);
  });

  socket.on('join-room', (data, callback) => {
    const room = rooms.get(data.code);
    if (!room) return callback({ success: false, error: 'Room not found' });
    if (room.players.size >= 4) return callback({ success: false, error: 'Room is full' });
    if (room.state !== 'lobby') return callback({ success: false, error: 'Game already in progress' });

    room.players.set(socket.id, {
      id: socket.id,
      name: data.name || 'Player',
      character: data.character,
      x: 400, y: 300,
      ready: false
    });
    socket.join(data.code);
    currentRoom = data.code;
    callback({ success: true, code: data.code, playerId: socket.id, players: Object.fromEntries(room.players) });
    socket.to(data.code).emit('player-joined', { id: socket.id, ...room.players.get(socket.id) });
    console.log(`${socket.id} joined room ${data.code}`);
  });

  socket.on('player-update', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) {
      Object.assign(player, data);
      socket.to(currentRoom).emit('player-updated', { id: socket.id, ...data });
    }
  });

  socket.on('player-action', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('player-action', { id: socket.id, ...data });
  });

  socket.on('enemy-damage', (data) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('enemy-damage', data);
  });

  socket.on('start-game', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.host !== socket.id) return;
    room.state = 'combat';
    room.currentMap = 1;
    io.to(currentRoom).emit('game-start', { map: 1 });
  });

  socket.on('map-complete', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.currentMap++;
    room.state = 'reward';
    io.to(currentRoom).emit('show-rewards', { nextMap: room.currentMap });
  });

  socket.on('reward-chosen', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('player-reward', { id: socket.id, reward: data.reward });
  });

  socket.on('ready-next', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) player.ready = true;
    const allReady = [...room.players.values()].every(p => p.ready);
    if (allReady) {
      room.players.forEach(p => p.ready = false);
      room.state = 'combat';
      io.to(currentRoom).emit('next-map', { map: room.currentMap });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.players.delete(socket.id);
        socket.to(currentRoom).emit('player-left', { id: socket.id });
        if (room.players.size === 0) {
          rooms.delete(currentRoom);
          console.log(`Room ${currentRoom} closed (empty)`);
        } else if (room.host === socket.id) {
          room.host = room.players.keys().next().value;
          io.to(currentRoom).emit('new-host', { id: room.host });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`Soulbound Arena server running on http://localhost:${PORT}`);
});

// ══════════════════════════════════════════════════════════════
//  NetworkManager — Socket.io multiplayer integration
// ══════════════════════════════════════════════════════════════

export default class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.isConnected = false;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.remotePlayers = new Map(); // socketId -> { player, healthBar, ... }
    this.callbacks = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.playerId = this.socket.id;
        console.log('Connected to server:', this.playerId);
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        reject(err);
      });

      this._setupListeners();
    });
  }

  _setupListeners() {
    const s = this.socket;

    s.on('player-joined', (data) => {
      console.log('Player joined:', data.id);
      this._emit('playerJoined', data);
    });

    s.on('player-left', (data) => {
      console.log('Player left:', data.id);
      this._emit('playerLeft', data);
    });

    s.on('player-updated', (data) => {
      this._emit('playerUpdated', data);
    });

    s.on('player-action', (data) => {
      this._emit('playerAction', data);
    });

    s.on('enemy-damage', (data) => {
      this._emit('enemyDamage', data);
    });

    s.on('game-start', (data) => {
      this._emit('gameStart', data);
    });

    s.on('show-rewards', (data) => {
      this._emit('showRewards', data);
    });

    s.on('player-reward', (data) => {
      this._emit('playerReward', data);
    });

    s.on('next-map', (data) => {
      this._emit('nextMap', data);
    });

    s.on('new-host', (data) => {
      if (data.id === this.playerId) {
        this.isHost = true;
      }
      this._emit('newHost', data);
    });

    s.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from server');
      this._emit('disconnected');
    });
  }

  createRoom(name, character) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-room', { name, character }, (response) => {
        if (response.success) {
          this.roomCode = response.code;
          this.isHost = true;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  joinRoom(code, name, character) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join-room', { code, name, character }, (response) => {
        if (response.success) {
          this.roomCode = response.code;
          this.isHost = false;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  sendUpdate(data) {
    if (!this.isConnected) return;
    this.socket.emit('player-update', data);
  }

  sendAction(data) {
    if (!this.isConnected) return;
    this.socket.emit('player-action', data);
  }

  sendEnemyDamage(data) {
    if (!this.isConnected) return;
    this.socket.emit('enemy-damage', data);
  }

  startGame() {
    if (!this.isConnected || !this.isHost) return;
    this.socket.emit('start-game');
  }

  sendMapComplete() {
    if (!this.isConnected) return;
    this.socket.emit('map-complete');
  }

  sendRewardChosen(reward) {
    if (!this.isConnected) return;
    this.socket.emit('reward-chosen', { reward });
  }

  readyNext() {
    if (!this.isConnected) return;
    this.socket.emit('ready-next');
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (!this.callbacks[event]) return;
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
  }

  _emit(event, data) {
    if (!this.callbacks[event]) return;
    this.callbacks[event].forEach(cb => cb(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.remotePlayers.clear();
  }

  // ── Position sync helper (call in scene update) ──
  syncPosition(x, y, facing, animState) {
    this.sendUpdate({ x, y, facing, animState });
  }
}

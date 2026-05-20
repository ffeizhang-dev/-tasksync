const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(__dirname));

// ── 内存数据存储 ──────────────────────────────────
const rooms = {};

function getRoom(code) {
  if (!rooms[code]) rooms[code] = { meta: {}, members: {}, tasks: {} };
  return rooms[code];
}

// ── Socket.io 事件 ────────────────────────────────
io.on('connection', (socket) => {
  let myRoom = null;
  let myId = null;

  // 创建房间
  socket.on('create-room', ({ code, meta, user }) => {
    if (rooms[code]) { socket.emit('error-msg', '房间码已存在，请重试'); return; }
    myRoom = code; myId = user.id;
    const room = getRoom(code);
    room.meta = meta;
    room.members[user.id] = { ...user, online: true, joinedAt: Date.now() };
    socket.join(code);
    socket.emit('room-state', room);
    console.log(`[${code}] 房间已创建，管理员：${user.name}`);
  });

  // 加入房间
  socket.on('join-room', ({ code, user }, cb) => {
    if (!rooms[code]) { if (cb) cb({ ok: false, msg: '房间不存在，请检查房间码' }); return; }
    myRoom = code; myId = user.id;
    const room = getRoom(code);
    room.members[user.id] = { ...user, online: true, joinedAt: Date.now() };
    socket.join(code);
    socket.emit('room-state', room);
    socket.to(code).emit('member-update', room.members);
    if (cb) cb({ ok: true, roomName: room.meta.name });
    console.log(`[${code}] ${user.name} 已加入`);
  });

  // 检查房间是否存在
  socket.on('check-room', (code, cb) => {
    cb({ exists: !!rooms[code], name: rooms[code]?.meta?.name || '' });
  });

  // 添加任务
  socket.on('task-add', (task) => {
    if (!myRoom) return;
    getRoom(myRoom).tasks[task.id] = task;
    io.to(myRoom).emit('task-update', getRoom(myRoom).tasks);
  });

  // 更新任务字段
  socket.on('task-patch', ({ taskId, updates }) => {
    if (!myRoom) return;
    const tasks = getRoom(myRoom).tasks;
    if (tasks[taskId]) Object.assign(tasks[taskId], updates);
    io.to(myRoom).emit('task-update', tasks);
  });

  // 删除任务
  socket.on('task-delete', (taskId) => {
    if (!myRoom) return;
    delete getRoom(myRoom).tasks[taskId];
    io.to(myRoom).emit('task-update', getRoom(myRoom).tasks);
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (!myRoom || !myId) return;
    const room = rooms[myRoom];
    if (room && room.members[myId]) {
      room.members[myId].online = false;
      io.to(myRoom).emit('member-update', room.members);
      console.log(`[${myRoom}] ${room.members[myId].name} 已离线`);
    }
  });
});

// ── 启动服务器 ────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  TaskSync 实时任务协作系统 已启动！');
  console.log('========================================');
  console.log(`本机访问:   http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`局域网访问: http://${net.address}:${PORT}  ← 分享此地址给其他人`);
      }
    }
  }
  console.log('========================================\n');
  console.log('按 Ctrl+C 停止服务器\n');
});

const { Server } = require("socket.io");

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Join room for specific complaint
    socket.on("joinComplaint", (complaintId) => {
      if (complaintId) {
        const roomName = `complaint:${complaintId}`;
        socket.join(roomName);
        console.log(`[SOCKET] Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on("join", (room) => {
      if (room) {
        socket.join(room);
        console.log(`[SOCKET] Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Leave room
    socket.on("leaveComplaint", (complaintId) => {
      if (complaintId) {
        const roomName = `complaint:${complaintId}`;
        socket.leave(roomName);
        console.log(`[SOCKET] Socket ${socket.id} left room: ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn("[SOCKET] Socket.io not initialized");
  }
  return io;
};

const emitStatusUpdate = (complaintId, payload) => {
  if (io) {
    const roomName = `complaint:${complaintId}`;
    console.log(`[SOCKET] Emitting complaint:statusUpdated to room ${roomName}`);
    // Emit to room complaint:<complaintId>
    io.to(roomName).emit("complaint:statusUpdated", payload);
    // Also emit globally for list subscribers
    io.emit("complaint:statusUpdated", payload);
  } else {
    console.warn("[SOCKET] Cannot emit event: Socket.io instance missing");
  }
};

module.exports = {
  initSocket,
  getIO,
  emitStatusUpdate,
};

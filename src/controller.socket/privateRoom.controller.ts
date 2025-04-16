import { prisma } from "./../prisma";
import { hashRoomName } from "./../Utils/Utils";
import { SocketEventHandler, SocketHandler } from "../types/custom-types";

// Socket initializer
export const privateRoomHandler: SocketHandler = async (socket, io) => {
  socket.on("join private room", async (mes) => {
    try {
      await joinPrivateRoomHandler(socket, io, mes);
    } catch (error) {
      console.error("Error in joinPrivateRoomHandler:", error);
    }
  });

  socket.on("private message", async (mes) => {
    try {
      await privateMessageHandler(socket, io, mes);
    } catch (error) {
      console.error("Error in privateMessageHandler:", error);
    }
  });
};

// Join or create private room between 2 users
export const joinPrivateRoomHandler: SocketEventHandler = async (
  socket,
  io,
  mes
) => {
  const { otherName } = JSON.parse(mes);

  if (!otherName) {
    console.warn("Missing otherName in joinPrivateRoomHandler");
    return;
  }

  const other = await prisma.user.findFirst({
    where: { name: otherName },
  });

  if (!other) {
    console.warn("Other user not found:", otherName);
    return;
  }

  const roomName = [socket.user.name, other.name].sort().join("-");
  let privateRoom = await prisma.room.findFirst({
    where: {
      name: roomName,
      type: "private",
    },
  });

  if (!privateRoom) {
    privateRoom = await prisma.room.create({
      data: {
        name: roomName,
        hashName: hashRoomName(roomName),
        type: "private",
      },
    });
  }

  socket.join(privateRoom.hashName);
  console.log(socket.username, "joined private room", privateRoom.hashName);

  // Ensure both users are in the room
  await prisma.userRoom.upsert({
    where: {
      userId_roomId: {
        userId: socket.user.id,
        roomId: privateRoom.id,
      },
    },
    update: {},
    create: {
      userId: socket.user.id,
      roomId: privateRoom.id,
    },
  });

  await prisma.userRoom.upsert({
    where: {
      userId_roomId: {
        userId: other.id,
        roomId: privateRoom.id,
      },
    },
    update: {},
    create: {
      userId: other.id,
      roomId: privateRoom.id,
    },
  });

  // Send room info with members back to the current user
  const roomWithMembers = await prisma.room.findFirst({
    where: { id: privateRoom.id },
    include: {
      members: {
        include: { user: true },
      },
    },
  });

  socket.emit("join room", {
    room: roomWithMembers,
  });

  // Notify other user (only if they're connected)
  socket.to(privateRoom.hashName).emit("private : user connected", {
    user: socket.user,
  });
};

// Handle sending private message
export const privateMessageHandler: SocketEventHandler = async (
  socket,
  io,
  mes
) => {
  const { content, otherName } = JSON.parse(mes);
  console.log("private message", mes);
  console.log("otherName", otherName);
  if (!content || !otherName) {
    console.warn("Missing fields in private message");
    return;
  }

  const other = await prisma.user.findFirst({
    where: { name: otherName },
  });

  if (!other) {
    console.warn("Recipient user not found:", otherName);
    return;
  }

  const roomName = [socket.user.name, other.name].sort().join("-");
  const room = await prisma.room.findFirst({
    where: {
      name: roomName,
      type: "private",
    },
  });

  if (!room) {
    console.warn("Private room not found for message:", roomName);
    return;
  }

  const message = await prisma.message.create({
    data: {
      content,
      roomId: room.id,
      senderId: socket.user.id,
    },
  });

  io.to(room.hashName).emit("private message", {
    content,
    from: socket.user,
    to: other,
    room: room.hashName,
    createdAt: message.createdAt,
  });
};

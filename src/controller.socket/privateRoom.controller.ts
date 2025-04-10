import { prisma } from './../prisma';
import { hashRoomName } from './../Utils/Utils'
import { SocketEventHandler, SocketHandler } from "../types/custom-types";


export const privateRoomHandler: SocketHandler = async (socket, io) => {
    socket.on("join private room", async (mes) => {
        joinPrivateRoomHandler(socket, io, mes);
    })

    socket.on("private message", async (mes) => {
        privateMessageHandler(socket, io, mes);
    });
}


export const joinPrivateRoomHandler: SocketEventHandler = async (socket, io, mes) => {
    const { otherName } = JSON.parse(mes);

    // find other
    const other = await prisma.user.findFirst({
        where: {
            name: otherName
        }
    })

    if (!other) {
        return;
    }

    const roomName = [socket.userId, other.id].sort().join('-');

    let privateRoom = await prisma.room.findFirst({
        where: {
            name: roomName,
            type: "private"
        }
    })
    if (!privateRoom) {
        privateRoom = await prisma.room.create({
            data: {
                hashName: hashRoomName(roomName),
                name: roomName,
                type: "private"
            }
        })
    }

    socket.join(privateRoom.hashName);
    console.log(socket.username, ' join private room ', privateRoom.hashName);
    socket.emit('join room', {
        room: privateRoom
    })
    io.to(privateRoom.hashName).emit("private : user connected", {
        user: socket.user
    })
    await prisma.userRoom.upsert({
        where: {
            userId_roomId: {
                userId: socket.user.id,
                roomId: privateRoom.id
            }
        },
        update: {}, // nothing to update if it exists
        create: {
            userId: socket.user.id,
            roomId: privateRoom.id
        }
    });
}

export const privateMessageHandler: SocketEventHandler = async (socket, io, mes) => {
    const { content, otherName } = JSON.parse(mes);

    // find other
    const other = await prisma.user.findFirst({
        where: {
            name: otherName
        }
    })

    if (!other) {
        return;
    }

    const roomName = [socket.userId, other.id].sort().join('-');

    const room = await prisma.room.findFirst({
        where: {
            name: roomName,
            type: "private"
        }
    })

    if (!room) {
        return;
    }

    const message = await prisma.message.create({
        data: {
            content: content,
            roomId: room.id,
            senderId: socket.userId
        }
    })

    io.to(room.hashName).emit("private message", {
        content,
        from: socket.user,
        to: room
    });

}
import { prisma } from './../prisma';
import { hashRoomName } from './../Utils/Utils'
import { SocketEventHandler, SocketHandler } from "../types/custom-types";


export const publicRoomHandler: SocketHandler = async (socket, io) => {
    socket.on("create public room", async (mes) => {
        createPublicRoomHandler(socket, io, mes);
    })

    socket.on("join public room", async (mes) => {
        joinPublicRoomHandler(socket, io, mes);
    })

    socket.on("public message", async (mes) => {
        publicMessageHandler(socket, io, mes);
    })
}


export const createPublicRoomHandler: SocketEventHandler = async (socket, io, mes) => {
    const { roomName } = JSON.parse(mes);

    const publicRoom = await prisma.room.create({
        data: {
            hashName: hashRoomName(roomName),
            name: roomName,
            type: "public"
        }
    })
    socket.join(publicRoom.hashName);
    await prisma.userRoom.upsert({
        where: {
            userId_roomId: {
                userId: socket.user.id,
                roomId: publicRoom.id
            }
        },
        update: {}, // nothing to update if it exists
        create: {
            userId: socket.user.id,
            roomId: publicRoom.id
        }
    });
}

export const joinPublicRoomHandler: SocketEventHandler = async (socket, io, mes) => {
    const { hashRoomName } = JSON.parse(mes);

    // create room dynamically
    let publicRoom = await prisma.room.findFirst({
        where: {
            hashName: hashRoomName,
            type: "public"
        }
    })

    if (!publicRoom) {
        return;
    }

    socket.join(publicRoom.hashName);
    console.log(socket.username, ' join public room ', publicRoom.hashName);
    io.to(publicRoom.hashName).emit("public : user connected", {
        user: socket.user
    })

    // DB
    await prisma.userRoom.upsert({
        where: {
            userId_roomId: {
                userId: socket.user.id,
                roomId: publicRoom.id
            }
        },
        update: {}, // nothing to update if it exists
        create: {
            userId: socket.user.id,
            roomId: publicRoom.id
        }
    });

}
export const publicMessageHandler: SocketEventHandler = async (socket, io, mes) => {
    const { content, hashRoomName } = JSON.parse(mes);

    const room = await prisma.room.findFirst({
        where: {
            hashName: hashRoomName,
            type: "public"
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

    io.to(room.hashName).emit("public message", {
        content,
        from: socket.user,
        to: room
    })
}
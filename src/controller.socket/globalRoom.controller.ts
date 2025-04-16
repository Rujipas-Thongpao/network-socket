import { prisma } from './../prisma';
import { hashRoomName } from './../Utils/Utils'
import { SocketEventHandler, SocketHandler } from "../types/custom-types";

export const GlobalRoomHandler: SocketHandler = async (socket, io) => {
    // create global room if there aren't one
    let globalRoom = await prisma.room.findFirst({
        where: {
            name: 'Global',
            type: 'public'
        }
    })


    if (!globalRoom) {
        globalRoom = await prisma.room.create({
            data: {
                hashName: hashRoomName('Global'),
                name: 'Global',
                type: 'public'
            }
        })
    }
    // join global room 
    socket.join(globalRoom.hashName);
    await prisma.userRoom.upsert({
        where: {
            userId_roomId: {
                userId: socket.user.id,
                roomId: globalRoom.id
            }
        },
        update: {}, // nothing to update if it exists
        create: {
            userId: socket.user.id,
            roomId: globalRoom.id
        }
    });

    // Global
    socket.on("global message", async (mes) => {
        const { content } = JSON.parse(mes);

        console.log("message from global");
        console.log(content);

        const message = await prisma.message.create({
            data: {
                content: content,
                roomId: globalRoom.id,
                senderId: socket.userId
            }
        })

        io.to(globalRoom.hashName).emit("global message", {
            content,
            from: socket.user,
            to: globalRoom
        })
    })
}
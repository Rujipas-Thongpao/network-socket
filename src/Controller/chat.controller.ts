import { prisma } from "../prisma"
import { Express, Request, RequestHandler, Response } from "express";

export const getMessages: RequestHandler = async (req: Request, res: Response) => {
    // return chat of roomName
    const { hashRoomName } = req.params;

    const room = await prisma.room.findUnique({
        where: {
            hashName: hashRoomName
        }
    })

    if (!room) {
        res.status(404).json({
            success: false,
            message: "can't find this room"
        })
    }

    const messages = await prisma.message.findMany({
        where: {
            roomId: room?.id
        }
    })

    res.status(200).json({
        success: true,
        message: "find message successfully",
        data: messages
    });
}

export const getRoom: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { hashRoomName } = req.params;

        const room = await prisma.room.findUnique({
            include: {
                members: {
                    include: {
                        user: true, // assuming UserRoom has a relation to User
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: 'asc', // or 'desc' if you want latest first
                    },
                    include: {
                        sender: true, // assuming Message has a relation to User as sender
                    },
                },
            },
            where: {
                hashName: hashRoomName
            }
        })

        if (!room) {
            res.status(404).json({
                success: false,
                message: "can't find this room"
            })
        }
        res.status(200).json({
            success: true,
            data: room
        })
    }
    catch (error) {

    }
}
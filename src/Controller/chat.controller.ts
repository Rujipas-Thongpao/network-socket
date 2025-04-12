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
    catch (error: any) {
        res.status(500).json({
            success: false,
            message: `internal server error : ${error.message}`
        })
    }
}

export const getRooms: RequestHandler = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            where: {
                type: "public"
            }
        });
        res.status(200).json({
            success: true,
            message: "all room",
            data: rooms
        })
    }
    catch (error: any) {
        res.status(500).json({
            success: false,
            message: `internal server error : ${error.message}`
        })

    }
}


export const changeRoomTheme: RequestHandler = async (req, res) => {
    try {
        const { hashRoomName } = req.params;
        const { theme } = req.body;
        const updatedRoom = await prisma.room.update({
            where: {
                hashName: hashRoomName
            },
            data: {
                theme: theme
            }
        })
        if (!updatedRoom) {
            res.status(400).json({
                success: false,
                message: "update theme unsuccessfully"
            })
        }
        res.status(200).json({
            success: false,
            message: "update theme unsuccessfully",
            data: updatedRoom
        })

    }
    catch (error: any) {
        res.status(500).json({
            success: false,
            messag: `internal server error : ${error.message}`
        })
    }
}


export const getJoinedRoom: RequestHandler = async (req, res) => {
    try {
        console.log(req.body);
        const { userId } = req.body;
        if (!userId) {
            res.status(404).json({
                success: false,
                message: "missing field"
            })
        }

        const userRoom = await prisma.userRoom.findMany({
            where: {
                userId: parseInt(userId)
            },
            include: {
                room: true,
                user: true
            }
        })

        let data: any = []
        userRoom.forEach((ur) => {
            data.push(ur.room)
        });


        res.status(200).json({
            success: true,
            message: "get joined room",
            data: data
        })
    }
    catch (error: any) {
        res.status(500).json({
            success: false,
            messag: `internal server error : ${error.message}`
        })
    }
}
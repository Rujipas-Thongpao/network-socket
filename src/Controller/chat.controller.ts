import { prisma } from "../prisma"
import { Express , Request, RequestHandler, Response} from "express";

export const getMessages :RequestHandler = async ( req : Request, res : Response) =>{
    // return chat of roomName
    const { roomName } = req.params;

    const room = await prisma.room.findUnique({
        where : {
            name : roomName
        }
    })

    if(!room){
        res.status(404).json({
            message : "can't find this room"
        })
    }

    const messages = await prisma.message.findMany({
        where : {
            roomId : room?.id
        }
    })

    res.status(200).json({
        message: "find message successfully",
        data : messages
    });
}
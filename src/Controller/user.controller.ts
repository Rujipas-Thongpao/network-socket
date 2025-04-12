import { prisma } from "@/prisma";
import { RequestHandler } from "express";

export const getUsers: RequestHandler = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json({
            success: true,
            message: "all user",
            data: users
        })
    }
    catch (error: any) {
        res.status(500).json({
            success: false,
            message: `internal server error : ${error.message}`
        })
    }
}
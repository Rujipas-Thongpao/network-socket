import { changeRoomTheme, getRoom, getRooms } from "../Controller/chat.controller";
import express, { Router } from "express";

export const chatRouter: Router = express.Router();

chatRouter.get("/", getRooms);
chatRouter.get("/:hashRoomName", getRoom);
chatRouter.put("/:hashRoomName/theme", changeRoomTheme);

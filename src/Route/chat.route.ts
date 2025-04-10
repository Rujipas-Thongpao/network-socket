import { changeRoomTheme, getJoinedRoom, getMessages, getRoom } from "../Controller/chat.controller";
import express, { Router, Express, Request, Response } from "express";

export const chatRouter: Router = express.Router();

chatRouter.get("/", getJoinedRoom);
chatRouter.get("/:hashRoomName", getRoom);
chatRouter.put("/:hashRoomName/theme", changeRoomTheme);
// chatRouter.get("/:hashRoomName/message/", getMessages);
// TODO : add recive all chat

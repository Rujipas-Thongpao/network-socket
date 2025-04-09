import { getMessages, getRoom } from "../Controller/chat.controller";
import express, { Router, Express, Request, Response } from "express";

export const chatRouter: Router = express.Router();

chatRouter.get("/:hashRoomName", getRoom);
// chatRouter.get("/:hashRoomName/message/", getMessages);

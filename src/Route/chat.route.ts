import {
  changeRoomTheme,
  getGroupRooms,
  getJoinedRoom,
  getRoom,
} from "../Controller/chat.controller";
import express, { Router } from "express";

export const chatRouter: Router = express.Router();

chatRouter.get("/", getGroupRooms);
chatRouter.get("/joined", getJoinedRoom);
chatRouter.get("/:hashRoomName", getRoom);
chatRouter.put("/:hashRoomName/theme", changeRoomTheme);

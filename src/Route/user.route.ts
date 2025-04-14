import {
  changeRoomTheme,
  getMessages,
  getRoom,
} from "../Controller/chat.controller";
import { getUsers } from "@/Controller/user.controller";
import express, { Router, Express, Request, Response } from "express";

export const userRouter: Router = express.Router();

userRouter.get("/", getUsers);

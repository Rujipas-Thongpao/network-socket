import { changeRoomTheme, getMessages, getRoom } from "../Controller/chat.controller";
import express, { Router, Express, Request, Response } from "express";

export const userRouter: Router = express.Router();

userRouter.get("/", getRoom);

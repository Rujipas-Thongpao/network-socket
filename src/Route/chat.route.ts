import { getMessages } from "../Controller/chat.controller";
import express, { Router, Express, Request, Response } from "express";

export const chatRouter: Router = express.Router();

chatRouter.get("/:roomName/message/", getMessages);

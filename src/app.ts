import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import * as http from "http";
import cors from "cors";
import { io } from "./socket";

import { prisma } from "./prisma";
import { chatRouter } from "./Route/chat.route";
import bodyParser from "body-parser";

const app: Express = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(bodyParser.json());
const port = process.env.PORT || 3001;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use("/api/room", chatRouter);

app.get("/api/health", (req: Request, res: Response) => {
  console.log("health check");
  res.send("Express + TypeScript Server");
});

const server: http.Server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

async function main() {
  const allUsers = await prisma.user.findMany();
  console.dir(allUsers, { depth: null });
}

main();

io(server);

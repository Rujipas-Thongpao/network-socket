import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import * as http from "http";
import { io } from "./socket";

import { prisma } from './prisma';

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
	res.send("Express + TypeScript Server");
});

const server: http.Server = app.listen(port, () => {
	console.log(`[server]: Server is running at http://localhost:${port}`);
});
async function main() {
	const allUsers = await prisma.user.findMany();
	console.dir(allUsers, { depth: null })
}

main();

io(server);

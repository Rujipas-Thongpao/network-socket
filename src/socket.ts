import { Server, Socket } from "socket.io";
import { prisma } from './prisma';
import * as http from "http";
import bcrypt from 'bcryptjs'


import { InMemorySessionStore, Session } from "./sessionStore";
const sessionStore = new InMemorySessionStore();


// Extend the interface
declare module 'socket.io' {
	interface Socket {
		userId: string;
		username: string;
	}
}

import crypto from 'crypto'
const randomId = () => crypto.randomBytes(8).toString("hex");

export const io = async (server: http.Server) => {
	const io: Server = new Server(server, {
		cors: {
			origin: "http://localhost:3000", // Explicitly allow requests from port 3000
			methods: ["GET", "POST"],
			allowedHeaders: ["*"],
			credentials: true
		}
	});

	io.use(async (socket: Socket, next) => {
		const { username, password } = socket.handshake.auth;
		if (!username || !password) {
			return next(new Error("invalid username"));
		}
		// find if username password
		const user = await prisma.user.findFirst({
			where: {
				name: username
			}
		});

		if (user) {
			if (user.password === password) {
				socket.userId = user.id.toString();
				socket.username = user.name;
				return next();
			}
			return next(new Error("invalid username"));
		}

		// create
		const createdUser = await prisma.user.create({
			data: {
				name: username,
				password: password,
			}
		})

		socket.userId = createdUser.id.toString();
		socket.username = createdUser.name;
		next();

	});

	io.on('connection', (socket: Socket) => {
		//	sessionStore.saveSession(socket.sessionID, {
		//		sessionID: socket.sessionID,
		//		userID: socket.userID,
		//		username: socket.username,
		//		connected: true,
		//	});

		// log all user
		const users = [];
		for (let [id, s] of io.of("/").sockets) {
			users.push({
				socketId: id,
				userId: s.userId,
				username: s.username,
			});
		}
		console.log(users);
		socket.emit("users", users); // emit to just that client
		socket.broadcast.emit("user connected", { // boardcast except this socket
			userID: socket.id,
			username: socket.username,
		});

		// join it own rooms.
		socket.join(socket.userId);

		//	socket.emit("session", { // emit to just that client
		//		sessionID: socket.sessionID,
		//		userID: socket.userID,
		//	});
		//


		//	//socket.on("join room", (roomId) => {
		//	//	socket.join(roomId);
		//	//})
		//	//
		//	//socket.on("public message", ({ content }) => {
		//	//	socket.emit("public message", {
		//	//		content,
		//	//		from: socket.id
		//	//	})
		//	//})
		//	//
		//	//socket.on("group message", ({ content, groupId }) => {
		//	//	socket.to(groupId).emit("group message", {
		//	//		content,
		//	//		from: socket.id,
		//	//	})
		//	//})
		//	//

		socket.on("private message", ({ content, to }) => {
			socket.to(to).emit("private message", {
				content,
				from: socket.userId,
				to
			});
		});
		//
		socket.on("disconnect", async () => {
			const users = [];
			for (let [id, s] of io.of("/").sockets) {
				if (id == socket.id) continue;
				users.push({
					socketId: id,
					userId: s.userId,
					username: s.username,
				});
			}
			socket.emit("users", users); // emit to just that client
			socket.broadcast.emit("user disconnected", { // boardcast except this socket
				userID: socket.id,
				username: socket.username,
			});
		});
	})
}


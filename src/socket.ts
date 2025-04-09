import { Server, Socket } from "socket.io";
import { prisma } from './prisma';
import * as http from "http";
import crypto, { hash } from 'crypto'
import { hashRoomName } from './Utils/Utils'
import { joinPrivateRoomHandler, privateMessageHandler, privateRoomHandler } from "./controller.socket/privateRoom.controller";
import { createPublicRoomHandler, joinPublicRoomHandler, publicMessageHandler, publicRoomHandler } from "./controller.socket/publicRoom.controller";
import { GlobalRoomHandler } from "./controller.socket/globalRoom.controller";

type User = {
	id: number;
	name: string;
}

// Extend the interface
declare module 'socket.io' {
	interface Socket {
		user: User;
		userId: number;
		username: string;
	}
}

export const io = async (server: http.Server) => {
	const io: Server = new Server(server, {
		cors: {
			origin: "http://localhost:3000", // Explicitly allow requests from port 3000
			methods: ["GET", "POST"],
			allowedHeaders: ["*"],
			credentials: true
		}
	});

	// middleware
	io.use(async (socket: Socket, next) => {
		const username = socket.handshake.headers.username as string;
		const password = socket.handshake.headers.password as string;

		if (!username || !password) {
			return next(new Error('Authentication error: No token provided'));
		}


		// find if username password
		const user = await prisma.user.findFirst({
			where: {
				name: username
			}
		});

		if (user) {
			if (user.password === password) {
				socket.userId = user.id;
				socket.username = user.name;
				socket.user = user;
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

		socket.userId = createdUser.id;
		socket.username = createdUser.name;
		socket.user = createdUser;
		next();
	});

	io.on('connection', (socket: Socket) => {
		const users = [];
		for (let [id, s] of io.of("/").sockets) {
			users.push({
				socketId: id,
				user: s.user
			});
		}
		console.log(users);

		// Emit to the *newly connected* client ONLY
		socket.emit("user connected", { users });

		// Notify *others* that someone new joined
		socket.broadcast.emit("new user joined", {
			socketId: socket.id,
			user: socket.data?.user,
		});

		// private room (DM) ====================
		privateRoomHandler(socket, io);
		// ======================================

		// public room ==========================
		publicRoomHandler(socket, io);
		//=======================================
		GlobalRoomHandler(socket, io);


		// disconnect controller
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
			socket.broadcast.emit("user disconnected", { // boardcast except this socket
				userID: socket.userId,
				username: socket.username,
				users: users
			});
		});
	})
}


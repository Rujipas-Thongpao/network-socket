import { Server, Socket } from "socket.io";
import { prisma } from './prisma';
import * as http from "http";
import crypto, { hash } from 'crypto'
import { hashRoomName } from './Utils/Utils'

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

	// create global room if there aren't one
	let globalRoom = await prisma.room.findFirst({
		where: {
			name: 'global room',
			type: 'public'
		}
	})


	if (!globalRoom) {
		globalRoom = await prisma.room.create({
			data: {
				hashName: hashRoomName('global room'),
				name: 'global room',
				type: 'public'
			}
		})
	}

	const io: Server = new Server(server, {
		cors: {
			origin: "http://localhost:3000", // Explicitly allow requests from port 3000
			methods: ["GET", "POST"],
			allowedHeaders: ["*"],
			credentials: true
		}
	});

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



		// private room (DM)
		socket.on("join private room", async (mes) => {
			const { otherName } = JSON.parse(mes);

			// find other
			const other = await prisma.user.findFirst({
				where: {
					name: otherName
				}
			})

			if (!other) {
				return;
			}

			const roomName = [socket.userId, other.id].sort().join('-');

			let privateRoom = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "private"
				}
			})
			if (!privateRoom) {
				privateRoom = await prisma.room.create({
					data: {
						hashName: hashRoomName(roomName),
						name: roomName,
						type: "private"
					}
				})
			}

			socket.join(privateRoom.hashName);
			console.log(socket.username, ' join private room ', privateRoom.hashName);
			io.to(privateRoom.hashName).emit("private : user connected", {
				user: socket.user
			})
		})

		socket.on("private message", async (mes) => {
			const { content, otherName } = JSON.parse(mes);

			// find other
			const other = await prisma.user.findFirst({
				where: {
					name: otherName
				}
			})

			if (!other) {
				return;
			}

			const roomName = [socket.userId, other.id].sort().join('-');

			const room = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "private"
				}
			})

			if (!room) {
				return;
			}

			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: room.id,
					senderId: socket.userId
				}
			})

			io.to(room.hashName).emit("private message", {
				content,
				from: socket.user,
				to: room
			});
		});

		// public room
		socket.on("create public room", async (mes) => {
			const { roomName } = JSON.parse(mes);

			const publicRoom = await prisma.room.create({
				data: {
					hashName: hashRoomName(roomName),
					name: roomName,
					type: "public"
				}
			})
			socket.join(publicRoom.hashName);
			await prisma.userRoom.upsert({
				where: {
					userId_roomId: {
						userId: socket.user.id,
						roomId: publicRoom.id
					}
				},
				update: {}, // nothing to update if it exists
				create: {
					userId: socket.user.id,
					roomId: publicRoom.id
				}
			});
		})

		socket.on("join public room", async (mes) => {
			const { hashRoomName } = JSON.parse(mes);

			// create room dynamically
			let publicRoom = await prisma.room.findFirst({
				where: {
					hashName: hashRoomName,
					type: "public"
				}
			})

			if (!publicRoom) {
				return;
			}

			socket.join(publicRoom.hashName);
			console.log(socket.username, ' join public room ', publicRoom.hashName);
			io.to(publicRoom.hashName).emit("public : user connected", {
				user: socket.user
			})

			// DB
			await prisma.userRoom.upsert({
				where: {
					userId_roomId: {
						userId: socket.user.id,
						roomId: publicRoom.id
					}
				},
				update: {}, // nothing to update if it exists
				create: {
					userId: socket.user.id,
					roomId: publicRoom.id
				}
			});
		})

		socket.on("public message", async (mes) => {
			const { content, hashRoomName } = JSON.parse(mes);

			const room = await prisma.room.findFirst({
				where: {
					hashName: hashRoomName,
					type: "public"
				}
			})

			if (!room) {
				return;
			}

			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: room.id,
					senderId: socket.userId
				}
			})

			io.to(room.hashName).emit("public message", {
				content,
				from: socket.user,
				to: room
			})
		})

		// join global room 
		socket.join(globalRoom.hashName);

		// Global
		socket.on("global message", async (mes) => {
			const { content } = JSON.parse(mes);

			console.log("message from global");
			console.log(content);

			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: globalRoom.id,
					senderId: socket.userId
				}
			})

			io.to(globalRoom.hashName).emit("global message", {
				content,
				from: socket.user,
				to: globalRoom
			})
		})

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


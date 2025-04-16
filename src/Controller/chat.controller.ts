import { prisma } from "../prisma";
import { Express, Request, RequestHandler, Response } from "express";

export const getMessages: RequestHandler = async (
  req: Request,
  res: Response
) => {
  // return chat of roomName
  const { hashRoomName } = req.params;

  const room = await prisma.room.findUnique({
    where: {
      hashName: hashRoomName,
    },
  });

  if (!room) {
    res.status(404).json({
      success: false,
      message: "can't find this room",
    });
  }

  const messages = await prisma.message.findMany({
    where: {
      roomId: room?.id,
    },
  });

  res.status(200).json({
    success: true,
    message: "find message successfully",
    data: messages,
  });
};

export const getRoom: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { hashRoomName } = req.params;

    const room = await prisma.room.findUnique({
      include: {
        members: {
          include: {
            user: true, // assuming UserRoom has a relation to User
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc", // or 'desc' if you want latest first
          },
          include: {
            sender: true, // assuming Message has a relation to User as sender
          },
        },
      },
      where: {
        hashName: hashRoomName,
      },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "can't find this room",
      });
    }
    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `internal server error : ${error.message}`,
    });
  }
};

export const getGroupRooms: RequestHandler = async (req, res) => {
  try {
    const username = req.query.name as string;

    if (!username) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'username' query parameter",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { name: username },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 1. Get all public rooms
    const publicRooms = await prisma.room.findMany({
      where: { type: "public" },
      include: {
        members: {
          include: {
            user: true, // keep full user object
          },
        },
      },
    });

    // 2. Get rooms the user has joined
    const userJoinedRooms = await prisma.userRoom.findMany({
      where: { userId: user.id },
      include: {
        room: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    const joinedRoomIds = new Set(userJoinedRooms.map((ur) => ur.room.id));

    // 3. Map public rooms with isUserJoined and full members
    const mappedPublicRooms = publicRooms.map((room) => ({
      id: room.id,
      name: room.name,
      hashName: room.hashName,
      type: room.type,
      theme: room.theme,
      createdAt: room.createdAt,
      members: room.members, // full member object with user details
      isUserJoined: room.members.some((m) => m.userId === user.id),
    }));

    // 4. Add private & global rooms user joined
    const joinedPrivateAndGlobal = userJoinedRooms
      .filter((ur) => ur.room.type === "private" || ur.room.type === "global")
      .map((ur) => {
        const room = ur.room;
        return {
          id: room.id,
          name: room.name,
          hashName: room.hashName,
          type: room.type,
          theme: room.theme,
          createdAt: room.createdAt,
          members: room.members, // full member object with user details
          isUserJoined: true,
        };
      });

    // 5. Merge and return all
    const allRooms = [...mappedPublicRooms, ...joinedPrivateAndGlobal];

    res.status(200).json({
      success: true,
      message: "Get group rooms successfully",
      data: allRooms,
    });
  } catch (error: any) {
    console.error("getGroupRooms error:", error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

export const changeRoomTheme: RequestHandler = async (req, res) => {
  try {
    const { hashRoomName } = req.params;
    const { theme } = req.body;
    const updatedRoom = await prisma.room.update({
      where: {
        hashName: hashRoomName,
      },
      data: {
        theme: theme,
      },
    });
    if (!updatedRoom) {
      res.status(400).json({
        success: false,
        message: "update theme unsuccessfully",
      });
    }
    res.status(200).json({
      success: true,
      message: "update theme unsuccessfully",
      data: updatedRoom,
    });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      messag: `internal server error : ${error.message}`,
    });
  }
};

export const getJoinedRoom: RequestHandler = async (req, res) => {
  try {
    const username = req.query.username as string;

    if (!username) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'username' query parameter",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { name: username },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const userRooms = await prisma.userRoom.findMany({
      where: { userId: user.id },
      include: {
        room: {
          include: {
            members: {
              include: {
                user: true, // ✅ include user info inside members
              },
            },
          },
        },
      },
    });

    const joinedRooms = userRooms.map((ur) => ur.room);

    res.status(200).json({
      success: true,
      message: "Get joined rooms successfully",
      data: joinedRooms,
    });
  } catch (error: any) {
    console.error("getJoinedRoom error:", error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

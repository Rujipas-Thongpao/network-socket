import crypto from 'crypto'

export const hashRoomName = (roomName: string) => {
    const randomSalt = crypto.randomBytes(8).toString('hex');
    const roomNameWithSalt = roomName + randomSalt;
    const hashName = crypto.createHash('sha256').update(roomNameWithSalt).digest('hex').slice(0, 16);
    return hashName
}




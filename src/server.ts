import { createServer } from 'http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { DB_LOG, ErrorCode, MAX_ROOMS, MAX_USERS, MAX_USERS_PER_ROOM, SERVER_LOBBY, SERVER_PORT, TILEMAP_COLUMNS, TILEMAP_ROWS } from './client/src/ts/settings'
import { WaveFunctionCollapse } from './wave-function-collapse'
import { readFileSync } from 'fs';
console.log(process.cwd())
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

app.use(cors())
const clientPath = path.join(__dirname, 'www')
const assetsPath = path.join(__dirname, 'client/assets')

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use(express.static(clientPath))
app.use(express.static(assetsPath))
class User {
    public username: string
    public position: { x: number, y: number }

    constructor(username: string, position: { x: number, y: number } = { x: 0, y: 0 }) {
        this.username = username
        this.position = position
    }

    public exportData(): { username: string; position: { x: number; y: number } } {
        return { 'username': this.username, 'position': this.position }
    }
}

class Room {
    public name: string
    public users: User[]
    public matrix: [number, number, boolean][][]
    constructor(name: string, users: User[], matrix: [number, number, boolean][][]) {
        this.name = name
        this.users = users
        this.matrix = matrix
    }
}

class DataBase {
    private lobby: User[]
    private rooms: Room[]
    constructor() {
        this.rooms = []
        this.lobby = []
    }

    public usersLength(): number {
        let count = this.lobby.length
        this.rooms.forEach(room => { count += room.users.length })
        return count
    }
    public usersLengthInRoom(roomName: string): number {
        return this.rooms.filter(a => a.name === roomName).pop()!.users.length
    }
    public usersLengthInLobby(): number {
        return this.lobby.length
    }
    public roomsLength(): number {
        return this.rooms.length
    }
    public getUser(username: string): User | undefined {
        let user: User | undefined = this.lobby.filter(a => a.username === username).pop()
        if (user === undefined)
            this.rooms.forEach(room => {
                user = room.users.filter(a => a.username === username).pop()
            })
        return user
    }
    public existUser(username: string): boolean {
        return this.getUser(username) != undefined
    }
    public getRoomsList(): { roomName: string, nUsers: number }[] {
        let roomsList: { roomName: string, nUsers: number }[] = []
        this.rooms.forEach(room => {
            roomsList.push({ roomName: room.name, nUsers: room.users.length })
        })
        return roomsList
    }

    public getRoom(roomName: string): Room | undefined {
        return this.rooms.filter(a => a.name === roomName).pop()
    }
    public getRoomByUser(username: string): Room | undefined {
        let foundRoom: Room | undefined
        this.rooms.forEach(room => {
            if (room.users.filter(user => user.username === username).length == 1) {
                foundRoom = room
            }
        })
        return foundRoom
    }
    public existRoom(room: string): boolean {
        return this.getRoom(room) != undefined
    }
    public addUser(username: string) {
        this.lobby.push(new User(username))
    }
    public addRoom(roomName: string, username: string, matrix: [number, number, boolean][][]): Room {
        const room = new Room(roomName, [this.getUser(username)!], matrix)
        this.rooms.push(room)
        this.lobby = this.lobby.filter(a => a.username !== username)
        return room
    }
    public joinInRoom(username: string, roomName: string) {
        let user = this.getUser(username)!
        this.rooms.filter(a => a.name === roomName).pop()!.users.push(user)
        this.lobby = this.lobby.filter(a => a.username !== username)
    }
    public getAllUsersInRoom(roomName: string): { username: string; position: { x: number; y: number } }[] {
        const data: { username: string; position: { x: number; y: number } }[] = []
        this.getRoom(roomName)!.users.forEach(user => data.push(user.exportData()))
        return data
    }
    public leaveRoom(username: string) {
        let room = this.getRoomByUser(username)!
        let user = this.getUser(username)!
        room.users = room.users.filter(a => a.username !== username)
        this.lobby.push(user)
    }

    public deleteRoom(roomName: string) {
        this.rooms = this.rooms.filter(a => a.name !== roomName)
    }

    public removeUser(username: string) {
        this.lobby = this.lobby.filter(a => a.username !== username)
        let room = this.getRoomByUser(username)
        if (room)
            room.users = room.users.filter(a => a.username !== username)
    }
    public log() {
        if (DB_LOG) {
            console.log('\n\n\n\n\n')
            console.log('[ROOMS]')
            console.log('-----------[LOBBY]:')
            this.lobby.forEach(user => console.log(`${user.username} {x: ${user.position.x}; y: ${user.position.y}}`))
            this.rooms.forEach(room => {
                console.log(`-----------[${room.name}]:`)
                room.users.forEach(user => console.log(`${user.username} {x: ${user.position.x}; y: ${user.position.y}}`))
            })
            console.log('------------------[]')
        }
    }
}
let db = new DataBase()
let matrix: [number, number, boolean][][] = []
let imageData = readFileSync('tilemap.png')
io.on('connection', (socket) => {

    socket.on('tilemap-req', () => { io.emit('tilemap-data', imageData) })

    socket.on('set-username-request', (data: { username: string }) => {
        if (db.usersLength() < MAX_USERS) {
            if (!db.existUser(data.username)) {
                console.log(`User '${data.username}' connected`)
                db.addUser(data.username)
                socket.emit('username-accepted', { 'username': data.username, 'roomList': db.getRoomsList() })
                if (db.usersLengthInLobby() > 1)
                    socket.broadcast.emit('character-connected', data.username)
            }
            else socket.emit('username-declined', { 'error': ErrorCode.ALREADY_EXISTS })
        }
        else socket.emit('username-declined', { 'error': ErrorCode.FULL })
        db.log()
    })
    socket.on('create-room-request', (data: { roomName: string, username: string }) => {
        if (db.roomsLength() < MAX_ROOMS) {
            if (!db.existRoom(data.roomName)) {
                let wfc = new WaveFunctionCollapse(TILEMAP_ROWS, TILEMAP_COLUMNS)
                matrix = wfc.resolve()
                const room = db.addRoom(data.roomName, data.username, matrix)
                socket.join(data.roomName) //first user in this room
                socket.emit('join-accepted', { 'username': data.username, 'allCharacters': [], 'mapMatrix': room.matrix })
                if (db.usersLengthInLobby() > 0)
                    socket.broadcast.emit('room-created', { 'roomName': data.roomName })
            }
            else socket.emit('room-declined', { 'error': ErrorCode.ALREADY_EXISTS })
        }
        else socket.emit('room-declined', { 'error': ErrorCode.FULL })
        db.log()
    })

    socket.on('join-request', (data: { username: string, roomName: string }) => {
        const room = db.getRoom(data.roomName)!
        if (db.usersLengthInRoom(data.roomName) < MAX_USERS_PER_ROOM) {
            const allUsersInfo = db.getAllUsersInRoom(data.roomName)
            db.joinInRoom(data.username, data.roomName)
            socket.join(room.name)
            socket.emit('join-accepted', { 'username': data.username, 'allCharacters': allUsersInfo, 'mapMatrix': room.matrix })
            console.log(`player ${data.username} joined in room ${room.name}`)
            if (db.usersLengthInLobby() > 0) {//to users in lobby
                socket.broadcast.emit('character-joined', data)
            }
        }
        else socket.emit('join-declined', { 'error': ErrorCode.FULL })
        db.log()
    })
    //event not used yet
    socket.on('user-left', (data: { username: string }) => {
        const room = db.getRoomByUser(data.username)!
        db.leaveRoom(data.username)
        socket.leave(room.name)
        if (db.usersLengthInRoom(room.name) > 0) {
            io.in(room.name).emit('character-left', data)
        }
        else {
            db.deleteRoom(room.name)
        }
        if (db.usersLengthInLobby() > 0) {
            socket.broadcast.emit('character-left', { 'roomName': room.name })
        }
        db.log()
    })

    socket.on('user-disconnected', (data: { username: string }) => {
        const room = db.getRoomByUser(data.username)
        db.removeUser(data.username)
        if (room) {
            if (db.usersLengthInRoom(room.name) > 0) {
                socket.in(room.name).emit('character-left', data)
            }
            else {
                db.deleteRoom(room.name)
            }
            socket.leave(room.name)
        }
        if (db.usersLengthInLobby() > 0) {
            socket.broadcast.emit('character-left', { 'roomName': room?.name ?? SERVER_LOBBY })
        }
        db.log()
    })

    socket.on('player-moved', (data: { username: string, position: { x: number, y: number } }) => {
        //Send message to everyone in room
        const room = db.getRoomByUser(data.username)!
        const user = db.getUser(data.username)!
        if (room && user) {
            user.position.x = data.position.x
            user.position.y = data.position.y
            if (db.usersLengthInRoom(room.name) > 1) {
                socket.in(room.name).emit('character-moved', data)
            }
            db.log()
        }
    })
})
httpServer.listen(SERVER_PORT)
console.log('[listening] waiting for connections...')
import { Vector } from "excalibur"
import { io, Socket } from "socket.io-client"
import { SERVER_ADDR, SERVER_PORT } from "@root/settings"
import { EventManager } from "@root/managers/event-manager"

export class WebSocketManager {
    private static instance: WebSocketManager


    private port: number
    private ipaddr: string
    private io: Socket
    constructor(_ipaddr: string, _port: number) {
        this.port = _port;
        this.ipaddr = _ipaddr;
        this.io = io(`http://${this.ipaddr}:${this.port}`)

        this.io.on('newmsg', (data) => {
            EventManager.getInstance().emit('characterMoved', data)
        })
        this.io.on('allCharacters', (data) => {
            EventManager.getInstance().emit('allCharacters', data)
        })
    }

    public static getInstance(
        _ipaddr: string = SERVER_ADDR,
        _port: number = SERVER_PORT
    ): WebSocketManager {
        if (!this.instance) {
            this.instance = new WebSocketManager(_ipaddr, _port)
        }
        return this.instance
    }

    public setUsername(username: string) {
        this.io.emit('setUsername', username)
        EventManager.getInstance().emit('newUser', username)
    }

    public sendPosition(username: string, position: Vector) {
        const data = {
            'username': username, 'position': { 'x': position.x, 'y': position.y }
        }
        this.io.emit('msg', data)
    }
}
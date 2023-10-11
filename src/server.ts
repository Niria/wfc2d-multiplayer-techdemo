import { createServer } from 'http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { SERVER_PORT } from './client/src/ts/settings'
import { WaveFunctionCollapse } from './wave-function-collapse'

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
const users: { username: string, position: { x: number, y: number }}[] = []
let matrix: [number, number, boolean][][] = []
io.on('connection', (socket) => {
    console.log('A user connected')
    socket.on('player-move', (data) => {
        //Send message to everyone
        let index = users.findIndex(a => a.username === data.username)
        if (index == -1) {
            if (users.length > 0) socket.emit('allCharacters', users)
            users.push(data)
        }
        else{
            users[index]!.position.x = data.position.x
            users[index]!.position.y = data.position.y
        }
        //console.log(data)
        socket.broadcast.emit('character-move', data)
    })

    socket.on('map-request', (data) =>{
        if(matrix.length == 0){
            let wfc = new WaveFunctionCollapse(data.tilemapRows, data.tilemapColumns)
            matrix = wfc.resolve()
        }
        console.log('map-request: received')
        console.log('sending matrix')
        console.log(matrix)
        socket.emit('map-response', matrix)
    })
})
httpServer.listen(SERVER_PORT)
console.log('[listening] waiting for connections...')
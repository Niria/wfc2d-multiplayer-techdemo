//Game settings
export const RES_WIDTH = 800
export const RES_HEIGHT = 600

//Scene names
export const MAINMENU = 'main-menu'
export const SELECTION_MENU = 'selection-menu'
export const MAP_ROOM = 'map-test'

//WebSocket settings
export const SERVER_ADDR = 'localhost'
export const SERVER_PORT = 7777
export const MAX_USERS = 20
export const MAX_USERS_PER_ROOM = 2
export const MAX_ROOMS = 5
export const LOBBY = 'lobby'

//error codes
export enum ErrorCode{
    FULL,
    ALREADY_EXISTS
}
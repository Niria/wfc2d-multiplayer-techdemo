import { Color, Engine, Input, Resolution } from "excalibur";
import { MainMenu } from "@root/scenes/main-menu";
import { Room } from "@root/scenes/room";
import { MAINMENU, RES_HEIGHT as GAME_HEIGHT, RES_WIDTH as GAME_WIDTH, ROOM, TEST_ROOM } from "@root/settings";
import { MapTest } from "./scenes/map-test";

export class Game extends Engine {
    constructor() {
        super({
            viewport: { width: GAME_WIDTH, height: GAME_HEIGHT },
            canvasElementId: 'game',
            backgroundColor: Color.Black,
            pointerScope: Input.PointerScope.Canvas,
            suppressHiDPIScaling: false
        })
        this.addScene(MAINMENU, new MainMenu())
        this.addScene(ROOM, new Room())
        this.addScene(TEST_ROOM, new MapTest())
    }
}



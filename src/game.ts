import { Engine } from "excalibur";
import { MainMenu } from "./scenes/main-menu";
import { Room } from "./scenes/room";
import { MAINMENU, ROOM } from "./constants";

export class Game extends Engine {
    constructor() {
        super({
            width: 800,
            height: 600
        })
        this.addScene(MAINMENU, new MainMenu())
        this.addScene(ROOM, new Room())
    }
}



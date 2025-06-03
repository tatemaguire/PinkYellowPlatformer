class OpenLevel extends BaseLevel {
    constructor() {
        let levelConfig = {
            mapKey: 'openLevel-map',
            width: 90,
            height: 90
        };
        super('openLevel', levelConfig);
    }

    create() {
        super.create();

        PLAYER_ABILITIES.WALL_JUMP = false;
        PLAYER_ABILITIES.COLOR_SWAP = false;
        PLAYER_ABILITIES.DASH = false;

        // first color swap at the beginning of the game that removes the yellow platform and drops you down
        // after this first color swap, you can't swap colors until you unlock the ability
        this.firstColorSwapDone = false;
        this.input.keyboard.on('keydown', (event) => {
            if (!this.firstColorSwapDone && (event.key == 'c')) {
                this.swapTerrainColor();
                this.firstColorSwapDone = true;
            }
        });
    }
}
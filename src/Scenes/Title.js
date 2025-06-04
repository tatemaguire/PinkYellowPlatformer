let PLAYER_ABILITIES = {
    WALL_JUMP: false,
    COLOR_SWAP: false,
    DASH: false
};

let PLAYER_STATS = {
    COINS: 0,
    KEYS: 0
};

class Title extends Phaser.Scene {
    constructor() {
        super('title');
    }

    create() {
        this.add.sprite(0, 0, 'titlescreen').setOrigin(0, 0);

        this.input.keyboard.on('keydown-Z', () => {
            this.scene.start('openLevel');
        });
    }
}
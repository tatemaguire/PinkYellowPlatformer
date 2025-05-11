class Load extends Phaser.Scene {
    constructor() {
        super('load');
    }

    preload() {
        this.load.setPath('./assets/');

        this.load.spritesheet('pico-8-platformer', 'sprites/extruded-transparent.png', {frameWidth: 8, frameHeight: 8, margin: 1, spacing: 2});
        this.load.tilemapTiledJSON('level1-map', 'tilemaps/level1.tmj');

        this.load.spritesheet('player-anim', 'sprites/playerAnimation.png', {frameWidth: 8, frameHeight: 8});
    }

    create() {
        this.scene.start('level1');

        this.anims.create({
            key: 'walk',
            frameRate: 16,
            repeat: -1,
            defaultTextureKey: 'player-anim',
            frames: [
                {frame: 0},
                {frame: 1},
                {frame: 2},
                {frame: 3}
            ]
        });

        this.anims.create({
            key: 'idle',
            frameRate: 1,
            frames: [
                {key: 'pico-8-platformer', frame: 91}
            ]
        });

        this.anims.create({
            key: 'jump',
            frameRate: 1,
            frames: [
                {key: 'pico-8-platformer', frame: 92}
            ]
        });

        this.anims.create({
            key: 'rest',
            frameRate: 1,
            frames: [
                {key: 'pico-8-platformer', frame: 93}
            ]
        });
    }
}
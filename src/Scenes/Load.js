class Load extends Phaser.Scene {
    constructor() {
        super('load');
    }

    preload() {
        this.load.setPath('./assets/');

        this.load.spritesheet('pico-8-platformer', 'sprites/double-extruded-transparent.png', {frameWidth: 8, frameHeight: 8, margin: 2, spacing: 4});
        this.load.tilemapTiledJSON('level1-map', 'tilemaps/level1.tmj');

        this.load.spritesheet('player-anim', 'sprites/playerAnimation.png', {frameWidth: 8, frameHeight: 8});
        this.load.atlas('particles', 'sprites/particles.png', 'sprites/particles.json');

        this.load.bitmapFont('mini-square-mono', 'fonts/Kenney-Mini-Square-Mono.png', 'fonts/Kenney-Mini-Square-Mono.xml');

        this.load.setPath('./assets/audio/bitcrushed/');
        this.load.audio('player-death', 'death.wav');
        this.load.audio('swap-color', 'swapColor.wav');
        this.load.audio('get-coin', 'getCoin.wav');
        this.load.audio('jump', 'jump.wav');
        this.load.audio('grassFootsteps', 'grassFootsteps.wav');
        this.load.audio('stoneFootsteps', 'stoneFootsteps.wav');
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
            duration: 1,
            defaultTextureKey: 'player-anim',
            frames: [
                {frame: 4, duration: 1000},
                {frame: 5, duration: 3000}
            ]
        });

        this.anims.create({
            key: 'die',
            frameRate: 8,
            defaultTextureKey: 'pico-8-platformer',
            frames: [
                {frame: 95},
                {frame: 94},
                {frame: 95},
                {frame: 96}
            ]
        });

        this.anims.create({
            key: 'coin',
            frameRate: 3,
            defaultTextureKey: 'pico-8-platformer',
            frames: [
                {frame: 88},
                {frame: 89}
            ],
            repeat: -1
        });
    }
}
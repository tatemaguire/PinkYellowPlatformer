class Load extends Phaser.Scene {
    constructor() {
        super('load');
    }

    preload() {
        this.load.setPath('./assets/');

        this.load.spritesheet('pico-8-platformer', 'sprites/tilemap_packed.png', {frameWidth: 8, frameHeight: 8});
        this.load.tilemapTiledJSON('level1-map', 'tilemaps/level1.tmj');
    }

    create() {
        this.scene.start('level1');
    }
}
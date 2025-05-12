class Level1 extends Phaser.Scene {
    constructor() {
        super('level1');
        this.my = {};
        this.my.sprite = {};
        this.my.collider = {};
    }

    create() {
        this.physics.world.gravity.y = 500;

        // create keys
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

        // make map layers
        this.my.map = this.add.tilemap('level1-map', 8, 8, 90, 20);
        this.my.tileset = this.my.map.addTilesetImage('Pico-8-Platformer', 'pico-8-platformer', 8, 8, 2, 4);
        this.my.skyLayer = this.my.map.createLayer('Sky', this.my.tileset, 0, 0);
        this.my.yellowLayer = this.my.map.createLayer('Yellow', this.my.tileset, 0, 0);
        this.my.pinkLayer = this.my.map.createLayer('Pink', this.my.tileset, 0, 0).setVisible(false);

        // create world collision
        this.my.yellowLayer.setCollisionByProperty({collides: true});
        this.my.pinkLayer.setCollisionByProperty({collides: true});

        // set bounds to level size
        this.physics.world.setBounds(0, 0, 90*8, 20*8);

        // create player
        this.my.sprite.player = new Player(this, 16, 16, this.leftKey, this.rightKey, this.zKey);
        
        // create player/world colliders
        let playerTileCollide = (player, tile) => {
            if (tile.properties.deadly) {
                this.my.sprite.player.kill();
            }
        }
        this.my.collider.playerYellow = this.physics.add.collider(this.my.sprite.player, this.my.yellowLayer, playerTileCollide);
        this.my.collider.playerPink = this.physics.add.collider(this.my.sprite.player, this.my.pinkLayer, playerTileCollide);
        this.my.collider.playerPink.active = false;
        
        // set up camera
        this.cameras.main.startFollow(this.my.sprite.player, true, 0.15, 1);
        this.cameras.main.setBounds(0, 0, 90*8, 20*8);
        this.cameras.main.setRoundPixels(true);
        
        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false;
    }

    restartLevel() {
        this.scene.start('level1');
    }
    
    update(time, delta) {
        this.my.sprite.player.update(time, delta);

        // swap colors when player presses C
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            if (this.my.yellowLayer.visible) {
                this.my.yellowLayer.visible = false;
                this.my.pinkLayer.visible = true;
                this.my.collider.playerYellow.active = false;
                this.my.collider.playerPink.active = true;
            }
            else {
                this.my.yellowLayer.visible = true;
                this.my.pinkLayer.visible = false;
                this.my.collider.playerYellow.active = true;
                this.my.collider.playerPink.active = false;
            }
        }
    }
}
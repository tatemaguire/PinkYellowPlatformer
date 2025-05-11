class Level1 extends Phaser.Scene {
    constructor() {
        super('level1');
        this.my = {};
        this.my.sprite = {};
        this.my.collider = {};
    }

    init() {
        this.ACCELERATION = 300;
        this.TURN_ACCELERATION = 800;
        this.DRAG = 800;
        this.MAX_VELOCITY = 80;
        this.physics.world.gravity.y = 500;
        this.JUMP_VELOCITY = 200;
    }

    create() {
        this.my.map = this.add.tilemap('level1-map', 8, 8, 90, 20);
        this.my.tileset = this.my.map.addTilesetImage('Pico-8-Platformer', 'pico-8-platformer');
        this.my.skyLayer = this.my.map.createLayer('Sky', this.my.tileset, 0, 0);
        this.my.yellowLayer = this.my.map.createLayer('Yellow', this.my.tileset, 0, 0);
        this.my.pinkLayer = this.my.map.createLayer('Pink', this.my.tileset, 0, 0).setVisible(false);

        this.my.yellowLayer.setCollisionByProperty({collides: true});
        this.my.pinkLayer.setCollisionByProperty({collides: true});

        this.physics.world.setBounds(0, 0, 8*90, 8*20); // set bounds to level size

        this.my.sprite.player = this.physics.add.sprite(16, 16, 'pico-8-platformer', 91)
        this.my.sprite.player.body.setCollideWorldBounds();
        this.my.sprite.player.body.setMaxVelocityX(this.MAX_VELOCITY);

        this.my.collider.playerYellow = this.physics.add.collider(this.my.sprite.player, this.my.yellowLayer);
        this.my.collider.playerPink = this.physics.add.collider(this.my.sprite.player, this.my.pinkLayer);
        this.my.collider.playerPink.active = false;

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // create keys
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    update() {
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

        // player movement
        if (this.leftKey.isDown && !this.rightKey.isDown) {
            this.my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            if (this.my.sprite.player.body.velocity.x > 0) {
                this.my.sprite.player.body.setAccelerationX(-this.TURN_ACCELERATION);
                console.log("turning");
            }
        }
        else if (this.rightKey.isDown && !this.leftKey.isDown) {
            this.my.sprite.player.body.setAccelerationX(this.ACCELERATION);
            if (this.my.sprite.player.body.velocity.x < 0) {
                this.my.sprite.player.body.setAccelerationX(this.TURN_ACCELERATION);
                console.log("turning");
            }
        }
        else {
            this.my.sprite.player.body.setAccelerationX(0);
            this.my.sprite.player.body.setDragX(this.DRAG);
        }

        if (this.my.sprite.player.body.blocked.down && this.zKey.isDown) {
            this.my.sprite.player.body.setVelocityY(-this.JUMP_VELOCITY);
        }

    }
}
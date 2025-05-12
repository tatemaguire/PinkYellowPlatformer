class Player extends Phaser.GameObjects.Sprite {
    static texture = 'pico-8-platformer';
    static frame = 91;

    constructor(scene, x, y, leftKey, rightKey, zKey) {
        super(scene, x, y, Player.texture, Player.frame);
        this.scene.physics.add.existing(this, 0);
        this.scene.add.existing(this);

        this.leftKey = leftKey;
        this.rightKey = rightKey;
        this.zKey = zKey;

        // design variables
        this.ACCELERATION = 500;
        this.TURN_ACCELERATION = 1000;
        this.DRAG = 1200;
        this.MAX_VELOCITY = 80;
        this.JUMP_VELOCITY = 170;
        this.JUMP_CANCEL_DECELERATION = 3000;

        // set up physics
        this.body.setCollideWorldBounds();
        this.body.setMaxVelocityX(this.MAX_VELOCITY);

        // player rest timer
        this.playerRestTimer = 0;
        this.playerRestStartTime = 2500; // ms, when to start rest animation

        this.dying = false;
    }

    kill() {
        if (this.dying) return;
        this.dying = true;
        this.body.stop();
        this.anims.play('die');
        this.on('animationcomplete-die', () => {
            this.scene.restartLevel();
        });
    }

    update(time, delta) {
        if (this.dying) return;

        // die if at the bottom of the world bounds
        if (this.body.y >= this.scene.physics.world.bounds.bottom - this.displayHeight) {
            this.kill();
            return;
        }

        // win if at the left of the world bounds
        if (this.body.x >= this.scene.physics.world.bounds.right - this.displayWidth*2) {
            this.scene.finishLevel();
        }

        // horizontal movement
        if (this.leftKey.isDown && !this.rightKey.isDown) {
            this.body.setAccelerationX(-this.ACCELERATION);
            if (this.body.velocity.x > 0) {
                this.body.setAccelerationX(-this.TURN_ACCELERATION);
            }
        }
        else if (this.rightKey.isDown && !this.leftKey.isDown) {
            this.body.setAccelerationX(this.ACCELERATION);
            if (this.body.velocity.x < 0) {
                this.body.setAccelerationX(this.TURN_ACCELERATION);
            }
        }
        else {
            this.body.setAccelerationX(0);
            this.body.setDragX(this.DRAG);
        }

        // jumping
        if (this.body.blocked.down && this.zKey.isDown) {
            this.body.setVelocityY(-this.JUMP_VELOCITY);
        }
        else if (!this.body.blocked.down && !this.zKey.isDown) {
            if (this.body.velocity.y < 0) {
                this.body.setAccelerationY(this.JUMP_CANCEL_DECELERATION);
            }
            else {
                this.body.setAccelerationY(0);
            }
        }
        else {
            this.body.setAccelerationY(0);
        }

        // choose animation
        if (!this.body.blocked.down) {
            this.anims.play('jump');
            this.playerRestTimer = 0;
        }
        else {
            if (this.leftKey.isDown || this.rightKey.isDown) {
                this.anims.play('walk', true);
                this.playerRestTimer = 0;
            }
            else {
                this.playerRestTimer += delta;
                if (this.playerRestTimer > this.playerRestStartTime) {
                    this.anims.play('rest', true);
                }
                else {
                    this.anims.play('idle', true);
                }
            }
        }

        // choose direction
        if (this.body.velocity.x < 0) {
            this.flipX = true;
        }
        else if (this.body.velocity.x > 0) {
            this.flipX = false;
        }
    }
}
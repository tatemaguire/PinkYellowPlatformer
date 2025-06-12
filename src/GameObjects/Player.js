class Player extends Phaser.GameObjects.Sprite {
    static texture = 'pico-8-platformer';
    static frame = 91;

    constructor(scene, x, y, leftKey, rightKey, zKey, xKey) {
        super(scene, x, y, Player.texture, Player.frame);
        this.scene.physics.add.existing(this, 0);
        this.scene.add.existing(this);

        this.leftKey = leftKey;
        this.rightKey = rightKey;
        this.zKey = zKey;
        this.xKey = xKey;

        // design variables
        this.ACCELERATION = 400;
        this.TURN_ACCELERATION = 1000;
        this.DRAG = 1200;
        this.MAX_VELOCITY = 75;
        this.MAX_SLIDE_VELOCITY = 20;
        this.TERMINAL_VELOCITY = 500;
        this.JUMP_VELOCITY = 170;
        this.JUMP_CANCEL_DECELERATION = 3000;
        this.DASH_VELOCITY = 160;
        this.DASH_LENGTH = 24; // pixels

        // set up physics
        this.body.setCollideWorldBounds();
        this.body.setMaxVelocityX(this.MAX_VELOCITY);
        this.body.setSize(6, 7, false);
        this.body.setOffset(1, 1);

        // player rest timer
        this.playerRestTimer = 0;
        this.playerRestStartTime = 2500; // ms, when to start rest animation

        this.dying = false;
        this.nextToLeftWall = false;
        this.nextToRightWall = false;
        this.slidingDownWall = false;
        this.lockedMovingRight = false;
        this.lockedMovingLeft = false;

        this.dashReadyStage1 = true; // when this is turned on, dashReady particle effect starts
        this.dashReadyStage2 = true; // when this is turned on, dash is actually ready
        this.touchedGroundAfterDash = false;
        this.dashing = false;
        this.dashCooldownTimer = 0;
        this.dashCooldownStage1Length = 800;
        this.dashCooldownStage2Length = 100;
        
        this.floorSoundsGrassy = false;
        this.floorEmitsStone = false;
        this.makeImpactWhenLanding = false;

        // footsteps
        this.footstepMaxVolume = 0.15;
        let footstepsConfig = {loop: true, volume: this.footstepMaxVolume, rate: 2}
        this.grassFootstepsSFX = this.scene.sound.add('grassFootsteps', footstepsConfig);
        this.stoneFootstepsSFX = this.scene.sound.add('stoneFootsteps', footstepsConfig);

        // impact sound
        let impactConfig = {volume: 0.25, rate: 2};
        this.grassImpactSFX = this.scene.sound.add('grassFootsteps', impactConfig);
        this.stoneImpactSFX = this.scene.sound.add('stoneFootsteps', impactConfig);

        // impact particles
        this.IMPACT_PARTICLE_COUNT = 5;
        this.impactParticles = new Phaser.GameObjects.Particles.ParticleEmitter(this.scene, 0, 0, 'particles', {
            frame: ['White-Small0', 'White-Large0'],
            rotate: [0, 90, 180, 270],
            speed: {min: 10, max: 40},
            gravityY: 200,
            lifespan: {min: 100, max: 200},
            angle: {min: 0, max: -180}
        });
        this.scene.add.existing(this.impactParticles);
        this.impactParticles.startFollow(this, 0, 4);
        this.impactParticles.stop();

        // wall slide particles
        this.wallSlideParticleConfig = {
            frame: ['White-Small0', 'White-Large0'],
            rotate: [0, 90, 180, 270],
            speed: {min:10, max: 40},
            gravityY: 200,
            lifespan: {min: 150, max: 300},
            angle: {min: -110, max: -70},
            frequency: 80
        };
        this.wallSlideParticles = this.scene.add.particles(0, 0, 'particles', this.wallSlideParticleConfig);
        this.wallSlideParticles.startFollow(this, 0, 2);
        this.wallSlideParticles.stop();

        // dash particles
        let dashParticleConfig = {
            frame: ['White-Small0', 'White-Small0', 'White-Large0'],
            rotate: [0, 90, 180, 270],
            lifespan: {min: 300, max: 600},
            follow: this,
            // speedY: {min: -4, max: 4},
            speedX: {
                onEmit: (particle) => {
                    // for some reason I can't do followOffset onEmit so I'm doing it here instead
                    particle.x += Math.random() * 4 - 2;
                    particle.y += (Math.pow(Math.random()-0.5, 3) * 4 + 0.5) * 8 - 4;
                    // still changing speedX though
                    return this.body.velocity.x * (-0.05);
                }
            },
            quantity: 1,
            frequency: 10
        };
        this.dashParticles = this.scene.add.particles(0, 0, 'particles', dashParticleConfig)
            .stop();

        // dash ready particles (communicates when dash is ready)
        let dashReadyParticleZone = new Phaser.Geom.Circle(0, 0, 20);
        let moveToUpdate = (particle, key) => (key === 'moveToX') ? this.x : this.y;
        let dashReadyParticleConfig = {
            frame: 'White-Small0',
            follow: this,
            emitZone: {
                type: 'random',
                source: dashReadyParticleZone
            },
            moveToX: {onUpdate: moveToUpdate},
            moveToY: {onUpdate: moveToUpdate},
            quantity: 15,
            lifespan: {min: 100, max: 300}
        };
        this.dashReadyParticles = this.scene.add.particles(0, 0, 'particles', dashReadyParticleConfig)
            .stop();
    }

    kill() {
        if (this.dying) return;
        this.dying = true;
        this.body.stop();
        this.body.setAllowGravity(false);

        this.scene.sound.play('player-death', {volume: 1});
        this.anims.play('die');
        this.on('animationcomplete-die', () => {
            this.scene.loadLastCheckpoint();
            this.body.setAllowGravity(true);
            this.dying = false;
        });
    }

    update(time, delta) {
        if (this.dying) return;

        // die if at the bottom of the world bounds
        if (this.body.y >= this.scene.physics.world.bounds.bottom - this.displayHeight) {
            this.kill();
            return;
        }

        // win if at the right of the world bounds
        if (this.body.x > this.scene.physics.world.bounds.right - this.displayWidth) {
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

        // lockedMoving left and right. 
        // turns off after the player reaches the top of their jump arc (velocityY > 0)
        if (this.lockedMovingLeft) {
            this.body.setVelocityX(-this.MAX_VELOCITY);
            if (this.body.velocity.y > 0) {
                this.lockedMovingLeft = false;
            }
        }
        if (this.lockedMovingRight) {
            this.body.setVelocityX(this.MAX_VELOCITY);
            if (this.body.velocity.y > 0) {
                this.lockedMovingRight = false;
            }
        }

        // next to wall detection
        if (this.body.blocked.left) this.nextToLeftWall = true;
        if (this.body.blocked.right) this.nextToRightWall = true;
        if (this.body.velocity.x !== 0) {
            this.nextToLeftWall = false;
            this.nextToRightWall = false;
        }

        // wall sliding
        if (PLAYER_ABILITIES.WALL_JUMP && !this.body.blocked.down && (this.nextToLeftWall || this.nextToRightWall)) {
            if (this.body.velocity.y > 0) {
                this.slidingDownWall = true;
                this.body.setMaxVelocityY(this.MAX_SLIDE_VELOCITY);
                if (this.nextToLeftWall) {
                    this.wallSlideParticles.followOffset.x = -4;
                    this.body.setVelocityX(-30); // pushes player into the wall, so 'next to wall detection' can work
                }
                else {
                    this.wallSlideParticles.followOffset.x = 4;
                    this.body.setVelocityX(30); // pushes player into the wall, so 'next to wall detection' can work
                }
                this.wallSlideParticles.start();
            }
            else {
                this.slidingDownWall = false;
                this.body.setMaxVelocityY(this.TERMINAL_VELOCITY);
            }
        }
        else {
            this.slidingDownWall = false;
            this.body.setMaxVelocityY(this.TERMINAL_VELOCITY);
            this.wallSlideParticles.stop();
        }

        // jumping
        if (Phaser.Input.Keyboard.JustDown(this.zKey)) {
            let jumping = true;
            if (this.body.blocked.down) {
                // jump
                this.body.setVelocityY(-this.JUMP_VELOCITY);
                this.impactParticles.followOffset.x = 0;
                this.impactParticles.explode(this.IMPACT_PARTICLE_COUNT);
            }
            else if (PLAYER_ABILITIES.WALL_JUMP && this.nextToLeftWall) {
                // wall jump from left wall
                this.body.setMaxVelocityY(this.TERMINAL_VELOCITY);
                this.body.setVelocityX(this.MAX_VELOCITY);
                this.body.setVelocityY(-this.JUMP_VELOCITY);
                this.lockedMovingRight = true;
                this.impactParticles.followOffset.x = -4;
                this.impactParticles.explode(this.IMPACT_PARTICLE_COUNT);
            }
            else if (PLAYER_ABILITIES.WALL_JUMP && this.nextToRightWall) {
                // wall jump from right wall
                this.body.setMaxVelocityY(this.TERMINAL_VELOCITY);
                this.body.setVelocityX(-this.MAX_VELOCITY);
                this.body.setVelocityY(-this.JUMP_VELOCITY);
                this.lockedMovingLeft = true;
                this.impactParticles.followOffset.x = 4;
                this.impactParticles.explode(this.IMPACT_PARTICLE_COUNT);
            }
            else {
                jumping = false;
            }

            if (jumping) {
                let detune = Math.random()*200 - 100;
                let volume = Math.random()*0.3 + 0.5;
                this.scene.sound.play('jump', {detune: detune, volume: volume});
            }
        }
        else if (!this.zKey.isDown && !this.body.blocked.down && this.body.velocity.y < 0) {
            this.body.setAccelerationY(this.JUMP_CANCEL_DECELERATION);
        }
        else {
            this.body.setAccelerationY(0);
        }

        // update dash
        if (this.dashing) {
            if (this.body.velocity.x < 0) this.body.setVelocityX(-this.DASH_VELOCITY);
            if (this.body.velocity.x > 0) this.body.setVelocityX(this.DASH_VELOCITY);

            // time to dash DASH_LENGTH pixels in milliseconds
            let dashTimeLength = this.DASH_LENGTH / this.DASH_VELOCITY * 1000;
            if (this.dashCooldownTimer > dashTimeLength || this.nextToLeftWall || this.nextToRightWall) {
                // end dash
                this.dashing = false;
                this.body.setMaxVelocityX(this.MAX_VELOCITY);
                this.body.setAllowGravity(true);
                this.dashParticles.stop();
            }
        }

        // detect if dash ready
        if (this.body.blocked.down || this.slidingDownWall) {
            this.touchedGroundAfterDash = true;
        }
        this.dashCooldownTimer += delta;
        if (!this.dashReadyStage1 && this.dashCooldownTimer > this.dashCooldownStage1Length && this.touchedGroundAfterDash) {
            this.dashReadyStage1 = true;
            this.dashReadyParticles.explode();
            setTimeout(() => {
                this.dashReadyStage2 = true;
            }, this.dashCooldownStage2Length);
        }

        // dashing
        if (Phaser.Input.Keyboard.JustDown(this.xKey) && PLAYER_ABILITIES.DASH && this.dashReadyStage2 && !this.slidingDownWall) {
            this.dashReadyStage1 = false;
            this.dashReadyStage2 = false;
            this.touchedGroundAfterDash = false;
            this.dashCooldownTimer = 0;
            this.dashing = true;
            // cancel locked movement after walljump
            this.lockedMovingLeft = false;
            this.lockedMovingRight = false;

            // by default dash in sprite's direction
            let dashLeft = this.flipX;
            // if an arrow key is down, dash in that direction instead
            if (this.leftKey.isDown && !this.rightKey.isDown) dashLeft = true;
            if (this.rightKey.isDown && !this.leftKey.isDown) dashLeft = false;

            // camera shake
            this.scene.cameras.main.shake(100, 0.007);
            // particles
            this.dashParticles.start();

            if (dashLeft) {
                this.body.setMaxVelocityX(this.DASH_VELOCITY);
                this.body.setVelocity(-this.DASH_VELOCITY, 0);
                this.body.setAllowGravity(false);
                this.dashInitialX = this.x;
            }
            else {
                this.body.setMaxVelocityX(this.DASH_VELOCITY);
                this.body.setVelocity(this.DASH_VELOCITY, 0);
                this.body.setAllowGravity(false);
                this.dashInitialX = this.x;
            }
        }

        // choose animation
        if (this.slidingDownWall) {
            this.playerRestTimer = 0;
            this.anims.play('slide');
        }
        else if (!this.body.blocked.down) {
            this.playerRestTimer = 0;
            this.anims.play('jump');
        }
        else if (this.leftKey.isDown != this.rightKey.isDown) { // rightKey XOR leftKey (not both)
            this.playerRestTimer = 0;
            this.anims.play('walk', true);
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

        // choose footsteps SFX
        if (this.body.blocked.down && (this.leftKey.isDown != this.rightKey.isDown)) {
            let volume = this.footstepMaxVolume * Math.abs(this.body.velocity.x/this.MAX_VELOCITY);
            let detune = Math.random() * 1500 - 1000;
            if (this.floorSoundsGrassy) {
                this.stoneFootstepsSFX.stop();
                this.grassFootstepsSFX.setVolume(volume);
                this.grassFootstepsSFX.setDetune(detune);
                if (!this.grassFootstepsSFX.isPlaying) this.grassFootstepsSFX.play();
            }
            else {
                this.grassFootstepsSFX.stop();
                this.stoneFootstepsSFX.setVolume(volume);
                this.stoneFootstepsSFX.setDetune(detune);
                if (!this.stoneFootstepsSFX.isPlaying) this.stoneFootstepsSFX.play();
            }
        }
        else {
            this.grassFootstepsSFX.stop();
            this.stoneFootstepsSFX.stop();
        }

        // impact
        if (this.makeImpactWhenLanding && this.body.blocked.down) {
            // impact sound
            this.stoneImpactSFX.setDetune(Math.random() * 500 - 250);
            if (this.floorSoundsGrassy) {
                this.grassImpactSFX.play();
                this.grassImpactSFX.setSeek(0.25);
            }
            else {
                this.stoneImpactSFX.play();
                this.stoneImpactSFX.setSeek(0.281);
            }
            // impact particles
            this.impactParticles.explode(this.IMPACT_PARTICLE_COUNT);
            this.makeImpactWhenLanding = false;
        }
        else if (!this.body.blocked.down) {
            this.makeImpactWhenLanding = true;
        }

        // choose direction
        if (this.body.velocity.x < -0.0001) {
            this.flipX = true;
        }
        else if (this.body.velocity.x > 0.0001) {
            this.flipX = false;
        }
    }
}
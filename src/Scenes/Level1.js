class Level1 extends BaseLevel {
    constructor() {
        let levelConfig = {
            mapKey: 'level1-map',
            width: 120,
            height: 20
        };
        super('level1', levelConfig);
    }

    create() {
        PLAYER_ABILITIES.WALL_JUMP = true;
        PLAYER_ABILITIES.COLOR_SWAP = true;
        PLAYER_ABILITIES.DASH = true;
        
        super.create();
    }
}
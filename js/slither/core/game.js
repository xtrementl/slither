/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Game
    Encapsulates the main game engine that oversees everything.
    ----------------------------------------------------------------------------------------

    Copyright 2010 Erik Johnson.
    Licensed under the LGPL Version 3 License.

    This file is part of Slither.

    Slither is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Slither is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with Slither.  If not, see <http://www.gnu.org/licenses/>.
 */

(function(Slither) {

/*
 * Constructor: Game
 * Establishes the class values, registers events, and establishes
 * game area, objects, and so on.
 *
 * *Note*: Throws 'Error' exception if invalid 'canvas' parameter provided.
 *
 * Parameters:
 *    canvas  - Canvas HTML DOM element to use as the game area.
 *    options - Hash with initial options for the object.
 *          - - on{EventType}, speed, lives.
 *              *See:* <DEFAULT_OPTIONS>
 */
var Game = function(canvas, options) {
    if (!canvas || !canvas.tagName || canvas.tagName.toUpperCase() != 'CANVAS') {
        throw new Error('Invalid Canvas element provided');
    }
    if (!canvas.getContext) {
        throw new Error('Unsupported browser');
    }

    // establish initial attribute values
    this.alloc_info = {};
    this.ctx = canvas.getContext('2d');
    this.boundaries = {
        width: canvas.clientWidth || parseInt(canvas.width.replace(/px/, ''), 10) || 0,
        height: canvas.clientHeight || parseInt(canvas.height.replace(/px/, ''), 10) || 0
    };

    options = Slither.setDefaults(Game.DEFAULT_OPTIONS, options);
    this.setupEventHandlers(options);
    this.setSpeed(options.speed);

    this.score = 0;
    this.lives = options.lives;
    if (this.lives <= 0) this.lives = Game.DEFAULT_OPTIONS.lives;
    this.prev_options = options; // save original options, could be useful

    // setup snake player, levels
    this.setupSnake();
    this.setupLevels();
};

/*
 * Hash: DEFAULT_OPTIONS
 *
 *    onEat      - Custom callback to receive 'eat' events.
 *               : function onEat(sender) {
 *               :    // sender is object that was eaten
 *               : }
 *    onDie      - Custom callback to receive 'die' events.
 *               : function onDie() {
 *               :    // always sent from snake (player)
 *               : }
 *    onScore    - Custom callback to receive 'score' events.
 *               : function onScore(score) {
 *               : }
 *    onUpgrade  - Custom callback to receive 'upgrade' events.
 *               : function onUpgrade(type, lives, score) {
 *               :    // type: See <Slither.UpgradeItemTypes>.
 *               : }
 *    onPoisoned - Custom callback to receive 'poisoned' events.
 *               : function onPoisoned(type, lives, score) {
 *               :    // type: See <Slither.PoisonItemTypes>.
 *               : }
 *    onGameOver - Custom callback to receive 'win' or 'lose' events.
 *               : function onGameOver(score, won) {
 *               :   // `won` is true if game was won
 *               : }
 *    speed      - Speed level difficulty for the game.
 *                 *Note:* Must be either 'random' or value within
 *                 <Slither.SpeedLevels> range.
 *    lives      - Number of lives to start out with.
 */
Game.DEFAULT_OPTIONS = {
    // custom events
    onEat: null,
    onDie: null,
    onScore: null,
    onUpgrade: null,
    onLoseUpgrade: null,
    onPoisoned: null,
    onGameOver: null,
    onLevelAdvance: null,
    onTimeWarp: null,

    speed: Slither.SpeedLevels.Min,
    lives: 3
};

var _Game = Game;
Game = Game.prototype;

// aliases
Game.event_man = Slither.Core.EventManager;
Game.object_man = Slither.Core.ObjectManager;
Game.level_man = Slither.Core.LevelManager;


/******************************************************************
 * Group: Private                                                 *
 ******************************************************************/


/*
 * Method: setupControls
 * Hooks into the document keydown event loop to provide controls for the game.
 */
Game.setupControls = function() {
    var _this = this;
    var key_down = function(event) {
        var KeyCodes = { // Enumeration
            Left: 37, Up: 38, Right: 39, Down: 40
        };
        if (!_this.snake || _this.finished) return;

        // get virtual keycode for key that was pressed
        var key_code = event ? event.keyCode : null;

        // switch snake heading
        var control_map = {};
        control_map[KeyCodes.Up] = Slither.Headings.Up;
        control_map[KeyCodes.Down] = Slither.Headings.Down;
        control_map[KeyCodes.Left] = Slither.Headings.Left;
        control_map[KeyCodes.Right] = Slither.Headings.Right;

        if (_this.started && key_code in control_map) {
            _this.snake.setHeading(control_map[key_code]);
        }
    };

    if (window.addEventListener) { // DOM 3, should be good...
        window.addEventListener('keydown', key_down, false);
    } else { // fallback on older version
        window.onkeydown = key_down;
    }
};

/*
 * Method: setupEventHandlers
 * Calls <setupControls> and registers callbacks for receiving game events.
 *
 * Parameters:
 *    options - Hash that was provided as the initial values to <Game> contructor.
 */
Game.setupEventHandlers = function(options) {
    // setup handler for game controls
    this.setupControls();

    // setup main game event handlers
    var event_map = {
        alloc: this.onAlloc, dealloc: this.onDealloc, eat: this.onEat,
        die: this.onDie, upgrade: this.onUpgrade, poisoned: this.onPoisoned
    };
    for (var name in event_map) {
        this.event_man.register(name, event_map[name], this);
    }

    // setup any provided custom event handlers
    if (typeof(options.onEat) == 'function') {
        this.event_man.register('eat', function(sender, data) {
            options.onEat(sender);
        });
    }

    if (typeof(options.onScore) == 'function') {
        this.event_man.register('score', function(sender, data) {
            options.onScore(this.score);
        }, this); // make sure to scope to game instance
    }

    if (typeof(options.onGameOver) == 'function') {
        this.event_man.register('gameover', function(sender, data) {
            options.onGameOver(this.score, data.win);
        }, this);
    }

    if (typeof(options.onUpgrade) == 'function') {
        this.event_man.register('upgrade', function(sender, data) {
            options.onUpgrade(data.type, this.lives, this.score);
        }, this);
    }

    if (typeof(options.onLoseUpgrade) == 'function') {
        this.event_man.register('lose-upgrade', function(sender, data) {
            options.onLoseUpgrade(data.type);
        }, this);
    }

    if (typeof(options.onPoisoned) == 'function') {
        this.event_man.register('poisoned.after', function(sender, data) {
            options.onPoisoned(data.type, this.lives, this.score);
        }, this);
    }

    if (typeof(options.onTimeWarp) == 'function') {
        this.event_man.register('timewarp', function(sender, data) {
            options.onTimeWarp();
        }, this);
    }

    // setup custom handlers that are allowed to perform pre-logic first, if desired
    var _this = this,
        nextLevel = function() { // advancing to next level
            _this.level_man.advance();
        },
        afterDie = function() { // after dies, default to restarting current level
            _this.level_man.advance(-1);
        };

    if (typeof(options.onLevelAdvance) == 'function') {
        this.event_man.register('level', function(sender, data) {
            var proxy = { defAction: nextLevel };
            return options.onLevelAdvance.call(proxy, this.level_man.getLevelNum()+1);
        }, this);
    }

    if (typeof(options.onDie) == 'function') {
        this.event_man.register('die.after', function(sender, data) {
            var proxy = { defAction: afterDie };
            return options.onDie.call(proxy, this.lives);
        }, this);
    }

    // main ones come after..
    this.event_man.register('level', nextLevel);
    this.event_man.register('die.after', afterDie);
};

/*
 * Method: setupLevels
 * Creates the logic that activates at the start of each level.
 */
Game.setupLevels = function() {
    this.level_man.removeAll();

    var O = Slither.Objects, _this = this,
        Walls = Slither.WallTypes, Upgrades = Slither.UpgradeItemTypes,
        Poison = Slither.PoisonItemTypes,
        prevObjInfo = []; // track generated objects for a restart

    // provide wrapper for class method, so we can track generated objects for level restarts
    var genObjects = function(range, classes, bias) {
        var objs = Slither.makeArray(_this.genObjects(range, classes, bias));
        Array.prototype.push.apply(prevObjInfo, objs); // save the objects generated
    };

    var addLevel = function(level) { // wrapper to add new level to manager
        if (typeof(level) == 'function') {
            _this.level_man.add(function(restart) {
                // setup for level
                this.pause();
                this.object_man.removeAll(); // clear objects
                this.setupSnake(restart);

                // execute level code
                if (restart) { // regenerate previous objects on level
                    for (var i = 0; i < prevObjInfo.length; i++) {
                        var obj_info = prevObjInfo[i],
                            constructor = obj_info.type;

                        this.object_man.add(new constructor(_this.boundaries, _this.ctx, Slither.setDefaults(obj_info.options, {
                            block_size: Slither.Objects.Base.DEFAULT_OPTIONS.block_size, // we'll use default block size for all objects
                            start_x: obj_info.position.x,
                            start_y: obj_info.position.y
                        })));
                    }
                } else {
                    prevObjInfo = []; // reset it for next time
                    level.call(this);
                }

                // handle special case for this upgrade type
                if (this.snake.hasUpgrade(Slither.UpgradeItemTypes.RatParalyzer)) {
                    this.freezeRats(true);
                }

                this.start();
            }, _this); // make sure to scope it for this
        }
    };

    // LEVEL 1
    addLevel(function() {
        genObjects([5, 7], [O.Grain, O.Mouse], 0.75);
    });

    // LEVEL 2
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.FourCorner }] ]); // always first
        genObjects([10, 13], [O.Mouse, O.Rat, O.Grain], [0.35, 0.15]);
    });
    
    // LEVEL 3
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.CrossHair }] ]); // always first
        genObjects([15, 22], [O.Mouse, O.Rat, O.Grain], [0.65, 0.30]);
        genObjects(1, [ [O.PoisonItem, { type: Poison.Deadly }] ]);
        genObjects(2, [ [O.PoisonItem, { type: Poison.Toxic }] ]);
    });

    // LEVEL 4
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.CrossDoubleBar }] ]); // always first
        genObjects([17, 25], [O.Mouse, O.Rat], 0.55);
        genObjects([0, 1], [ [O.UpgradeItem, { type: Upgrades.ExtraLife }] ]);
        genObjects(3, [ [O.PoisonItem, { type: Poison.Toxic }] ]);
    });
    
    // LEVEL 5
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.BrokenSquare }] ]); // always first
        genObjects([25, 30], [O.Rat, O.Mouse, O.Grain], [0.45, 0.35]);
        genObjects(1, [ [O.UpgradeItem, { type: Upgrades.RatParalyzer }] ]);
        genObjects(1, [ [O.UpgradeItem, { type: Upgrades.ShieldsUp }] ]);
        genObjects(1, [ [O.PoisonItem, { type: Poison.Toxic }] ]);
        genObjects(4, O.PoisonItem);
    });
    
    // LEVEL 6
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.CornerSofa }] ]); // always first
        genObjects([32, 38], [O.Rat, O.Mouse], 0.60);
        genObjects(1, [ [O.UpgradeItem, { type: Upgrades.WallBreaker }] ]);
        genObjects(1, [ [O.UpgradeItem, { type: Upgrades.TimeWarp }] ]);
        genObjects(5, O.PoisonItem);
    });
    
    // LEVEL 7
    addLevel(function() {
        genObjects(1, [ [O.Wall, { type: Walls.TripleTee }] ]); // always first
        genObjects([40, 50], [O.Rat, O.Mouse, O.Grain], [0.70, 0.10]);
        genObjects([0, 1], [ [O.UpgradeItem, { type: Upgrades.ExtraLife }] ]);
        genObjects(1, O.UpgradeItem);
        genObjects(4, [ [O.PoisonItem, { type: Upgrades.Deadly }] ]);
        genObjects(3, O.PoisonItem);
    });
};

/*
 * Method: setupSnake
 * Sets up snake on the board.
 *
 * Parameters:
 *     reset - Reset the snake to default.
 */
Game.setupSnake = function(reset) {
    this.player_dead = false;
    var snake = this.snake;
    if (typeof(reset) == 'undefined')  reset = true;

    var len, upgrades;
    if (snake) {
        len = snake.getLength();
        upgrades = snake.getUpgrades();
        this.object_man.remove(snake);
    }
    this.snake = null;

    var opts = { speed: this.getSpeed() };
    if (!reset && len) opts.length = len;

    this.snake = new Slither.Objects.PlayerClass(this.boundaries, this.ctx, opts);

    if (!reset && upgrades) { // add existing progressive upgrades
        for (var i = 0; i < upgrades.length; i++) {
            this.snake.addUpgrade(upgrades[i]);
        }
    }

    this.object_man.add(this.snake);
};

/*
 * Method: genObjects
 * Generates game objects for a game level, according to the provided class types and bias percentages.
 *
 * Parameters:
 *    range   - Boundary for random number of objects generated.
 *              *NOTE:* Can be a list: [low_val, high_val]. If one value provided or values match,
 *              then the value represents the total.
 *
 *    classes - Object class constructor or list. If list provided, then items can be the class constructor
 *              or a nested list with the class constructor [0] and a hash of options to pass in on construction [1].
 *
 *            - - *Examples*
 *            - - -- Slither.Objects.Grain
 *            - - -- [ Slither.Objects.Grain, Slither.Objects.Mouse ]
 *            - - -- [ [Slither.Objects.Grain, { fill_style: 'white' }], Slither.Objects.Mouse ]
 *
 *    bias    - Bias percentages (float between 0 and 1) for class types provided in `classes`.
 *              *Note:* Can provide a list of values; the order matches the order of items in `classes` and any
 *              values ellided will be given equal bias from what's left.
 *
 *              Examples:
 *              : 0.5 // 50% to first class, rest divide up
 *              : [0.5, 0.3, 0.2] // 50% first, 30% next, and 20% to last class
 *
 * Returns:
 *    List of the generated object information (e.g. [ { type: Slither.Objects.Rat, position: { x: 200, y: 10 } }, ... ])
 *    or false upon failure.
 */
Game.genObjects = function(range, classes, bias) {
    range = Slither.makeArray(range);
    classes = Slither.makeArray(classes);
    bias = Slither.makeArray(bias);

    // determine the total range to generate
    var num_high, num_low;
    if (range.length == 1) {
        num_high = parseInt(range[0], 10);
        if (isNaN(num_high)) return false;

        num_low = num_high;
    } else {
        num_low = parseInt(range[0], 10);
        num_high = parseInt(range[1], 10);

        if (isNaN(num_low) || isNaN(num_high) ||
            num_low < 0 || num_high < 0) {
            return false;
        }

        if (num_low > num_high) {
            num_low = num_high
        }
    }

    var target_count = Slither.genNumber(num_low, num_high), // random count within range
        perc_left = 1.0, ttl_count = 0, part_data = [], i, j;

    // use bias to partition `target_count` into portions according to the class type
    for (i = 0; i < classes.length; i++) {
        var target_bias;
        if (i < bias.length) {
            target_bias = Math.abs(parseFloat(bias[i], 10));
        } else { // account for ellided values
            // divide evenly amount those left or give what's left to last item
            var div = classes.length - i;
            target_bias = (div > 0) ? perc_left / div : perc_left; 
        }
        if (target_bias > perc_left) target_bias = perc_left; // can't go higher than 100% total
        perc_left -= target_bias;

        // figure out the count for each class type
        var bias_count = target_bias * target_count,
            lo_count = Math.floor(bias_count),
            hi_count = Math.ceil(bias_count),
            class_count = (bias_count - lo_count > hi_count - bias_count) ? hi_count : lo_count;

        // account for the case when lo/hi counts are equal:
        // let's just give the rest of the bias to last class type
        if (i == classes.length-1 && ttl_count < target_count) {
            class_count = target_count - ttl_count;
        }

        // save the partition count
        part_data.push(class_count);
        ttl_count += class_count;
    }

    // generate the objects according to partition data
    var block_size = Slither.Objects.Base.DEFAULT_OPTIONS.block_size, // we'll use default block size for all objects
        block_seg_x = Math.floor(this.boundaries.width / block_size),
        block_seg_y = Math.floor(this.boundaries.height / block_size),
        return_info = [];

    for (i = 0; i < part_data.length; i++) {
        var constructor = classes[i], options = {};
        if (!constructor) continue;

        // let's check if we've got extra init options along with the class
        if (typeof(constructor) != 'function') {
            if (constructor.length > 0) {
                if (constructor.length > 1) options = constructor[1]; // options to pass in
                constructor = constructor[0]; // constructor class
            } else continue;
        }

        for (j = 0; j < part_data[i]; j++) {
            var start_x, start_y;

            // make sure start positions don't collide
            do {
                // random positions within canvas boundaries
                start_x = Slither.genNumber(0, block_seg_x - 1) * block_size;
                start_y = Slither.genNumber(0, block_seg_y - 1) * block_size;
            } while (this.getAllocObj(start_x, start_y) != null);
            
            // add object to level; should be a derived class of Slither.Objects.Base
            this.object_man.add(new constructor(this.boundaries, this.ctx, Slither.setDefaults(options, {
                block_size: block_size,
                start_x: start_x,
                start_y: start_y
            })));

            // return object information
            return_info.push({
                type: constructor,
                options: options,
                position: { x: start_x, y: start_y }
            });
        }
    }

    return return_info;
};

/*
 * Method: getAllocObj
 * Determines if a coordinate is owned by an object.
 *
 * Parameters:
 *    x - X position.
 *    y - Y position.
 *
 * Returns:
 *    Owner object or null if not allocated.
 */
Game.getAllocObj = function(x, y) {
    if ((x in this.alloc_info) && (y in this.alloc_info[x])) {
        return this.alloc_info[x][y];
    }
    return null;
};

/*
 * Method: setAllocObj
 * Sets the owner object for a coordinate.
 *
 * Parameters:
 *    x     - X position.
 *    y     - Y position.
 *    owner - Owner object.
 */
Game.setAllocObj = function(x, y, owner) {
    // allocate space and associate with sender
    if (!(x in this.alloc_info)) {
        this.alloc_info[x] = { length: 0 };
    }

    var item = this.alloc_info[x];
    item[y] = owner;
    item.length++;
};


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Method: freezeRats
 * Freezes the motion of all rats in the game.
 *
 *    Parameters:
 *       enable - Boolean to enable/disable freezing.
 */
Game.freezeRats = function(enable) {
    var rats = this.object_man.getList(Slither.Objects.Rat);
    for (var i = 0; i < rats.length; i++) rats[i].animated = !enable;
};

/*
 * Callback: onAlloc
 * Receives 'alloc' events from objects requesting ownership of a new coordinate.
 * This will trigger a 'collide' event if an object already owns the space.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values.
 */
Game.onAlloc = function(sender, data) {
    // determine if space is occupied
    var owner = this.getAllocObj(data.coord.x, data.coord.y);

    if (owner != null) {
        // notify that collision occurred; space was occupied
        this.event_man.trigger('collide', this, {
            initiator: sender,
            receiver: owner,
            coord: { x: data.coord.x, y: data.coord.y }
        });
    } else {
        this.setAllocObj(data.coord.x, data.coord.y, sender);

        // notify just sender that allocation was successful
        this.event_man.trigger('alloc-recv', this, {
            target: sender,
            coord: { x: data.coord.x, y: data.coord.y }
        }, sender);
    }
};

/*
 * Callback: onDealloc
 * Receives 'dealloc' events from objects requesting release of ownership of a coordinate.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values.
 *            - - initiator - object that caused event.
 *            - - receiver  - object that was affected by event.
 */
Game.onDealloc = function(sender, data) {
    var owner = this.getAllocObj(data.coord.x, data.coord.y);

    if (owner === sender) { // must be allocated and the owner to deallocate
        if (!(data.coord.x in this.alloc_info)) return; // invalid
        var item = this.alloc_info[data.coord.x];

        if (--item.length == 0) {
            delete this.alloc_info[data.coord.x];
        } else {
            delete item[data.coord.y];
        }
    }
};

/*
 * Callback: onEat
 * Receives 'eat' events from objects having been eaten by the player.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - coord - Hash with 'x' & 'y' values.
 */
Game.onEat = function(sender, data) {
    // remove the eaten object
    this.object_man.remove(sender);
    if (!this.snake) return;

    // retrigger allocation event
    // notice, we do this now because a 'collide' event was previously triggered, but never 'alloc-recv'.
    // if we don't notify snake, it will have to try again at next draw.
    this.event_man.trigger('alloc', this.snake, { coord: { x: data.coord.x, y: data.coord.y } });

    var O = Slither.Objects;
    var basic_score = this.getSpeed() * 3;
    var basic_growth_offset = Math.ceil(this.getSpeed() * 0.5),
        growth_offset = basic_growth_offset;

    // mouse is basic score, grain is 20% of mouse, rat is 10x of mouse
    
    if (sender instanceof O.Mouse) {
        this.score += basic_score;
    } else if (sender instanceof O.Grain) {
        var grain_score = Math.ceil(0.2 * basic_score);
        this.score += grain_score;
        growth_offset = Math.ceil(0.2 * basic_growth_offset);
    } else if (sender instanceof O.Rat) {
        this.score += 10 * basic_score;
        growth_offset = Math.floor(0.1 * basic_growth_offset) + basic_growth_offset;
    }

    // grow the snake according to game speed
    this.snake.setLength(this.snake.getLength() + growth_offset); 
    this.event_man.trigger('score', this);

    // advance to the next level when all necessary objects are eaten
    var O = Slither.Objects;
    var check_types = [O.Rat, O.Grain, O.Mouse];

    for (var i = 0; i < check_types.length; i++) {
        if (this.object_man.getCount(check_types[i]) != 0) return; // found one, bail
    }

    // game over, win
    if (this.level_man.getLevelNum() == this.level_man.getCount()) {
        this.end();
        this.event_man.trigger('gameover', this, { win: true });
        return false;
    }
   
    // trigger level advancement events
    this.event_man.trigger('level', this);
};

/*
 * Callback: onDie
 * Receives 'die' events from objects, indicating the player has died.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - coord - Hash with 'x' & 'y' values.
 */
Game.onDie = function(sender, data) {
    if (sender instanceof Slither.Objects.Wall) { // collided with wall
        // snake has WallBreaker progressive upgrade, remove wall piece and carry on
        if (this.snake.hasUpgrade(Slither.UpgradeItemTypes.WallBreaker)) {
            this.object_man.remove(sender);
            
            // retrigger allocation event
            // notice, we do this now because a 'collide' event was previously triggered, but never 'alloc-recv'.
            // if we don't notify snake, it will have to try again at next draw.
            this.event_man.trigger('alloc', this.snake, { coord: { x: data.coord.x, y: data.coord.y } });
            return; // bail out
        }
    }

    // remove all progressive upgrades from snake
    var list = this.snake.getUpgrades();
    for (var i = 0; i < list.length; i++) {
        this.snake.removeUpgrade(list[i]);
        this.event_man.trigger('lose-upgrade', this, { type: list[i] });
    }

    // game over, lose
    if (--this.lives == 0) {
        this.end();
        this.event_man.trigger('gameover', this, { win: false });
        return false;
    }
    
    // unfreeze motion of all rats currently in game
    this.freezeRats(false);

    // pause game, snake died
    this.pause();
    this.player_dead = true;

    // trigger anything following 'die' events
    this.event_man.trigger('die.after', sender);
};

/*
 * Callback: onUpgrade
 * Receives 'upgrade' events from objects, indicating the player has eaten an upgrade item.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - type - Type of upgrade item eaten. *See:* <Slither.UpgradeItemTypes>.
 */
Game.onUpgrade = function(sender, data) {
    // remove the upgrade item eaten by snake
    this.object_man.remove(sender);
    
    // retrigger allocation event
    // notice, we do this now because a 'collide' event was previously triggered, but never 'alloc-recv'.
    // if we don't notify snake, it will have to try again at next draw.
    this.event_man.trigger('alloc', this.snake, { coord: { x: data.coord.x, y: data.coord.y } });

    var types = Slither.UpgradeItemTypes;
    switch (data.type) {
        /* Instant */
        case types.ExtraLife:
            this.lives++;
            break;
        case types.TimeWarp:
            // timewarp back to the beginning of levels
            this.event_man.trigger('timewarp', this);
            this.level_man.startOver();
            break;

        /* Progressive */
        case types.RatParalyzer:
            // freeze motion of all rats currently in game
            this.freezeRats(true);
            this.snake.addUpgrade(data.type); // add it to snake
            break;
        case types.WallBreaker:
        case types.ShieldsUp:
            this.snake.addUpgrade(data.type); // add it to snake
            break;
    }
};

/*
 * Callback: onPoisoned
 * Receives 'poisoned' events from objects, indicating the player has eaten a poison item.
 *
 * Parameters:
 *     sender - The sender of the event; generally a subclass of <Objects.Base>,
 *              but could be any object available on the game.
 *     data   - Hash with information about the event.
 *
 *            - - type - Type of poison item eaten. *See:* <Slither.PoisonItemTypes>.
 */
Game.onPoisoned = function(sender, data) {
    // remove the upgrade item eaten by snake
    this.object_man.remove(sender);
    
    // retrigger allocation event
    // notice, we do this now because a 'collide' event was previously triggered, but never 'alloc-recv'.
    // if we don't notify snake, it will have to try again at next draw.
    this.event_man.trigger('alloc', this.snake, { coord: { x: data.coord.x, y: data.coord.y } });

    // snake has ShieldsUp progressive upgrade, allow it only this time
    if (this.snake.hasUpgrade(Slither.UpgradeItemTypes.ShieldsUp)) {
        this.snake.removeUpgrade(Slither.UpgradeItemTypes.ShieldsUp);
        this.event_man.trigger('lose-upgrade', this, { type: Slither.UpgradeItemTypes.ShieldsUp });
        return;
    }
    
    // remove current progressive upgrades
    var list = this.snake.getUpgrades();
    for (var i = 0; i < list.length; i++) {
        this.snake.removeUpgrade(list[i]);
        this.event_man.trigger('lose-upgrade', this, { type: list[i] });
    }
    // unfreeze motion of all rats currently in game
    this.freezeRats(false);

    var types = Slither.PoisonItemTypes;
    var died = false;
    switch (data.type) {
        case types.Deadly:
            died = true;
            break;
        case types.Toxic:
            this.score -= 20 * this.getSpeed();
            if (this.score < 0) this.score = 0;
            break;
        case types.Obnoxious: // only removes upgrades.. see above
            break;
    }

    // trigger anything after 'poisoned' events
    this.event_man.trigger('poisoned.after', sender, data);
    if (died) this.event_man.trigger('die', sender, { coord: { x: data.coord.x, y: data.coord.y } }); // was deadly, kill snake after
};


/******************************************************************
 * Group: Public                                                  *
 ******************************************************************/


/*
 * Method: toString
 * The representative string for this object.
 *
 * Returns:
 *    String
 */
Game.toString = function() { return 'Game'; };

/*
 * Method: getSpeed
 * Gets the game timing speed.
 *
 * Returns:
 *    Integer
 */
Game.getSpeed = function() {
    var speed = this.snake ? this.snake.getSpeed() : this.speed;
    return speed || Slither.SpeedLevels.Min;
};

/*
 * Method: setSpeed
 * Sets the game timing speed.
 *
 * Parameters:
 *    speed - the new game speed timing.
 *            *Note:* Must be either 'random' or value within
 *            <Slither.SpeedLevels> range.
 */
Game.setSpeed = function(speed) {
    if (speed < Slither.SpeedLevels.Min) {
        speed = Slither.SpeedLevels.Min;
    } else if (speed > Slither.SpeedLevels.Max) {
        speed = Slither.SpeedLevels.Max;
    }
    this.speed = speed;

    // set snake speed
    if (this.snake) this.snake.setSpeed(this.speed);
},

/*
 * Method: getSize
 * Retrieves the dimensions of the game area (from internal Canvas HTML DOM element).
 *
 * Returns:
 *    Hash of values: width/height.
 */
Game.getSize = function() {
    return {
        width: this.boundaries.width,
        height: this.boundaries.height
    };
};

/*
 * Method: start
 * Starts the game timer, starting up the object animation chain.
 */
Game.start = function() {
    if (!this.started && !this.finished && !this.player_dead) {
        if (this.level_man.getLevelNum() < 1) this.level_man.advance(); // start first level
        this.object_man.start(Slither.FRAME_RATE);
        this.started = true;
    }
};

/*
 * Method: pause
 * Stops the game timer along with the object animation chain.
 */
Game.pause = function() {
    if (this.started && !this.finished && !this.player_dead) {
        this.started = false;
        this.object_man.stop();
    }
};

/*
 * Method: end
 * Stops the game timer and prevents starting game without a restart.
 */
Game.end = function() {
    if (this.started) {
        this.pause();
        this.finished = true;
    }
};

/*
 * Method: restart
 * Restarts the game, restoring the original version, score, and so on.
 */
Game.restart = function() {
    this.started = false;
    this.finished = false;
    this.pause();
    this.setupSnake();
    this.score = 0;
    this.alloc_info = {};
    this.lives = this.prev_options ? this.prev_options.lives : Game.DEFAULT_OPTIONS.lives;
    if (this.lives <= 0) this.lives = Game.DEFAULT_OPTIONS.lives;
    this.level_man.startOver();
};

// expose to core object
Game = _Game;
Slither.Game = Slither.Core.Game = Game;

})(Slither);

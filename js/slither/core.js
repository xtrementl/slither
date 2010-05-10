/*
    ----------------------------------------------------------------------------------------
    Package: Slither
    Global object that encapsulates the components that drive the game.
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

(function(window, document) {

var Slither = {
    /*
     *  List: Constants
     *
     *  AUTOLOAD_BASE_PATH - Base path for scripts provided in <AUTOLOAD_SCRIPTS>.
     *  AUTOLOAD_SCRIPTS   - Relative script names that should be loaded automatically.
     *                       Useful if package is spread across multiple files.
     *                       Set to *false* or leave empty if minifying package deployment.
     *  FRAME_RATE         - Target frame rate for the game (frames per second).
     *  PLAYER_CLASS       - Class constructor string for the player object for the game.
     *
     */
    AUTOLOAD_BASE_PATH: 'js/slither/',
    AUTOLOAD_SCRIPTS: [
        'core/object_manager.js', 'core/event_manager.js', 'core/level_manager.js', 'core/game.js',
        'objects/standard.js', 'objects/rat.js', 'objects/upgrade_item.js', 'objects/poison_item.js', 
        'objects/wall.js', 'objects/snake.js'
    ],
    FRAME_RATE: 40, // 30 or better
    PLAYER_CLASS: 'Slither.Objects.Snake',

    /*
     * Enumeration: SpeedLevels
     * Defines the constraints for the game speed timing.
     *
     *    Min - Minimum speed level
     *    Max - Maximum speed level
     */
    SpeedLevels: {
        Min: 1,
        Max: 5
    },

    /*
     * Enumeration: Headings
     * Defines the directions (headings) by which the snake can move.
     *
     *    Left  - Leftward heading
     *    Up    - Upward heading
     *    Right - Rightward heading
     *    Down  - Downward heading
     */
    Headings: {
        Left: 1,
        Up: 2,
        Right: 3,
        Down: 4
    },

    /*
     * Enumeration: UpgradeItemTypes
     * Defines the types of upgrade items available for a snake.
     *
     *    ExtraLife    - An extra life is provided to the player.
     *    TimeWarp     - Player is transported back to level 1 while
     *                   retaining player health, score, and progressive
     *                   upgrade items.
     *    WallBreaker  - Allows player to crash through and destroy an
     *                   entire wall upon collision without dying.
     *    RatParalyzer - Freezes the motion of all rats in the game.
     *    ShieldsUp    - Allows for eating a single poison item without harm.
     */
    UpgradeItemTypes: {
        ExtraLife: 1, TimeWarp: 2, WallBreaker: 3,
        RatParalyzer: 4, ShieldsUp: 5
    },

    /*
     * Enumeration: PoisonItemTypes
     * Defines the types of poison items available in the game.
     *
     *    Deadly    - Instant death, removing a life from the snake and
     *                progressive upgrade items.
     *    Toxic     - Removes 20 times the current snake's speed
     *                from the player score.
     *    Obnoxious - Simply removes all current progressive upgrade
     *                   items applied to the snake.
     */
    PoisonItemTypes: {
        Deadly: 1,
        Toxic: 2,
        Obnoxious: 3
    },

    /*
     * Enumeration: WallTypes
     * Defines the types of walls available in the game.
     * See <Slither.Objects.Wall> for more information.
     *
     *    FourCorner, CrossHair, CrossDoubleBar, CornerMesh,
     *    BrokenSquare, TripleTee, GoalSplit, ClownInsanity
     */
    WallTypes: {
        FourCorner: 1,
        CrossHair: 2,
        CrossDoubleBar: 3,
        CornerSofa: 4,
        BrokenSquare: 5,
        TripleTee: 6,
        GoalSplit: 7,
        ClownInsanity: 8
    },

    /******************************************************************
     * Group: Utilities                                               *
     ******************************************************************/

    /*
     * Method: toString
     * The representative string for this object.
     *
     * Returns:
     *    String
     */
    toString: function() { return 'Slither'; },

    /*
     * Method: loadScripts
     * Dynamically loads required scripts for this package.
     * *Note:* External scripts may also be used.
     *
     * Parameters:
     *    base_path   - Base path to use for provided scripts.
     *    scripts     - List of scripts to combine with base_path and load.
     */
    loadScripts: function(base_path, scripts) {
        // check if we've loaded all of them
        scripts = Slither.makeArray(scripts);
        if (scripts.length == 0) {
            Slither.ready(true);
            return;
        }

        // get first script from list
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = (base_path || '') + scripts[0];

        // when it loads, load the next script
        s.onload = function() {
            Slither.loadScripts(base_path, scripts.slice(1));
        };
        head.appendChild(s); // add it to head to start loading
    },

    /*
     * Method: ready
     * Executes a function in document scope when Slither has loaded.
     *
     * Parameters:
     *    callback - Callback function to execute.
     *               *Note:* If set to boolean value will
     *               set the loaded state for Slither.
     */
    ready: function(callback) {
        if (!Slither.ready.list) {
            Slither.ready.list = [];
        }

        if (typeof(callback) == 'function') {
            Slither.ready.list.push(callback);
        } else {
            Slither.ready.loaded = (callback === true);
        }

        if (Slither.ready.loaded) { // we're loaded
            // create a reference to the class referenced in PLAYER_CLASS
            Slither.Objects.PlayerClass = eval(Slither.PLAYER_CLASS);
            if (typeof(Slither.Objects.PlayerClass) != 'function') {
                throw new Error('Failed to load object referenced by Slither.PLAYER_CLASS');
            }

            // run the list of callbacks
            var len = Slither.ready.list.length;
            for (var i = 0; i < len; i++) {
                Slither.ready.list[i].call(document);
            }
            Slither.ready.list = [];
        }
    },

    /*
     * Method: extend
     * Uses the well-known method of prototype chaining via constructor
     * functions to provide virtual class-based inheritance.
     * Based on YAHOO.lang.extend <http://developer.yahoo.com/yui/yahoo/#extend>.
     *
     * Parameters:
     *    base - Base class constructor function.
     *    sub  - Subclass constructor
     */
    extend: function(base, sub) {
        // create a mock (proxy) function object to hold a copy
        // of the base class's prototype object
        var proxy = function() {};
        proxy.prototype = base.prototype;

        // attach the copied prototype over to the subclass
        sub.prototype = new proxy();
        sub.prototype.init = sub;
        sub.base = base.prototype; // give it access to base class

        // ensure that base will only be called once
        if (base.prototype.init == Object.prototype.init) {
            base.prototype.init = base;
        }
    },

    /*
     * Method: setDefaults
     * Provides simple interface to combine a set of options with defaults.
     *
     * Parameters:
     *    obj     - The object containing default settings.
     *    options - The object that has properties to combine/overwrite
     *              with those from <obj>.
     *    deep    - Use deep copy for object and function properties.
     *              Defaults to *false*.
     *
     * Returns:
     *    New object instance.
     */
    setDefaults: function(obj, options, deep) {
        var newObj = new Object();

        // copy over properties from obj
        for (var option in obj) {
            var type = typeof(obj[option]);
 
            if (deep && (type == 'object' || type == 'function')) { // use deep copy
                newObj[option] = Slither.setDefaults(obj[option], {}, deep);
            } else { // shallow copy (suitable for native values)
                newObj[option] = obj[option];
            }
        }
 
        // overwrite any properties provided
        if (options) {
            for (var option in options) {
                newObj[option] = options[option];
            }
        }
        return newObj;
    },

    /*
     * Method: genNumber
     * Generates a number within a specified range.
     *
     * Parameters:
     *    low  - Lower boundary.
     *    high - Upper boundary.
     *
     * Returns:
     *    Random number within range.
     */
    genNumber: function(low, high) {
        if (low == high) return low;
        return Math.floor(Math.random() * (high - low + 1)) + low;
    },

    /*
     * Method: makeArray
     * Converts an object into an array of those objects.
     * Based on jQuery.makeArray <http://api.jquery.com/jQuery.makeArray/>.
     *
     * Parameters:
     *    obj - Any object to turn into a native Array.
     */
    makeArray: function(obj) {
        if (!obj && typeof(obj) != 'number') return [];

        // array-like object
        if (Object.prototype.toString.call(obj) === "[object Array]") {
            return Array.prototype.slice.call(obj, 0);
        }

        return [obj];
    },

    /*
     * Package: Core
     * Encapsulates the major components of the game engine.
     */
    Core: {},

    /*
     * Package: Objects
     * Encapsulates the physical objects that exist within the game.
     */
    Objects: {

        /*
         * Class: Objects.PlayerClass
         * Object that represents the current player class constructor.
         * When Slither loads, <Slither.PLAYER_CLASS> is referenced in order to instantiate the object.
         */
        PlayerClass: function() {
            throw new Error('Slither.Objects.PlayerClass failed to load');
        }
    }
}; /* End Slither */

/*
 * Class: Objects.Base
 * Encapsulates the basic functionality of a physical game object.
 * Most physical game objects extend from as a base.
 */

/*
 * Constructor: Base
 * Establishes the class values and registers this class to receive
 * 'collide' and 'alloc-recv' events in its associated callback methods.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *
 *               - - height, width
 *
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *
 *               - - fill_style, block_size, start_x, start_y, animated, speed.
 *                 *See:* <DEFAULT_OPTIONS>.
 */
var Base = function(boundaries, context, options) {
    // establish initial attribute values
    options = Slither.setDefaults(Base.DEFAULT_OPTIONS, options);
    this.boundaries = boundaries;
    this.ctx = context;
    this.body_blocks = [];
    this.block_size = Base.DEFAULT_OPTIONS.block_size; // enforce default block size
    this.fill_style = options.fill_style;
    this.animated = options.animated;
    this.setSpeed(options.speed);
    
    // register for receiving collide events
    if (!Slither.Core.EventManager.register('collide', this.onCollide, this)) {
        throw new Error("Failed to register 'collide' event for new " + this + " object");
    }
    
    // register for receiving alloc-recv events
    if (!Slither.Core.EventManager.register('alloc-recv', this.onAllocRecv, this)) {
        throw new Error("Failed to register 'alloc-recv' event for new " + this + " object");
    }

    // allocate initial starting block
    if (typeof(options.start_x) != 'undefined' && typeof(options.start_y) != 'undefined') {
        this.allocBlock(options.start_x, options.start_y);
    }
};

/*
 * Hash: DEFAULT_OPTIONS
 *
 *    fill_style - The canvas fill style to use for all blocks
 *                 drawn for the object.
 *    block_size - The size for each block that makes up the object.
 *                 *Note:* For simplicity, the game assumes the same
 *                 value for all objects and will enforce this default
 *                 regardless of the value provided by subclassed objects.
 *    start_x    - The starting X position for the object,
 *                 relative to top-left of the parent canvas.
 *    start_y    - The starting Y position for the object,
 *                 relative to top-left of the parent canvas.
 *    animated   - Determines if this object will need to redrawn
 *                 based on the game speed timing.
 *    speed      - Speed level difficulty for the game.
 *                 *Note:* Must be either 'random' or value within
 *                 <SpeedLevels> range.
 */
Base.DEFAULT_OPTIONS = {
    fill_style: '#000', // black
    block_size: 10,
    start_x: undefined,
    start_y: undefined,
    animated: false,
    speed: Slither.SpeedLevels.Min,
};

var _Base = Base;
Base = Base.prototype;


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Method: drawBlock
 * Draws block on the parent canvas.
 *
 * Parameters:
 *    x - X position.
 *    y - Y position.
 */
Base.drawBlock = function(x, y) {
    this.ctx.fillStyle = this.fill_style;
    this.ctx.fillRect(x, y, this.block_size, this.block_size);
};

/*
 * Method: eraseBlock
 * Erases a block from the parent canvas and deallocates the space.
 *
 * Parameters:
 *    x - X position.
 *    y - Y position.
 */
Base.eraseBlock = function(x, y) {
    this.ctx.clearRect(x, y, this.block_size, this.block_size);
    Slither.Core.EventManager.trigger('dealloc', this, { coord: { x: x, y: y } });
};

/*
 * Method: allocBlock
 * Allocates a new block on the parent canvas for the object.
 *
 * Parameters:
 *    x - X position.
 *    y - Y position.
 */
Base.allocBlock = function(x, y) {
    if (typeof(x) == 'undefined' || typeof(y) == 'undefined') return; // invalid
    Slither.Core.EventManager.trigger('alloc', this, { coord: { x: x, y: y } });
};

/*
 * Method: adjustBlockWrap
 * Adjusts the block coordinate for wrap around when reaching borders.
 *
 * Parameters:
 *    coord - Coordinate hash with 'x' and 'y' values.
 */
Base.adjustBlockWrap = function(coord) {
    // wrap around to bottom
    if (coord.y < 0) {
        coord.y = this.boundaries.height - this.block_size;
        return;
    }
    
    // wrap around to top
    if (coord.y > this.boundaries.height - this.block_size) {
        coord.y = 0;
        return;
    }

    // wrap around to right
    if (coord.x < 0) {
        coord.x = this.boundaries.width - this.block_size;
        return;
    }
   
    // wrap around to left
    if (coord.x > this.boundaries.width - this.block_size) {
        coord.x = 0;
    }
};

/*
 * Method: drawRoundedRect
 * Draws a filled rectangle with current fill style.
 * Adapted from example in "Drawing shapes MDC" <https://developer.mozilla.org/en/Canvas_tutorial/Drawing_shapes>.
 *
 * Parameters:
 *    x      - Origin X coordinate.
 *    y      - Origin Y coordinate.
 *    width  - Width of rectangle.
 *    height - Height of rectangle.
 *    radius - Radius of rounded corners.
 */
Base.drawRoundedRect = function(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + radius);
    this.ctx.lineTo(x, y + height - radius);
    this.ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
    this.ctx.lineTo(x + width - radius, y + height);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    this.ctx.lineTo(x + width, y + radius);
    this.ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
    this.ctx.lineTo(x + radius, y);
    this.ctx.quadraticCurveTo(x, y, x, y + radius);
    this.ctx.fill();
};

/*
 * Callback: onAllocRecv
 * Receives 'alloc-recv' events for this object.
 *
 * Parameters:
 *     sender - The sender of the event; generally <Game>.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values.
 *            - - target    - object that originally triggered 'alloc' event.
 */
Base.onAllocRecv = function(sender, data) {
    if (data.target === this) { // our allocation was successful, let's save it
        this.body_blocks.push({ x: data.coord.x, y: data.coord.y });
    }
};

/*
 * Callback: onCollide
 * Receives 'collide' events for this object and may trigger an 'eat' event.
 *
 * Parameters:
 *
 *     sender - The sender of the event; generally <Game>.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values.
 *            - - initiator - object that caused event.
 *            - - receiver  - object that was affected by event.
 *
 */
Base.onCollide = function(sender, data) {
    if (data.receiver === this && data.initiator instanceof Slither.Objects.PlayerClass) { // snake ate us
        Slither.Core.EventManager.trigger('eat', this, {
            coord: { x: data.coord.x, y: data.coord.y }
        });
    }
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
Base.toString = function() { return 'Base'; },

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
Base.draw = function() {
    // only redraw if we're animated and haven't been drawn already
    if (!this.animated && this.drawn) return;

    // draw all body blocks
    for (var i = 0; i < this.body_blocks.length; i++) {
        this.drawBlock(this.body_blocks[i].x, this.body_blocks[i].y);
    }

    this.drawn = true;
};

/*
 * Method: clear
 * Erases the body of the object from the parent canvas and
 * deallocates the space.
 *
 * Parameters:
 *     unregister - Also unregister bound events for this object. 
 *                  Optional. Default: true.
 */
Base.clear = function(unregister) {
    for (var i = 0; i < this.body_blocks.length; i++) {
        this.eraseBlock(this.body_blocks[i].x, this.body_blocks[i].y);
    }
    this.body_blocks = [];
    this.drawn = false;
    
    // unregister event handlers
    if (unregister !== false) {
        Slither.Core.EventManager.unregister('collide', this.onCollide, this);
        Slither.Core.EventManager.unregister('alloc-recv', this.onAllocRecv, this);
    }
};

/*
 * Method: getHeading
 * Gets the heading (direction) of the object.
 *
 * Returns:
 *    <Slither.Headings> value.
 */
Base.getHeading = function() {
    return this.heading || Slither.Headings.Right;
};

/*
 * Method: setHeading
 * Sets the heading (direction) of the object.
 *
 * Parameters:
 *    heading - <Slither.Headings> value.
 */
Base.setHeading = function(heading) {
    if (!heading) {
        heading = Slither.Headings.Right;
    } else if (heading == 'random') {
        var keys = [];
        for (var key in Slither.Headings) keys.push(key);

        var key = null, last = this.getHeading();
        do {
            key = keys[Slither.genNumber(0, keys.length - 1)];
        } while (Slither.Headings[key] == last);

        heading = Slither.Headings[key];
    }

    for (var i in Slither.Headings) {
        if (heading == Slither.Headings[i]) {
            this.heading = heading;
            break;
        }
    }
};

/*
 * Method: getSpeed
 * Gets the object speed.
 *
 * Returns:
 *    Integer
 */
Base.getSpeed = function() {
    return this.speed || Slither.SpeedLevels.Min;
};

/*
 * Method: setSpeed
 * Sets the object speed.
 *
 * Parameters:
 *    speed - the new game speed timing.
 *            *Note:* Must be either 'random' or value within
 *            <SpeedLevels> range.
 */
Base.setSpeed = function(speed) {
    if (!speed || speed < Slither.SpeedLevels.Min) {
        speed = Slither.SpeedLevels.Min;
    } else if (speed > Slither.SpeedLevels.Max) {
        speed = Slither.SpeedLevels.Max;
    } else if (speed == 'random') {
        speed = Slither.genNumber(Slither.SpeedLevels.Min, Slither.SpeedLevels.Max);
    }

    this.speed = speed;
},

// expose to core object
Base = _Base;
Slither.Objects.Base = Base;

// load required import scripts
if (Slither.AUTOLOAD_SCRIPTS) {
    Slither.ready(false);
    Slither.loadScripts(Slither.AUTOLOAD_BASE_PATH, Slither.AUTOLOAD_SCRIPTS);
} else {
    Slither.ready(true);
}

// expose to the global object
window.Slither = Slither;

})(window, document);

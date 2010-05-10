/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.Wall
    Encapsulates a static wall object, which appears on specific levels of the game.
    Extends from <Objects.Base>.
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
 * Constructor: Wall
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - fill_style, block_size, type.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS> and <Slither.WallTypes>.
 */
var Wall = function(boundaries, context, options) {
    // override default options
    if (!options) options = {};
    if (!options.fill_style) {
        options.fill_style = '#63645b'; // darker gray
    }
    // we'll allocate our own blocks
    options.start_x = undefined;
    options.start_y = undefined;
    
    if (!options.type) {
        throw new Error(this + ' object requires "type" option');
    }

    // call super's constructor
    Wall.base.init.call(this, boundaries, context, options);

    // allocate body
    this.block_area = {
        width: this.boundaries.width - this.block_size,
        height: this.boundaries.height - this.block_size
    };
    this.setType(options.type);
    this.allocate();
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, Wall);

var _Wall = Wall;
Wall = Wall.prototype;


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Method: allocate
 * Allocates the blocks that compose the wall body on the parent canvas.
 */
Wall.allocate = function() {
    var types = Slither.WallTypes,
        cur_type = this.getType();

    switch (cur_type) {
        case types.FourCorner:
        case types.CrossHair:
        case types.CrossDoubleBar:
        case types.BrokenSquare:
        case types.CornerSofa:
        case types.TripleTee:
        case types.GoalSplit:
        case types.ClownInsanity:

            this.clear(false); // deallocate anything we already have

            for (var type_name in types) {
                if (types[type_name] == cur_type) {
                    this['alloc' + type_name](); // shell appropriate handler
                    break;
                }
            }
            break;
        default:
            return;
    }
};

/*
 * Method: allocFourCorner
 * Allocates a "FourCorner" wall pattern body.
 */
Wall.allocFourCorner = function() {
    /* - - - - - - - - -
       - # # - - - # # -
       - # - - - - - # -
       - - - - - - - - -
       - - - - - - - - -
       - - - - - - - - -
       - # - - - - - # -
       - # # - - - # # -
       - - - - - - - - - */

    var x_area = Math.round(this.block_area.width * 0.10), // 10% of width
        y_area = Math.round(this.block_area.height * 0.10), // 10% of height
        x_offset = Math.round(x_area / (2 * this.block_size)) * this.block_size, // center of x-area
        y_offset = Math.round(y_area / (2 * this.block_size)) * this.block_size; // center of y-area

    // starting info for corners
    var start_info = [
        { x: x_offset, y: y_offset, x_dir: 1, y_dir: 1 }, // top-left
        { x: this.block_area.width - x_offset, y: y_offset, x_dir: -1, y_dir: 1 }, // top-right
        { x: x_offset, y: this.block_area.height - y_offset, x_dir: 1, y_dir: -1 }, // bottom-left
        { x: this.block_area.width - x_offset, y: this.block_area.height - y_offset, x_dir: -1, y_dir: -1 } // bottom-right
    ];

    for (var i = 0; i < 4; i++) { // each corner
        var j, info = start_info[i];

        for (j = 0; j < 3; j++) { // draw horizontal bar
            this.allocBlock(info.x + info.x_dir * j * this.block_size, info.y);
        }

        for (j = 1; j < 3; j++) { // draw vertical cross bar
            this.allocBlock(info.x, info.y + info.y_dir * j * this.block_size);
        }
    }
};

/*
 * Method: allocCrossHair
 * Allocates a "CrossHair" wall pattern body.
 */
Wall.allocCrossHair = function() {
    /* - - - - # - - - -
       - - - - # - - - -
       - - - - - - - - -
       - - - - - - - - -
       # # - - - - - # #
       - - - - - - - - -
       - - - - - - - - -
       - - - - # - - - -
       - - - - # - - - - */

    var mid_x = Math.floor(this.block_area.width / (2 * this.block_size)) * this.block_size,
        mid_y = Math.floor(this.block_area.height / (2 * this.block_size)) * this.block_size,
        x_blocks = Math.round(this.block_area.width * 0.15 / this.block_size), // 15% of width in blocks
        y_blocks = Math.round(this.block_area.height * 0.15 / this.block_size); // 15% of height in blocks

    // starting info for crosshair bars
    var start_info = [
        { x: mid_x, y: 0, x_dir: 0, y_dir: 1 }, // top
        { x: this.block_area.width, y: mid_y, x_dir: -1, y_dir: 0 }, // right
        { x: mid_x, y: this.block_area.height, x_dir: 0, y_dir: -1 }, // bottom
        { x: 0, y: mid_y, x_dir: 1, y_dir: 0 } // left
    ];

    for (var i = 0; i < 4; i++) { // each bar
        var info = start_info[i], j;

        if (info.x_dir != 0) { // draw horizontal bars
            for (j = 0; j < x_blocks; j++) {
                this.allocBlock(info.x + info.x_dir * j * this.block_size, info.y);
            }
        } else { // draw vertical bars
            for (j = 0; j < y_blocks; j++) { 
                this.allocBlock(info.x, info.y + info.y_dir * j * this.block_size);
            }
        }
    }
};

/*
 * Method: allocCrossDoubleBar
 * Allocates a "CrossDoubleBar" wall pattern body.
 */
Wall.allocCrossDoubleBar = function() {
    /* - - - - - - - - -
       - # - - - - - # -
       - # - - - - - # -
       - # - - # - - # -
       - # - # # # - # -
       - # - - # - - # -
       - # - - - - - # -
       - # - - - - - # -
       - - - - - - - - - */

    var mid_x = Math.round(this.block_area.width / (2 * this.block_size)) * this.block_size,
        mid_y = Math.round(this.block_area.height / (2 * this.block_size)) * this.block_size,
        x_blocks = Math.round(this.block_area.width * 0.10 / this.block_size), // 10% of width in blocks
        y_blocks = Math.round(this.block_area.height * 0.10 / this.block_size); // 10% of height in blocks

    // starting info for segments
    var start_info = [
        { x: x_blocks * this.block_size, y: y_blocks * this.block_size }, // left bar
        { x: this.block_area.width - x_blocks * this.block_size, y: y_blocks * this.block_size }, // right bar
        { x: mid_x, y: mid_y }, // center cross
    ];

    // draw vertical bars
    var bar_block_max = Math.round((this.block_area.height - 2 * y_blocks * this.block_size) / this.block_size);
    for (var i = 0; i < 2; i++) { // each bar
        var info = start_info[i];

        for (var j = 0; j < bar_block_max; j++) { 
            this.allocBlock(info.x, info.y + j * this.block_size);
        }
    }

    // draw center cross
    var info = start_info[2];
    for (var i = 0; i < 2; i++) {
        if (i == 0) { // horizontal
            var start_x = info.x - 2 * this.block_size; // offset the start back

            for (var j = 0; j < 5; j++) {
                this.allocBlock(start_x + j * this.block_size, info.y);
            }
        } else { // vertical
            var start_y = info.y - 2 * this.block_size; // offset the start back

            for (var j = 0; j < 5; j++) {
                if (j != 2) { // skip middle point, already allocated above
                    this.allocBlock(info.x, start_y + j * this.block_size);
                }
            }
        }
    }
};

/*
 * Method: allocBrokenSquare
 * Allocates a "BrokenSquare" wall pattern body.
 */
Wall.allocBrokenSquare = function() {
    /* - - - - - - - - -
       - # # # # # # # -
       - - - - - - - # -
       - - - - - - - # -
       - - - - - - - - -
       - # - - - - - - -
       - # - - - - - - -
       - # # # # # # # -
       - - - - - - - - - */

    var x_start = Math.round(this.block_area.width * 0.15 / this.block_size) * this.block_size, // 15% of width
        y_start = Math.round(this.block_area.height * 0.10 / this.block_size) * this.block_size, // 10% of height
        y_blocks = Math.round(this.block_area.height * 0.20 / this.block_size); // 20% of height in blocks

    // starting info for horizontal bars
    var start_info = [
        { x: x_start, y: y_start }, // top
        { x: x_start, y: this.block_area.height - y_start } // bottom
    ];

    for (var i = 0; i < start_info.length; i++) {
        var info = start_info[i], j;

        // draw horizontals
        var block_max = Math.ceil((this.block_area.width - 2 * x_start) / this.block_size);
        for (j = 0; j < block_max; j++) {
            this.allocBlock(info.x + j * this.block_size, info.y);
        }

        // draw verticals
        var vert_x, y_mult;
        if (i == 0) {
            vert_x = info.x + (block_max - 1) * this.block_size;
            y_mult = 1;
        } else {
            vert_x = info.x;
            y_mult = -1;
        }

        for (j = 1; j < y_blocks; j++) { // skip first one.. already allocated by horizontals
            this.allocBlock(vert_x, info.y + y_mult * j * this.block_size);
        }
    }
};

/*
 * Method: allocCornerSofa
 * Allocates a "CornerSofa" wall pattern body.
 */
Wall.allocCornerSofa = function() {
    /* - - - - - - - - -
       - # # - - # - # -
       - # - - - # - # -
       - - - - - # # # -
       - - - - - - - - -
       - # # # - - - - -
       - # - # - - - # -
       - # - # - - # # -
       - - - - - - - - - */

    var x_area = Math.round(this.block_area.width * 0.10), // 10% of width
        y_area = Math.round(this.block_area.height * 0.10), // 10% of height
        x_offset = Math.round(x_area / (2 * this.block_size)) * this.block_size, // center of x-area
        y_offset = Math.round(y_area / (2 * this.block_size)) * this.block_size, // center of y-area
        x_blocks = Math.round(this.block_area.width * 0.35 / this.block_size), // 35% width in blocks
        y_blocks = Math.round(this.block_area.height * 0.35 / this.block_size), // 35% height in blocks
        y_block_off = y_offset + (y_blocks - 1) * this.block_size;

    // starting info for corners
    var start_info = [
        { x: x_offset, y: y_offset, x_dir: 1, y_dir: 1 }, // top-left corner
        { x: this.block_area.width - x_offset, y: this.block_area.height - y_offset, x_dir: -1, y_dir: -1 }, // bottom-right corner
        { x: this.block_area.width - x_offset, y: y_block_off, x_dir: -1, y_dir: -1 }, // top-right sofa
        { x: x_offset, y: this.block_area.height - y_block_off, x_dir: 1, y_dir: 1 } // bottom-left sofa
    ];

    for (var i = 0; i < 4; i++) {
        var j, k, info = start_info[i];

        if (i < 2) { // corners
            for (j = 0; j < 5; j++) { // draw horizontal bar
                this.allocBlock(info.x + info.x_dir * j * this.block_size, info.y);
            }

            for (j = 1; j < 5; j++) { // draw vertical cross bar
                this.allocBlock(info.x, info.y + info.y_dir * j * this.block_size);
            }
        } else { // sofas
            // draw horizontal bar
            for (j = 0; j < x_blocks; j++) {
                this.allocBlock(info.x + info.x_dir * j * this.block_size, info.y);
            }

            // draw verticals
            for (j = 0; j < 2; j++) {
                var x = info.x + info.x_dir * j * (x_blocks - 1) * this.block_size;

                for (k = 1; k < y_blocks; k++) {
                    this.allocBlock(x, info.y + info.y_dir * k * this.block_size);
                }
            }
        }
    }
};

/*
 * Method: allocTripleTee
 * Allocates a "TripleTee" wall pattern body.
 */
Wall.allocTripleTee = function() {
    /* - - - - # - - - -
       - - - - # - - - -
       - - - # # # - - -
       - - - - - - - - -
       - - - - - - - - -
       - - - - - - - - -
       - # # # - # # # -
       - - # - - - # - -
       - - # - - - # - - */

    var mid_x = Math.round(this.block_area.width / (2 * this.block_size)) * this.block_size,
        x_blocks = Math.round(this.block_area.width * 0.25 / this.block_size),
        y_blocks = Math.round(this.block_area.height * 0.30 / this.block_size); // 30% of height in blocks

    // starting info for segments
    var start_info = [
        { x: mid_x, y: 0 }, // top tee
        { x: x_blocks * this.block_size, y: this.block_area.height }, // bottom-left tee
        { x: this.block_area.width - x_blocks * this.block_size, y: this.block_area.height } // bottom-right tee
    ];

    for (var i = 0; i < 3; i++) { // each tee
        var j, info = start_info[i], y_dir = (i == 0) ? 1 : -1;

        // tee top
        var top_max = Math.ceil(y_blocks / 2);
        for (j = 1; j <= top_max; j++) {
            this.allocBlock(info.x - j * this.block_size, info.y);
            this.allocBlock(info.x + j * this.block_size, info.y);
        }

        // tee body
        for (j = 0; j < y_blocks; j++) { 
            this.allocBlock(info.x, info.y + y_dir * j * this.block_size);
        }
    }
};

/*
 * Method: allocGoalSplit
 * Allocates a "GoalSplit" wall pattern body.
 *
 * *TODO:* maybe in version 2
 */
Wall.allocGoalSplit = function() {
    /* - - - - - - - - -
       - - # - - - # - -
       - - # - - - # - -
       - - # # # # # - -
       - - - - - - - - -
       - - - - - - - - -
       - # # - - - # # -
       - # - - - - - # -
       - # - - - - - # - */
};

/*
 * Method: allocClownInsanity
 * Allocates a "ClownInsanity" wall pattern body.
 *
 * *TODO:* maybe in version 2
 */
Wall.allocClownInsanity = function() {
    /* - - - - - - - - -
       - # # # - # # # -
       - # - # - # - # -
       - - - - - - - - -
       - - - - - - - - -
       # # # - - - # # #
       # - # - # - # - #
       # - - - # - - - #
       - - - - # - - - - */
};

/*
 * Method: getType
 * Returns the type of wall object.
 *
 * Returns:
 *    <Slither.WallTypes> value or null
 */
Wall.getType = function() {
    return this.type || null;
};

/*
 * Method: setType
 * Sets the type of wall object.
 *
 * Parameters:
 *    type - <Slither.WallTypes> value.
 */
Wall.setType = function(type) {
    var types = Slither.WallTypes;

    for (var name in types) {
        if (types[name] === type) {
            this.type = type;
            return true;
        }
    }
    return false;
};

/*
 * Callback: onCollide
 * Receives 'collide' events with this object and may trigger a 'die' event.
 *
 * Parameters:
 *     sender - The sender of the event; generally <Game>.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values,
 *            - - initiator - object that caused event,
 *            - - receiver  - object that was affected by event.
 *
 */
Wall.onCollide = function(sender, data) {
    if (data.receiver === this) {
        if (data.initiator instanceof Slither.Objects.PlayerClass) { // collided into by player
            Slither.Core.EventManager.trigger('die', this, { coord: { x: data.coord.x, y: data.coord.y } });
        } else if (data.initiator === this) { // wall was created after other objects..
            throw new Error(this + ' object should be created before all other objects');
        }
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
Wall.toString = function() { return 'Wall'; };

// expose to core object
Wall = _Wall;
Slither.Objects.Wall = Wall;

})(Slither);

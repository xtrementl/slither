/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.Rat
    Encapsulates the movable rat object within the game. It contains
    the most nourishment for Slither. Extends from <Objects.Base>.
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
 * Constructor: Rat
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - fill_style, block_size, start_x, start_y, speed, heading.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS>.
 */
var Rat = function(boundaries, context, options) {
    // override default options
    if (!options) options = {};
    if (!options.fill_style) {
        options.fill_style = '#6ff042'; // bright lime green
    }
    if (options.speed) {
        options.speed = 'random';
    }
    options.animated = true; // animated

    if (typeof(options.heading) == 'undefined') options.heading = 'random';
    this.setHeading(options.heading);

    // call super's constructor
    Rat.base.init.call(this, boundaries, context, options);
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, Rat);

var _Rat = Rat;
Rat = Rat.prototype;
   

/******************************************************************
 * Group: Private                                                 *
 ******************************************************************/
 

/*
 * Method: getDrawInfo
 *    Returns axis and direction information useful for drawing rat
 *    body.
 *
 *    Returns:
 *       Hash with 'axis' and 'dir' keys or false.
 */
Rat.getDrawInfo = function() {
    var axis = null, dir = null;

    switch (this.getHeading()) {
        case Slither.Headings.Up:
            axis = 1;
            dir = -1;
            break;
        case Slither.Headings.Down:
            axis = 1;
            dir = 1;
            break;
        case Slither.Headings.Left:
            axis = 0;
            dir = -1;
            break;
        case Slither.Headings.Right:
            axis = 0;
            dir = 1;
            break;
        default:
            return false;
    }

    return { axis: axis, dir: dir };
};


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Callback: onCollide
 * Receives 'collide' events with this object and may trigger an 'eat' event.
 *
 * Parameters:
 *     sender - The sender of the event; generally <Game>.
 *     data   - Hash with information about the event.
 *
 *            - - coord     - Hash with 'x' & 'y' values.
 *            - - initiator - object that caused event.
 *            - - receiver  - object that was affected by event.
 *
 */
Rat.onCollide = function(sender, data) {
    if (data.receiver === this && data.initiator instanceof Slither.Objects.PlayerClass) { // eaten by player
        Slither.Core.EventManager.trigger('eat', this, {
            coord: { x: data.coord.x, y: data.coord.y }
        });
    } else if (data.initiator === this) { // collided into other object
        var Headings = Slither.Headings,
            heading = this.getHeading(),
            flip = [Slither.genNumber(0, 1), Slither.genNumber(0, 1)]; // reverse bounce or switch perpendicular

        switch (heading) {
            case Headings.Up:
                if (flip[0]) { // reverse bounce
                    heading = Headings.Down;
                } else { // choose perpendicular switch
                    heading = flip[1] ? Headings.Right : Headings.Left;
                }
                break;
            case Headings.Down:
                if (flip[0]) {
                    heading = Headings.Up;
                } else {
                    heading = flip[1] ? Headings.Right : Headings.Left;
                }
                break;
            case Headings.Left:
                if (flip[0]) {
                    heading = Headings.Right;
                } else {
                    heading = flip[1] ? Headings.Up : Headings.Down;
                }
                break;
            case Headings.Right:
                if (flip[0]) {
                    heading = Headings.Left;
                } else {
                    heading = flip[1] ? Headings.Up : Headings.Down;
                }
                break;
        }
        this.setHeading(heading);
    }
};

/*
 * Callback: onAllocRecv
 * Receives 'alloc-recv' events for this object.
 *
 * Parameters:
 *     sender - The sender of the event; generally <Game>.
 *     data   - Hash with information about the event.
 *
 *            - - coord  - Hash with 'x' & 'y' values.
 *            - - target - object that originally triggered 'alloc' event.
 */
Rat.onAllocRecv = function(sender, data) {
    if (data.target === this) { // our allocation was successful
        // every time we move, we want to clean up our old spot
        if (this.body_blocks.length == 1) {
            var old_block = this.body_blocks.shift();
            this.eraseBlock(old_block.x, old_block.y);
        }

        // add new block and draw it
        var new_block = { x: data.coord.x, y: data.coord.y };
        this.body_blocks.push(new_block);
        this.drawBlock(new_block.x, new_block.y);
    }
};
        

/*
 * Method: drawBlock
 * Draws block on the parent canvas.
 *
 * Parameters:
 *    x - X position.
 *    y - Y position.
 */
Rat.drawBlock = function(x, y) {
    var mid_offset = Math.ceil(this.block_size / 2 - 0.5);
    var info = this.getDrawInfo();
    if (!info) return;

    // draw bright lime green triangle pointed along heading
    this.ctx.fillStyle = this.fill_style;
    this.ctx.beginPath();

    // move to top triangle point
    var offset = [(info.dir < 0 ? 0 : this.block_size), mid_offset];
    var point = [x + offset[info.axis], y + offset[1 - info.axis]];
    this.ctx.moveTo(point[0], point[1]);

    point[info.axis] += (-1 * info.dir * this.block_size); // opposite point along central axis

    // draw connecting triangle legs
    point[1 - info.axis] -= mid_offset;
    this.ctx.lineTo(point[0], point[1]);
    point[1 - info.axis] += this.block_size;
    this.ctx.lineTo(point[0], point[1]);

    // close and fill
    this.ctx.lineTo(x + offset[info.axis], y + offset[1 - info.axis]);
    this.ctx.fill();
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
Rat.toString = function() { return 'Rat'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
Rat.draw = function() {
    if (!this.animated && this.drawn) return; // we've been frozen

    // switch headings after random number of frames
    if (!this.heading_switch_ctr) {
        this.heading_switch_max = Slither.genNumber(25, 100);
        this.heading_switch_ctr = 0;
    }
    if (++this.heading_switch_ctr >= this.heading_switch_max) {
        this.heading_switch_ctr = 0;
        this.setHeading('random');
    }

    var info = this.getDrawInfo();
    if (!info || this.body_blocks.length < 1) return;
    var last_block = this.body_blocks[this.body_blocks.length - 1];

    // adjust for replacement segment
    var new_block = { x: last_block.x, y: last_block.y };
    new_block[info.axis == 0 ? 'x' : 'y'] += info.dir * this.block_size;

    // wrap coordinates if they are to go out of bounds
    this.adjustBlockWrap(new_block);

    // allocate the replacement segment
    this.allocBlock(new_block.x, new_block.y);

    this.drawn = true;
};


/*
 * Method: setSpeed
 * Sets the object speed.
 *
 * Parameters:
 *    speed - the new game speed timing.
 *            *Note:* Must be either 'random' or value within
 *            <Slither.SpeedLevels> range.
 */
Rat.setSpeed = function(speed) {
    if (speed == 'random') {
        speed = Slither.genNumber(Slither.SpeedLevels.Min, Slither.SpeedLevels.Max - 2);
    }

    if (speed > Slither.SpeedLevels.Max - 2) {
        speed = Slither.SpeedLevels.Max - 2;
    }

    Rat.base.setSpeed(speed);
}

// expose to core object
Rat = _Rat;
Slither.Objects.Rat = Rat;

})(Slither);

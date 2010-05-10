/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.Standard
    Encapsulates the basic static objects, typically food, which appear in the game.
    All items extend from <Objects.Base>.
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
 * Class: Objects.Grain
 * Encapsulates physical grain object. Slither is awesome, he'll take what he can get
 * even if it's not always an animal.
 */

/*
 * Constructor: Grain
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - fill_style, block_size, start_x, start_y.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS>.
 */
var Grain = function(boundaries, context, options) {
    // just call super's constructor
    Grain.base.init.call(this, boundaries, context, options);
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, Grain);

var _Grain = Grain;
Grain = Grain.prototype;


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
Grain.toString = function() { return 'Grain'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
Grain.draw = function() {
    if (this.drawn || this.body_blocks.length < 1) return;

    var block = this.body_blocks[this.body_blocks.length - 1],
        mid_offset = Math.ceil(this.block_size / 2 - 0.5),
        x = block.x, y = block.y;

    // draw bright purple grain-like shape (two vertical curves)
    this.ctx.fillStyle = '#a24cc8'; // bright purple
    this.ctx.beginPath();
    this.ctx.moveTo(x + mid_offset, y);
    this.ctx.quadraticCurveTo(x + this.block_size, y + mid_offset, // right
                              x + mid_offset, y + this.block_size);
    this.ctx.quadraticCurveTo(x, y + mid_offset, // left
                              x + mid_offset, y);
    this.ctx.fill();

    this.drawn = true;
};

/*
 * Class: Objects.Mouse
 * Encapsulates physical mouse object.
 */

/*
 * Constructor: Mouse
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - fill_style, block_size, start_x, start_y.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS>.
 */
var Mouse = function(boundaries, context, options) {
    // override default options
    if (!options) options = {};
    if (!options.fill_style) {
        options.fill_style = '#fc3d32'; // warm/bright red
    }

    if (typeof(options.heading) == 'undefined') options.heading = 'random';
    this.setHeading(options.heading);

    // call super's constructor
    Mouse.base.init.call(this, boundaries, context, options);
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, Mouse);

var _Mouse = Mouse;
Mouse = Mouse.prototype;


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

Mouse.toString = function() { return 'Mouse'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
Mouse.draw = function() {
    if (this.drawn || this.body_blocks.length < 1) return;

    var block = this.body_blocks[this.body_blocks.length - 1],
        mid_offset = Math.ceil(this.block_size / 2 - 0.5), dir, axis,
        x = block.x, y = block.y;

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
    }

    // draw warm/bright red triangle pointed along heading
    this.ctx.fillStyle = this.fill_style;
    this.ctx.beginPath();

    // move to top triangle point
    var offset = [(dir < 0 ? 0 : this.block_size), mid_offset];
    var point = [x + offset[axis], y + offset[1 - axis]];
    this.ctx.moveTo(point[0], point[1]);

    point[axis] += (-1 * dir * this.block_size); // opposite point along central axis

    // draw connecting triangle legs
    point[1 - axis] -= mid_offset;
    this.ctx.lineTo(point[0], point[1]);
    point[1 - axis] += this.block_size;
    this.ctx.lineTo(point[0], point[1]);

    // close and fill
    this.ctx.lineTo(x + offset[axis], y + offset[1 - axis]);
    this.ctx.fill();

    this.drawn = true;
};

// expose to core object
Grain = _Grain;
Mouse = _Mouse;
Slither.Objects.Grain = Grain;
Slither.Objects.Mouse = Mouse;
Slither.Objects.Standard = {};

})(Slither);

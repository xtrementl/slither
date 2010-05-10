/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.PoisonItem
    Encapsulates a static poison object, which appears in the game.
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
 * Constructor: PoisonItem
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - fill_style, block_size, start_x, start_y, animated, type.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS> and <Slither.PoisonItemTypes>.
 */
var PoisonItem = function(boundaries, context, options) {
    // override default options
    if (!options) options = {};
    this.setType(options.type || 'random');

    // call super's constructor
    PoisonItem.base.init.call(this, boundaries, context, options);
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, PoisonItem);

var _PoisonItem = PoisonItem;
PoisonItem = PoisonItem.prototype;


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Callback: onCollide
 * Receives 'collide' events with this object and may trigger an 'poisoned' event.
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
PoisonItem.onCollide = function(sender, data) {
    if (data.receiver === this && data.initiator instanceof Slither.Objects.PlayerClass) { // eaten by player
        Slither.Core.EventManager.trigger('poisoned', this, {
            type: this.getType(),
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
PoisonItem.toString = function() { return 'PoisonItem'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
PoisonItem.draw = function() {
    // only redraw if we're animated and haven't been drawn already
    if (!this.animated && this.drawn || this.body_blocks.length == 0) return;
    var block = this.body_blocks[this.body_blocks.length - 1],
        mid_offset = Math.ceil(this.block_size / 2 - 0.5),
        x = block.x, y = block.y,
        types = Slither.PoisonItemTypes;

    switch (this.getType()) {
        case types.Deadly:
            // light green circle background
            this.ctx.beginPath();
            this.ctx.fillStyle = '#3878db'; // slate blue
            this.ctx.arc(x + mid_offset, y + mid_offset, mid_offset, 0, 2 * Math.PI, false);
            this.ctx.fill();

            // yellow/orange X
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#ffb300'; // yellow/orange
            this.ctx.lineWidth = 1.0;
            this.ctx.moveTo(x + 1, y + 1);
            this.ctx.lineTo(x + this.block_size - 1, y + this.block_size - 1);
            this.ctx.moveTo(x + this.block_size - 1, y + 1);
            this.ctx.lineTo(x + 1, y + this.block_size - 1);
            this.ctx.stroke();
            break;

        case types.Toxic:
            // square with diagonal red and orange
            
            this.ctx.fillStyle = '#f77105'; // orange
            this.ctx.fillRect(x + mid_offset, y, mid_offset, mid_offset); // top-right
            this.ctx.fillRect(x, y + mid_offset, mid_offset, mid_offset); // bottom-left
            this.ctx.fillStyle = '#b0232a'; // red
            this.ctx.fillRect(x, y, mid_offset, mid_offset); // top-left
            this.ctx.fillRect(x + mid_offset, y + mid_offset, mid_offset, mid_offset); // bottom-right

            // circle in middle
            this.ctx.fillStyle = '#f9df78'; // light yellow
            this.ctx.beginPath();
            this.ctx.arc(x + mid_offset, y + mid_offset, Math.ceil(this.block_size / 4), 0, 2 * Math.PI, false);
            this.ctx.fill();
            break;

        case types.Obnoxious:
            // pink rounded square background
            this.ctx.fillStyle = '#ff3484'; // pink
            this.drawRoundedRect(x, y, this.block_size, this.block_size, Math.ceil(this.block_size / 4));

            // bright yellow/green top-left/bottom-right squares
            this.ctx.fillStyle = '#e1e400'; // bright yellow/green
            this.ctx.fillRect(x, y, mid_offset, mid_offset); // top-left
            this.ctx.fillRect(x + mid_offset, y + mid_offset, mid_offset, mid_offset); // bottom-right
            break;
    }

    this.drawn = true;
};

/*
 * Method: getType
 * Returns the type of poison item object.
 *
 * Returns:
 *    <Slither.PoisonItemTypes> value or null
 */
PoisonItem.getType = function() {
    return this.type || null;
};

/*
 * Method: setType
 * Sets the type of poison item object.
 *
 * Parameters:
 *    type - <Slither.UpgradeItemTypes> value.
 */
PoisonItem.setType = function(type) {
    var types = [], item_types = Slither.PoisonItemTypes;
    for (var name in item_types) {
        types.push(item_types[name]);
    }

    if (type == 'random') {
        type = types[Slither.genNumber(0, types.length - 1)];
    }

    for (var i = 0; i < types.length; i++) {
        if (types[i] === type) {
            this.type = type;
            return true;
        }
    }
    return false;
};

// expose to core object
PoisonItem = _PoisonItem;
Slither.Objects.PoisonItem = PoisonItem;

})(Slither);

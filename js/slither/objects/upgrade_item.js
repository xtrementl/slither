/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.UpgradeItem
    Encapsulates a static upgrade object, which appears in the game.
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
 * Constructor: UpgradeItem
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - block_size, start_x, start_y, type.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS> and <Slither.UpgradeItemTypes>.
 */
var UpgradeItem = function(boundaries, context, options) {
    // override default options
    if (!options) options = {};
    this.setType(options.type || 'random');

    // call super's constructor
    UpgradeItem.base.init.call(this, boundaries, context, options);
};

// provide extensions from Base
Slither.extend(Slither.Objects.Base, UpgradeItem);

var _UpgradeItem = UpgradeItem;
UpgradeItem = UpgradeItem.prototype;


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


/*
 * Callback: onCollide
 * Receives 'collide' events with this object and may trigger an 'upgrade' event.
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
UpgradeItem.onCollide = function(sender, data) {
    if (data.receiver === this && data.initiator instanceof Slither.Objects.PlayerClass) { // eaten by player
        Slither.Core.EventManager.trigger('upgrade', this, {
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
UpgradeItem.toString = function() { return 'UpgradeItem'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
UpgradeItem.draw = function() {
    // only redraw if we're animated and haven't been drawn already
    if (!this.animated && this.drawn || this.body_blocks.length == 0) return;
    var block = this.body_blocks[this.body_blocks.length - 1],
        mid_offset = Math.ceil(this.block_size / 2 - 0.5),
        x = block.x, y = block.y,
        types = Slither.UpgradeItemTypes;

    switch (this.getType()) {
        /* Instant */

        case types.ExtraLife:
            // draw white square with red health cross
            
            // red background
            this.ctx.fillStyle = '#cc0000';
            this.ctx.fillRect(x, y, this.block_size, this.block_size);

            // red cross foreground (by four small overlapping squares)
            this.ctx.fillStyle = '#ddd';
            var offset = Math.ceil(this.block_size / 3);
            this.ctx.fillRect(x, y, offset, offset); // top-left
            this.ctx.fillRect(x + this.block_size - offset, y, offset, offset); // top-right
            this.ctx.fillRect(x, y + this.block_size - offset, offset, offset); // bottom-left
            this.ctx.fillRect(x + this.block_size - offset, y + this.block_size - offset, offset, offset); // bottom-right
            break;

        case types.TimeWarp:
            // draw lime green rings
            this.ctx.strokeStyle = '#d8d817'; // lime green
            var radius = this.block_size, center_x, center_y;

            // draw two arcs
            for (var i = 0; i < 2; i++) {
                radius = Math.floor(radius / 2);
                if (i == 0) {
                    center_x = x + radius;
                    center_y = y + radius;
                }

                this.ctx.beginPath();
                this.ctx.arc(center_x, center_y, radius - 0.5, 0, 2 * Math.PI, true);
                this.ctx.stroke(); // stroke the arc
            }
            break;

        /* Progressive */

        case types.ShieldsUp:
            // draw bright blue shield
            var offset = Math.ceil(this.block_size / 8);
            this.ctx.beginPath();
            this.ctx.fillStyle = '#00a1e1'; // bright blue
            
            // draw top curves
            this.ctx.moveTo(x, y);
            this.ctx.quadraticCurveTo(x + mid_offset / 2, y + 2 * offset, x + mid_offset, y); // left
            this.ctx.quadraticCurveTo(x + mid_offset + mid_offset / 2, y + 2 * offset, x + this.block_size, y); // right

            // draw side curves
            this.ctx.quadraticCurveTo(x + this.block_size, y + 4 * offset, x + mid_offset, y + this.block_size); // right
            this.ctx.quadraticCurveTo(x, y + 4 * offset, x, y); // left

            this.ctx.fill(); // fill in path
            break;

        case types.WallBreaker:
            // draw hammer/mallet
            var third = Math.ceil(this.block_size / 3);
            var offset = Math.ceil(this.block_size / 8);

            // handle portion
            this.ctx.fillStyle = '#dd8f4e'; // light brown
            this.ctx.fillRect(x + mid_offset - offset/2, y, offset, this.block_size);
            
            // head portion
            this.ctx.beginPath();
            this.ctx.fillStyle = '#aaa'; // light gray
            this.ctx.moveTo(x + offset, y);
            this.ctx.lineTo(x + this.block_size - offset, y);
            this.ctx.quadraticCurveTo(x + this.block_size, y + offset, x + this.block_size - offset, y + third);
            this.ctx.lineTo(x + offset, y + third);
            this.ctx.quadraticCurveTo(x, y + offset, x + offset, y);
            this.ctx.fill();
            break;

        case types.RatParalyzer:
            // draw frozen (light sky blue) star
            x += mid_offset;
            y += mid_offset;
            var size = mid_offset,
                cos_pi_10 = Math.cos(Math.PI / 10), cos_pi_5 = Math.cos(Math.PI / 5),
                sin_pi_10 = Math.sin(Math.PI / 10), sin_pi_5 = Math.sin(Math.PI / 5);

            this.ctx.beginPath();
            this.ctx.fillStyle = '#6cc2de'; // light sky blue
            this.ctx.moveTo(x, y - size);
            this.ctx.lineTo(x + size * sin_pi_5, y + size * cos_pi_5);
            this.ctx.lineTo(x - size * cos_pi_10, y - size * sin_pi_10);
            this.ctx.lineTo(x + size * cos_pi_10, y - size * sin_pi_10);
            this.ctx.lineTo(x - size * sin_pi_5, y + size * cos_pi_5);
            this.ctx.lineTo(x, y - size);
            this.ctx.fill();
            break;
    }

    this.drawn = true;
};

/*
 * Method: getType
 * Returns the type of upgrade item object.
 *
 * Returns:
 *    <Slither.UpgradeItemTypes> value or null
 */
UpgradeItem.getType = function() {
    return this.type || null;
};

/*
 * Method: setType
 * Sets the type of upgrade item object.
 *
 * Parameters:
 *    type - <Slither.UpgradeItemTypes> value.
 */
UpgradeItem.setType = function(type) {
    var types = [], item_types = Slither.UpgradeItemTypes;
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
UpgradeItem = _UpgradeItem;
Slither.Objects.UpgradeItem = UpgradeItem;

})(Slither);

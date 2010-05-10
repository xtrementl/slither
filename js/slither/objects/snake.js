/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Objects.Snake
    Encapsulates the main snake object, Slither, which the player
    controls throughout the duration of the game. Extends from <Objects.Base>.
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
 * Constructor: Snake
 * Establishes the class values.
 *
 * Parameters:
 *    boundaries - Hash that describes the parent canvas's dimensions.
 *             - - height, width
 *    context    - Parent 2D canvas context for which to draw the object.
 *    options    - Hash with initial options for the object.
 *             - - block_size, start_x, start_y, length, heading.
 *                 *See:* <Objects.Base.DEFAULT_OPTIONS> and <Slither.Headings>.
 */
var Snake = function(boundaries, context, options) {
    // setup heading queue and applied upgrade hash
    this.heading = null;
    this.heading_queue = [];
    this.applied_upgrades = {};

    this.head_fill_style = '#e8671b'; // dark orange
    this.body_fill_style = '#ffa500'; // light orange
    options.animated = true;          // animated

    // initial position is in top-left
    options.start_x = 0;
    options.start_y = 0;

    this.setHeading(options.heading || Slither.Headings.Right);
    this.setLength(options.length);

    // call super's constructor
    Snake.base.init.call(this, boundaries, context, options);
};

/*
 *  List: Constants
 *
 *  MIN_LENGTH - Minimum length the snake can be set to.
 *
 */
Snake.MIN_LENGTH = 2;

// provide extensions from Base
Slither.extend(Slither.Objects.Base, Snake);

var _Snake = Snake;
Snake = Snake.prototype;


/******************************************************************
 * Group: Private                                                 *
 ******************************************************************/
 

/*
 * Method: getHeadingInfo
 * Gets heading information needed for drawing.
 *
 * Parameters:
 *    heading - <Slither.Headings> value.
 *
 * Returns:
 *    Hash with 'dir' and 'offset' keys or false.
 */
Snake.getHeadingInfo = function(heading) {
    // adjust coordinates for next head segment
    var offset = this.block_size, dir;
    switch (heading) {
        case Slither.Headings.Up:
            dir = 'y';
            offset *= -1;
            break;
        case Slither.Headings.Down:
            dir = 'y';
            break;
        case Slither.Headings.Left:
            dir = 'x';
            offset *= -1;
            break;
        case Slither.Headings.Right:
            dir = 'x';
            break;
        default:
            return false; // invalid, bail
    }

    return { dir: dir, offset: offset };
};


/******************************************************************
 * Group: Protected                                               *
 ******************************************************************/


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
Snake.onCollide = function(sender, data) {
    if (data.initiator === this && data.initiator === data.receiver) { // crashed into itself
        Slither.Core.EventManager.trigger('die', this);
    }
};

/*
 * Callback: onAllocRecv
 * Receives 'alloc-recv' events for this object.
 *
 * Parameters:
 *      sender - The sender of the event; generally <Game>.
 *      data   - Hash with information about the event.
 *
 *             - - coord  - Hash with 'x' & 'y' values.
 *             - - target - object that originally triggered 'alloc' event.
 */
Snake.onAllocRecv = function(sender, data) {
    if (data.target === this) { // our allocation was successful
        // we're at the length of the snake, erase last (tail) block
        if (this.body_blocks.length == this.getLength()) {
            var tail_block = this.body_blocks.shift();
            this.eraseBlock(tail_block.x, tail_block.y);
        }
        
        // fill in body (overwrites previous head)
        if (this.body_blocks.length > 0) {
            var prev_head_block = this.body_blocks[this.body_blocks.length - 1];
            this.ctx.fillStyle = this.body_fill_style;
            this.ctx.fillRect(prev_head_block.x, prev_head_block.y, this.block_size, this.block_size);
        }
        
        // add new head block
        var head_block = { x: data.coord.x, y: data.coord.y };
        this.body_blocks.push(head_block);
        
        // draw snake head
        if (this.drawn) {
            this.ctx.fillStyle = this.head_fill_style;
            this.ctx.fillRect(head_block.x, head_block.y, this.block_size, this.block_size);
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
Snake.toString = function() { return 'Snake'; };

/*
 * Method: draw
 * Draws the body of the object on the parent canvas.
 */
Snake.draw = function() {
    var heading = this.getHeading();
    var info = this.getHeadingInfo(heading);

    if (!info || this.body_blocks.length < 1) return;
    var block = this.body_blocks[this.body_blocks.length - 1],
        head_block = { x: block.x, y: block.y };

    // adjust for next head segment
    head_block[info.dir] += info.offset;

    // wrap coordinates if they are to go out of bounds
    this.adjustBlockWrap(head_block); 

    // allocate next head segment
    this.allocBlock(head_block.x, head_block.y);

    this.drawn = true;
};

/*
 * Method: getHeading
 * Gets the heading (direction) of the object.
 *
 * Returns:
 *    <Slither.Headings> value.
 */
Snake.getHeading = function() {
    if (this.heading_queue.length > 0) {
        this.heading = this.heading_queue.shift();
    }
    return this.heading;
};

/*
 * Method: setHeading
 * Sets the heading (direction) of the object.
 *
 * Parameters:
 *    heading - <Slither.Headings> value.
 */
Snake.setHeading = function(heading) {
    if (!heading) return;

    // duplicate; already set previously
    if (this.heading_queue &&
        heading === this.heading_queue[this.heading_queue.length-1]) {
        return;
    }

    var allow = false;
    switch (heading) {
        case Slither.Headings.Up:
            allow = this.heading != Slither.Headings.Down;
            break;
        case Slither.Headings.Down:
            allow = this.heading != Slither.Headings.Up;
            break;
        case Slither.Headings.Left:
            allow = this.heading != Slither.Headings.Right;
            break;
        case Slither.Headings.Right:
            allow = this.heading != Slither.Headings.Left;
            break;
    }

    if (allow) this.heading_queue.push(heading);
};

/*
 * Method: getLength
 * Gets the length of the object.
 *
 * Returns:
 *    Integer
 */
Snake.getLength = function() {
    return this.length || Snake.MIN_LENGTH;
};

/*
 * Method: setLength
 * Sets the length of the object.
 *
 * Parameters:
 *    length - Integer value. Must be >= <MIN_LENGTH>
 */
Snake.setLength = function(length) {
    if (!length || length < Snake.MIN_LENGTH) {
        length = Snake.MIN_LENGTH;
    }

    if (!this.length) {
        this.length = length;
        return;
    }

    // handle when reducing length by more than one block
    var diff = this.length - length;
    if (diff > 1) {
        for (var i = 0; i < diff; i++) {
            var tail_block = this.body_blocks.shift();
            this.eraseBlock(tail_block.x, tail_block.y);
        }
    }
    this.length = length;
};

/*
 * Method: addUpgrade
 * Adds a snake-specific progressive upgrade to this snake object.
 *
 * Parameters:
 *    upgrade_type - <Slither.UpgradeItemTypes> value.
 *
 * Returns:
 *    Boolean
 */
Snake.addUpgrade = function(upgrade_type) {
    if (this.hasUpgrade(upgrade_type)) return false;
    this.applied_upgrades[upgrade_type] = true;
    return true;
};

/*
 * Method: hasUpgrade
 * Checks if a snake-specific progressive upgrade has been added to this snake object.
 *
 * Parameters:
 *    upgrade_type - <Slither.UpgradeItemTypes> value.
 *
 * Returns:
 *    Boolean
 */
Snake.hasUpgrade = function(upgrade_type) {
    return (upgrade_type in this.applied_upgrades);
};

/*
 * Method: getUpgrades
 * Returns a list of snake-specific progressive upgrade that have been added to this snake object.
 *
 * Returns:
 *    List of <Slither.UpgradeItemTypes> values.
 */
Snake.getUpgrades = function() {
    var list = [];
    for (var type in this.applied_upgrades) list.push(type);

    return list;
};

/*
 * Method: removeUpgrade
 * Removes an added snake-specific progressive upgrade from this snake object.
 *
 * Parameters:
 *    upgrade_type - <Slither.UpgradeItemTypes> value.
 *                   *NOTE:* value can be ellided or null to remove all upgrades.
 *
 * Returns:
 *    Boolean
 */
Snake.removeUpgrade = function(upgrade_type) {
    if (!this.hasUpgrade(upgrade_type)) return false;
    delete this.applied_upgrades[upgrade_type];
    return true;
};

// expose to core object
Snake = _Snake;
Slither.Objects.Snake = Snake;

})(Slither);

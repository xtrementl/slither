/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Core.LevelManager
    Provides a generalized level management system that handles
    tracking levels and their particular effect on the game.
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

Slither.Core.LevelManager = {
    levels: [],
    level: -1, /* index for current level achievement */


    /******************************************************************
     * Group: Private                                                 *
     ******************************************************************/


    /*
     * Method: searchForLevel
     * Retrieves the list index for the provided level object.
     *
     * Parameters:
     *    callback - Level callback
     *
     * Returns:
     *    Integer. Index if found, -1 otherwise.
     */
    searchForLevel: function(callback) {
        if (!this.levels || typeof(callback) != 'function') return -1;

        for (var i = 0; i < this.levels.length; i++) {
            if (this.levels[i] === callback) {
                return i;
            }
        }
        return -1;
    },


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
    toString: function() { return 'LevelManager'; },

    /*
     * Method: add
     * Adds level to internal list.
     * *Note:* Will return *false* if callback is already added.
     *
     * Parameters:
     *    callback - Level callback to add to list.
     *            : function callback(restart) {
     *            :    // restart set to true if level is being restarted
     *            : }
     *    scope    - Object to scope 'this' to when callback is called
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    add: function(callback, scope) {
        if (typeof(callback) != 'function') return false;

        if (this.searchForLevel(callback) == -1) { // not already set
            var activation_info = { callback: callback };
            if (scope) activation_info.scope = scope;

            this.levels.push(activation_info);
            return true;
        }
        return false;
    },

    /*
     * Method: remove
     * Removes an existing level from the internal list.
     *
     * Parameters:
     *    callback - Level callback to remove
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    remove: function(callback) {
        if (typeof(callback) != 'function') return false;
        var index = this.searchForLevel(callback);

        if (index != -1) { // is set
            this.levels.splice(index, 1);

            // level indeces have shifted, let's adjust to compensate
            if (index <= this.level) {
                this.level--;
            }
            return true;
        }

        return false;
    },

    /*
     * Method: removeAll
     * Removes all levels from the list.
     */
    removeAll: function() {
        this.levels = [];
        this.level = -1;
    },

    /*
     * Method: startOver
     * Restarts the level management back at level 1, and runs it again.
     */
    startOver: function() {
        this.level = -1;
        this.advance();
    },

    /*
     * Method: advance
     * Advances to the next defined level achievement and executes its instructions.
     *
     * Parameters:
     *    dir - Direction
     *          (-1 = restart current level; otherwise, advance to next level).
     */
    advance: function(dir) {
        var restart = (dir === -1);
        if (!restart) this.level++;

        if (this.level > this.levels.length-1) {
            this.level = this.levels.length-1;
            return;
        }

        // look up activation info and execute callback
        var activation_info = this.levels[this.level];
        if (typeof(activation_info.callback) == 'function') {
            if (activation_info.scope) {
                activation_info.callback.call(activation_info.scope, restart);
            } else {
                activation_info.callback(restart);
            }
        }
    },

    /*
     * Method: getCount
     * Returns a count of the number of levels available.
     *
     * Returns:
     *    Integer.
     */
    getCount: function() {
        return this.levels.length;
    },

    /*
     * Method: getCount
     * Returns the current level number.
     *
     * Returns:
     *    Integer.
     */
    getLevelNum: function() {
        return this.level+1;
    }
};

})(Slither);

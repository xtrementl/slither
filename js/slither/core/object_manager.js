/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Core.ObjectManager
    Provides a generalized object management system to
    handle manipulating objects within the game.
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

Slither.Core.ObjectManager = {
    objects: [],
    types: {},


    /******************************************************************
     * Group: Private                                                 *
     ******************************************************************/


    /*
     * Method: searchForCallback
     * Retrieves the list index for the provided object.
     *
     * Parameters:
     *    obj - The object to match.
     *
     * Returns:
     *    Integer. Index if found, -1 otherwise.
     */
    searchForObject: function(obj) {
        if (!obj) return -1;

        for (var i = 0; i < this.objects.length; i++) {
            if (this.objects[i] === obj) return i;
        }
        return -1;
    },

    /*
     * Method: handleFrames
     * Transparently handles the smoothing of any fluctuations between game frame rate
     * and the frame rate requirements necessary for object speed settings.
     *
     * Parameters:
     *    obj - Game object to handle.
     */
    handleFrames: function(obj) {
        if (typeof(obj.draw) != 'function' || typeof(obj.getSpeed) != 'function') return;

        // calculate how many frames we need to drop to meet our target frame rate
        // (relative to current speed and game frame rate)
        // NOTE: negative values are drops; we ignore gains (positive)
        var frame_diff = Math.round(Slither.FRAME_RATE / Slither.SpeedLevels.Max) * obj.getSpeed() - Slither.FRAME_RATE;

        if (Math.abs(frame_diff) >= Slither.FRAME_RATE) {
            throw new Error('Slither expects a higher frame rate; try 30fps or better.');
        }

        // translate into the # of frames per call
        var frame_count = Math.round(Slither.FRAME_RATE / (Slither.FRAME_RATE - Math.abs(frame_diff)));

        if (frame_diff < 0) { // drop frames
            // use counter to determine when to stop dropping frames
            if (!obj.frame_skip_ctr) obj.frame_skip_ctr = 0;
            if (++obj.frame_skip_ctr <= frame_count) return; // drop them until count is reached
            obj.frame_skip_ctr = 0;
        }

        obj.draw(); // call frame callback
    },


    /*
     * Callback: draw
     * Called on an interval to animate objects in the internal object list.
     */
    draw: function() {
        for (var i = 0; i < this.objects.length; i++) {
            this.handleFrames(this.objects[i]);
        }
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
    toString: function() { return 'ObjectManager'; },

    /*
     * Method: add
     * Adds an object to the internal object list.
     * *Note:* Will return *false* if object was already added.
     *
     * Parameters:
     *    obj - Object to add to list.
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    add: function(obj) {
        if (!obj) return false;
        if (this.searchForObject(obj) == -1) { // not already set
            this.objects.push(obj);

            // track count of object type
            var type = typeof(obj);
            if (!(type in this.types)) this.types[type] = 1;
            else this.types[type]++;
            return true;
        }
        return false;
    },

    /*
     * Method: remove
     * Removes an object from the internal object list.
     *
     * Parameters:
     *    obj - Object to remove from list.
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    remove: function(obj) {
        var index = this.searchForObject(obj);
        if (index == -1) return false;

        // clear the object if it has callback and remove from list
        if (typeof(obj.clear) == 'function') obj.clear();
        this.objects.splice(index, 1);

        // track count for types
        var type = typeof(obj);
        if (type in this.types) {
            this.types[type]--;

            if (this.types[type] == 0) {
                delete this.types[type];
            }
        }

        return true;
    },

    /*
     * Method: removeAll
     * Removes all objects from the internal object list.
     */
    removeAll: function() {
        this.stop();

        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (typeof(obj.clear) == 'function') { // has callback
                obj.clear(); 
            }
        }
        this.objects = [];
        this.types = {};
    },

    /*
     * Method: getList
     * Builds a list of objects from the internal list that match the provided type.
     *
     * Parameters:
     *    type - Object that represents the class of object, or its string equivalent.
     *           *Note:* Can be elided or *null* to retrieve all objects from internal list.
     *
     * Returns:
     *    List of objects.
     */
    getList: function(type) {
        var obj_list = [];

        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (!type || obj instanceof type || typeof(obj) == type) {
                obj_list.push(obj);
            }
        }
        return obj_list;
    },

    /*
     * Method: getCount
     * Returns a count of the number of objects in the internal list that match the provided type.
     *
     * Parameters:
     *    type - Object that represents the class of object, or its string equivalent.
     *           *Note:* Can be elided or *null* to match all objects from internal list.
     *
     * Returns:
     *    Integer.
     */
    getCount: function(type) {
        if (!type) return this.objects.length;

        var count = 0, type_str = (typeof(type) == 'string') ? type : typeof(type);
        if (type in this.types) return this.types[type];

        // fallback on counting all objects, if necessary
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];

            if (obj instanceof type || typeof(obj) == type) {
                count++;
            }
        }
        return count;
    },

    /*
     * Method: start
     * Starts the internal object animation timer.
     * *Note:* All objects are animated at the same rate according to provided frame rate.
     *
     * Parameters:
     *    frame_rate - Target frame rate for rendering objects (frames per second).
     */
    start: function(frame_rate) {
        if (!this.started && frame_rate >= 0) {
            var _this = this, last_time = (new Date()).getTime(),
                target_ms = Math.ceil(1000 / frame_rate),

                animate = function() {
                    if (!_this.started) return;
                    var now = (new Date()).getTime();
                    var diff = now - last_time;

                    // draw objects
                    _this.draw();

                    // determine the next timer delay; if there
                    // was some delay, compensate for it
                    var delay = target_ms;
                    if (diff > delay) {
                        delay = Math.max(2 * delay - diff, 1);
                    }

                    // setup the next timer to fire
                    last_time = now;
                    if (_this.timer_id) clearTimeout(_this.timer_id);
                    _this.timer_id = setTimeout(animate, delay);
                };

            // start animation
            this.started = true;
            animate();
        }
    },

    /*
     * Method: stop
     * Stops the internal object animation timer.
     */
    stop: function() {
        if (this.timer_id) {
            clearTimeout(this.timer_id);
            this.timer_id = null;
        }
        this.started = false;
    }
};

})(Slither);

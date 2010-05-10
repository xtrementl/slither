/*
    ----------------------------------------------------------------------------------------
    Package: Slither.Core.EventManager
    Provides a generalized event delegation management system to
    handle object communications within the game.
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

Slither.Core.EventManager = {
    events: {},


    /******************************************************************
     * Group: Private                                                 *
     ******************************************************************/


    /*
     * Method: searchForCallback
     * Retrieves the list index for the provided callback and owner.
     *
     * Parameters:
     *    handlers - List of callback handler objects.
     *    callback - Callback function to check against list.
     *    owner    - Owner object to check against list with 'callback'.
     *
     * Returns:
     *    Integer. Index if found, -1 otherwise.
     */
    searchForCallback: function(handlers, callback, owner) {
        if (!handlers || typeof(callback) != 'function') return -1;

        for (var i = 0; i < handlers.length; i++) {
            if (owner) {
                if (handlers[i].callback === callback &&
                    handlers[i].owner === owner) {
                    return i;
                }
            } else if (handlers[i].callback === callback) {
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
    toString: function() { return 'EventManager'; },

    /*
     * Method: register
     * Initiates a callback method to receive event delegations.
     * *Note:* Will return *false* if callback and owner are already registered.
     *
     * Parameters:
     *    event_type - String identifier for the event.
     *    callback   - Callback function object.
     *    owner      - Owner object to use in scoping the '*this*' operator
     *                 when executing callback function.
     *                 Default: '*window*' global object
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    register: function(event_type, callback, owner) {
        if (typeof(callback) != 'function') return false;
        if (!this.events[event_type]) {
            this.events[event_type] = [];
        }
        var handlers = this.events[event_type];

        if (this.searchForCallback(handlers, callback, owner) == -1) { // not already set
            var handler = { callback: callback };
            if (owner) handler.owner = owner;

            handlers.push(handler);
            return true;
        }
        return false;
    },

    /*
     * Method: unregister
     * Declines a callback method from receiving event delegations.
     *
     * Parameters:
     *    event_type - String identifier for the event.
     *    callback   - Callback function object.
     *    owner      - Owner object that was used in scoping the '*this*' operator
     *                 when executing callback function.
     *                 Default: '*window*' global object
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    unregister: function(event_type, callback, owner) {
        if (typeof(callback) != 'function') return false;
        if (this.events[event_type]) {
            var handlers = this.events[event_type];

            var index = this.searchForCallback(handlers, callback, owner);
            if (index != -1) { // is set
                handlers.splice(index, 1);

                if (handlers.length == 0) {
                    this.clear(event_type);
                }
                return true;
            }
        }

        return false;
    },

    /*
     * Method: trigger
     * Spawns an event delegation to all callback functions that are registered to receive it.
     *
     * *NOTE:*
     *    - If a callback returns false then it will cease the event chain from that point.
     *    - Also, if 'disable()' is active, then this function does nothing.
     *
     * Parameters:
     *    event_type  - String identifier for the event.
     *    sender      - Object that is representing the event sender. Optional.
     *    data        - Object that contains any arbitrary data associated with the event.
     *                  Optional.
     *    target_only - Target object for which to send event notification, if registered.
     *                  Optional.
     */
    trigger: function(event_type, sender, data, target_only) {
        if (this.events[event_type]) {
            for (var i = 0; i < this.events[event_type].length; i++) {
                var handler = this.events[event_type][i];
                if (target_only && target_only !== handler.owner) continue;

                if (typeof(handler.callback) == 'function') {
                    var res;

                    if (handler.owner) {
                        res = handler.callback.call(handler.owner, sender, data);
                    } else {
                        res = handler.callback(sender, data);
                    }

                    // callback wants to short-circuit the event chain
                    if (res === false) break;
                }
            }
        }
    },

    /*
     * Method: clear
     * Unregisters all callbacks for the specified event type.
     *
     * Parameters:
     *    event_type - String identifier for the event.
     *
     * Returns:
     *    *true* if successful, *false* otherwise.
     */
    clear: function(event_type) {
        if (this.events[event_type]) {
            delete this.events[event_type];
            return true;
        }
        return false;
    },

    /*
     * Method: clearAll
     * Unregisters all callbacks.
     */
    clearAll: function() {
        this.events = {};
    }
};

})(Slither);

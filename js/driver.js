/*
    ----------------------------------------------------------------------------------------
    Contains the driver code that creates the Slither.Game object and
    manages user interaction and UI effects for the game.
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

(function(document, window, $) {

// containers that need sprite background
var SPRITE_CONTAINERS = [ '#game-area', '#game-msg', '#game-msg a', '#help div.controls div.arrow div.icon' ];

// container instances
var gamearea, gamemsg_cont, gamemsg, help_cont,
    hud_cont, score_cont, lives_cont, speed_cont,
    level_cont, upgrade_cont;

// others
var game, hotkeys = false, upgrades = {};

// shows a message to continue with enter (e.g. die, level advancement)
function continueMsg(add_class, str, action, extra, fade) {
    if (!extra) extra = 'to resume.';
    game.pause();

    // setup hotkey handler to receive enter keypress for this message
    hotkeys = false;
    var f = function(event) {
        var key_code = event ? event.keyCode : null;

        if (key_code == 13) { // enter
            hotkeys = true;
            gamemsg_cont.hide();

            if (typeof(action) == 'function') action();
            $(document).unbind('keydown', f);
            return false;
        }
    };
    $(document).keydown(f);

    var del_classes = gamemsg_cont.attr('className').replace(/sprites/,''); // classes to remove from container
    gamemsg_cont.hide().removeClass(del_classes);
    if (add_class) gamemsg_cont.addClass(add_class);

    $('div.submsg', gamemsg_cont).text('Press <Enter> ' + extra);
    gamemsg.html(str);

    if (fade !== false) {
        gamemsg_cont.fadeIn(400);
    } else {
        gamemsg_cont.show();
    }
}

// initializes heads-up display values
function init_hud() {
    score_cont.text('0');
    lives_cont.text('3');
    level_cont.text('1');
    upgrade_cont.text('-');
    speed_cont.text(game ? game.getSpeed() : '-');
}

// displays text in upgrade container
function show_upgrade(type, show) {
    if (!upgrades) upgrades = {};
    var types = Slither.UpgradeItemTypes;
    var map = {};
    map[types.WallBreaker] = 'WB';
    map[types.ShieldsUp] = 'SU';
    map[types.RatParalyzer] = 'RP';

    if (type in map) {
        upgrades[type] = show;

        // build new list
        var cur_list = [];
        for (var _type in upgrades) {
            if (upgrades[_type]) cur_list.push(map[_type]);
        }
        if (cur_list.length == 0) {
            upgrades = {};
            cur_list.push('-');
        }

        // update container
        upgrade_cont.text(cur_list.join(', '));
    }
}

// initializes everything else for the game
function init_game() {
    Slither.ready(function() { // fire when Slither's components have loaded
        game = new Slither.Game(gamearea.get(0), {
            lives: 3,
            speed: 3,

            onTimeWarp: function() {
                level_cont.text('1');
            },

            onLevelAdvance: function(level) {
                var defAction = this.defAction;
                continueMsg('new-level', 'New Level Reached', function() {
                    level_cont.text(level); // set next level
                    defAction();
                });

                return false; // prevent default action
            },

            onDie: function(lives) {
                lives_cont.text(lives);
                continueMsg('die', 'Slither Is Dead!', this.defAction);
                return false; // prevent default action
            },

            onScore: function(score) {
                score_cont.text(score);
            },

            onUpgrade: function(type, lives, score) {
                // update upgrade display
                show_upgrade(type, true);

                // update lives and score
                lives_cont.text(lives);
                score_cont.text(score);
            },

            onLoseUpgrade: function(type) {
                show_upgrade(type, false); // update upgrade display
            },

            onPoisoned: function(type, lives, score) {
                lives_cont.text(lives);
                score_cont.text(score);
            },

            onGameOver: function(score, won) {
                if (!won) lives_cont.text('0');
                help_cont.addClass('disabled');
                hotkeys = false;

                var restart_game = function() {
                    help_cont.removeClass('disabled');
                    game.restart();
                    init_hud();
                };

                var word = won ? 'Win' : 'Lose';
                continueMsg(word.toLowerCase(), 'Game Over, You ' + word + '!', restart_game, 'to play again.');
            }
        });
    
        // setup hotkeys for escape (pausing of game)
        $(document).keydown(function(event) {
            var key_code = event.keyCode;

            if (hotkeys && key_code == 27) { // escape
                game.pause();
                continueMsg('pause', 'Game Paused', function() {
                    gamemsg_cont.hide();
                    game.start();
                }, null, false);
            }
        });

        // build speed selector message
        gamemsg_cont.fadeOut(200, function() {
            // switch to speed message
            gamemsg_cont.removeClass('loading').addClass('speed');
            gamemsg.empty().html('Choose A Speed..click one to start game');

            // append speed buttons
            var speed_btn_cont = $('<div class="speed-btns" />').appendTo(gamemsg);
            for (var i = 0; i < 5; i++) {
                $('<a class="key' + (i+1) + '" href="#">Key ' + (i+1) + '</a>').appendTo(speed_btn_cont);
            }
            var speed_btn_click = function() {
                // get selected speed
                var speed = parseInt(this.className.replace(/[^\d]+/g, ''), 10);
                if (isNaN(speed)) speed = Slither.Game.DEFAULT_OPTIONS.speed;
                help_cont.slideUp(350, function() {
                    $(this).css({ display: ''}).addClass('hidden disabled');
                });

                // expand main container and show heads-up display
                var orig_width = gamemsg_cont.width();

                gamemsg_cont.animate({ width: 0 }, 350, 'linear', function() {
                    gamemsg_cont.hide().removeClass('speed').width(orig_width);

                    // shift container over to make room for heads-up display
                    var hud_width = hud_cont.width();
                    $('#content').animate({
                        width: '+=' + hud_width + 'px',
                        marginLeft: '-=' + (hud_width/2) + 'px'
                    }, {
                        duration: 500,
                        easing: 'linear',
                        complete: function() {
                            // show heads-up display
                            hud_cont.fadeIn(400, function() {
                                help_cont.removeClass('disabled');
                            });

                            // set game speed and start it
                            game.setSpeed(speed);
                            speed_cont.text(game.getSpeed());
                            game.start();
                            hotkeys = true;
                        }
                    });
                });
                return false;
            };
            $('a', speed_btn_cont).click(speed_btn_click);

            // show message
            gamemsg_cont.fadeIn(400);
            
            // show help container..
            help_cont.slideDown(600).removeClass();
        }); // end gamemsg_cont.fadeOut()
    }); // end Slither.ready()
} // end init_game()

$(window).load(function() {
    // start loading sprite graphic
    $(SPRITE_CONTAINERS.join(',')).addClass('sprites');

    // show loading, fade in and wait for a bit before initializing Slither.Game instance
    gamemsg.html('Loading Game...Please wait');
    setTimeout(function() {
        gamemsg_cont.hide().removeClass('invisible').fadeIn(200, function() {
            setTimeout(init_game, 1500); // wait for a bit to load...
        });
    }, 500); // wait for a bit to load
});

$(document).ready(function() {
    // get access to elements
    gamearea = $('#game-area canvas.palette');
    gamemsg_cont = $('#game-msg');
    gamemsg = $('div.msg', gamemsg_cont);
    help_cont = $('#help');
    hud_cont = $('#hud');
    score_cont = $('#score', hud_cont);
    lives_cont = $('#lives', hud_cont);
    speed_cont = $('#speed', hud_cont);
    level_cont = $('#level', hud_cont);
    upgrade_cont = $('#upgrades', hud_cont);
    init_hud();
});

})(document, window, jQuery);

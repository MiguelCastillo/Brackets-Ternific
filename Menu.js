/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports /*, module*/) {
    "use strict";

    var CommandManager  = brackets.getModule("command/CommandManager");
    var EventDispatcher = brackets.getModule("utils/EventDispatcher");
    var Commands        = brackets.getModule("command/Commands");
    var Menus           = brackets.getModule("command/Menus");

    function menuSelected() {
        exports.events.trigger("ternific");
    }

    function registerMenu() {
        var MANAGER_COMMAND_ID = "brackets-ternific.manager";
        CommandManager.register("Ternific\u2026", MANAGER_COMMAND_ID, menuSelected);
        Menus.getMenu(Menus.AppMenuBar.FILE_MENU).addMenuItem(MANAGER_COMMAND_ID, "", Menus.AFTER, Commands.FILE_PROJECT_SETTINGS);
    }

    exports.events = {};
    exports.init   = registerMenu;

    EventDispatcher.makeEventDispatcher(exports.events);
});

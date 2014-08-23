define(function(require, exports, module) {
    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands       = brackets.getModule("command/Commands"),
        Menus          = brackets.getModule("command/Menus");

    function menuSelected() {
        $(exports).triggerHandler("manager.ternific");
    }

    function registerMenu() {
        var MANAGER_COMMAND_ID = "brackets-ternific.manager";
        CommandManager.register("Ternific\u2026", MANAGER_COMMAND_ID, menuSelected);
        Menus.getMenu(Menus.AppMenuBar.FILE_MENU).addMenuItem(MANAGER_COMMAND_ID, "", Menus.AFTER, Commands.FILE_PROJECT_SETTINGS);
    }

    exports.init = registerMenu;
});

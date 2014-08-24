define(function(require, exports, module) {

    var PanelManager   = brackets.getModule("view/PanelManager"),
        Resizer        = brackets.getModule("utils/Resizer"),
        menu           = require("Menu"),
        hintProvider   = require("HintProvider");

    var $container;

    var tmpls = {
        $ternific: $(require("text!views/tmpls/ternific.html")),
        hintdetails: require("text!views/tmpls/hintdetails.html")
    };


    $(menu).on("manager.ternific", function(evt) {
        toggle(true);
    });


    $(hintProvider).on("hints", function(evt, hints, hintsHtml) {
        tmpls.$ternific.find(".hintList").html($("<ul>").append($(hintsHtml)));
    });


    $(hintProvider).on("highlight", function(evt, highlight) {
        tmpls.$ternific.find(".hintDetails").html($(Mustache.render(tmpls.hintdetails, highlight)));
    });


    function toggle(open) {
        if (open === undefined) {
            open = !$container.hasClass("open");
        }

        open ?
            ($container.addClass("open") && Resizer.show($container)) :
            ($container.removeClass("open") && Resizer.hide($container));
    }

    function init() {
        $container = $("<div id='ternific' class='bottom-panel vert-resizable top-resizer'>").append(tmpls.$ternific);
        $container.on("click", ".close", function (evt) {toggle(false);});
        PanelManager.createBottomPanel("tomcat.manager", $container, 100);
    }

    exports.init = init;
});

define(function(require, exports, module) {

    var PanelManager   = brackets.getModule("view/PanelManager"),
        Resizer        = brackets.getModule("utils/Resizer"),
        menu           = require("Menu"),
        hintProvider   = require("HintProvider");

    var $container, $hints, hints;

    var tmpls = {
        $ternific: $(require("text!views/tmpls/ternific.html")),
        hintdetails: require("text!views/tmpls/hintdetails.html")
    };


    $(document).on("click", ".hintList li", function(evt) {
        $hints.filter(".active").removeClass("active");
        highlightHint( hints[  $hints.index( $(this).addClass("active") ) ] );
    });


    $(document).on("click", ".ternific-toolbar-icon", function(evt) {
        toggle(true);
    });


    $(menu).on("manager.ternific", function(evt) {
        toggle(true);
    });


    $(hintProvider).on("hints", function(evt, hintsList, hintsHtml) {
        hints = hintsList;
        $hints = $(hintsHtml);
        tmpls.$ternific.find(".hintList").html($("<ul>").append($hints));
    });


    $(hintProvider).on("highlight", function(evt, hint) {
        highlightHint(hint);
    });


    function highlightHint(hint) {
        tmpls.$ternific.find(".hintDetails").html($(Mustache.render(tmpls.hintdetails, hint)));
    }


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

        $("#main-toolbar .buttons").append("<a href='#' class='ternific-toolbar-icon' title='Ternific'></a>");
    }

    exports.init = init;
});

/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module){

    var HintTransform = require("HintTransform");


    function HintProvider(hintManager) {
        this.hintManager = hintManager;
    }


    HintProvider.prototype.hasHints = function (editor, implicitChar) {
        return this.hintManager.ternHints.canHint(implicitChar, editor._codeMirror, editor.document.file);
    };


    HintProvider.prototype.getHints = function (implicitChar) {
        // If it is not an implicit hint start and it is not a
        // character that be used for hinting, then we don not
        // make any hinting requests.
        if (implicitChar !== null && this.hintManager.ternHints.canHint(implicitChar) === false) {
            return null;
        }

        var _self = this;
        return this.hintManager.ternHints.getHints().then(function (hints) {
            _self.hints = hints;
            return HintTransform(hints);
        });
    };


    HintProvider.prototype.insertHint = function ($hintObj) {
        var hint = $hintObj.data("token");
        this.hintManager.ternHints.insertHint(hint, this.hints);

        // Return false to indicate that another hinting session is not needed
        return false;
    };


    return HintProvider;

});

/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module){

    var HintTransform = require("HintTransform"),
        HintHelper = require("HintHelper")


    /**
     * Brackets hint provider.  This is the bridge between Brackets and tern
     */
    function HintProvider(hintManager) {
        this.hintManager = hintManager;
    }


    /**
     * Utility function that helps determine if the the parameter _char
     * is one that we can start or continue hinting on.  There are some
     * characters that are not hintable.
     */
    HintProvider.prototype.hasHints = function (editor, implicitChar) {
        var cm = editor._codeMirror;

        if (!implicitChar || HintHelper.maybeIdentifier(implicitChar)) {
            this._cm = cm;
            this.newSession = true;
            return HintHelper.hintable(cm.getTokenAt(cm.getCursor()));
        }

        delete this._cm;
        return false;
    };


    HintProvider.prototype.getHints = function (implicitChar) {
        var _self = this,
            newSession = this.newSession;

        // Condition to make we are providing hints for characters we know are valid
        if (implicitChar !== null && HintHelper.maybeIdentifier(implicitChar) === false) {
            return null;
        }

        // New session is important because we want to get everything we can from
        // tern that contains implicitChar.  This is really useful for discoverability
        // of what's available when a hinting session if first started.
        this.newSession = false;

        return this.hintManager.ternHints.query(this._cm, !newSession).then(function (result) {
            // Result will be null when tern queries are being cancelled because there
            // are too many requests coming in and the ones that can be ignored, will
            // be cancelled.  What will be ignored are those that should never get processed by
            // tern. For example, a user types one character and then type 2 other characters
            // really fast...  The one character in the middle will not need to be processed
            // because the user has already typed another character that will generate a fresh
            // list of hints.  So, that request will get cancelled to avoid extra processing of
            // something that's already stale.
            if (result === null) {
                return {
                    hints: []
                };
            }

            var hints = {
                text: _self._cm.getDoc().getRange(result.start, result.end),
                result: result
            };

            _self.hints = hints;
            return HintTransform(hints, HintTransform.sort.byMatch);
        });
    };


    HintProvider.prototype.insertHint = function ($hintObj) {
        var hints = this.hints,
            hint = $hintObj.data("token");

        this._cm.getDoc().replaceRange(hint.name, hints.result.start, hints.result.end);

        // Return false to indicate that another hinting session is not needed
        return false;
    };


    HintProvider.prototype.insertHintOnTab = function () {
        return true;
    };


    return HintProvider;
});

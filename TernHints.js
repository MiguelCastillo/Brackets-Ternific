/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    var CodeHintManager = brackets.getModule("editor/CodeHintManager");
    var spromise        = require("libs/js/spromise"),
        HintTransform   = require("HintTransform"),
        HintHelper      = require("HintHelper");


    function TernHints(ternProvider) {
        this.ternProvider = ternProvider;
        this._selectedIndex = 0;
        this._newSession = false;
        this._transformed = null;
        this._token = null;
        this._cm = null;
    }


    /**
     * Utility function that helps determine if the the parameter _char
     * is one that we can start or continue hinting on.  There are some
     * characters that are not hintable.
     */
    TernHints.prototype.hasHints = function (editor, implicitChar) {
        var cm = editor._codeMirror;

        if (implicitChar && !HintHelper.maybeIdentifier(implicitChar)) {
            delete this._cm;
            return false;
        }

        this._token = cm.getTokenAt(cm.getCursor());
        var hintable = HintHelper.hintable(this._token);

        if (hintable) {
            this._cm = cm;
            this._newSession = true;
        }

        return hintable;
    };


    TernHints.prototype.getHints = function (implicitChar) {
        var _self = this,
            newSession = this._newSession;

        if (newSession) {
            _self._codeHintList = CodeHintManager._getCodeHintList();
            // Let's highjack the CodeHint selectedIndex :)
            Object.defineProperty(_self._codeHintList, "selectedIndex", {
                enumerable: true,
                get: function() {
                    return _self._selectedIndex;
                },
                set: function(newValue) {
                    _self._selectedIndex = newValue;
                    $(TernHints).triggerHandler("highlight", [_self._transformed.tokens[newValue]]);
                }
            });
        }

        // Condition to make we are providing hints for characters we know are valid
        if (implicitChar !== null && HintHelper.maybeIdentifier(implicitChar) === false) {
            return null;
        }

        // New session is important because we want to get everything we can from
        // tern that contains implicitChar.  This is really useful for discoverability
        // of what's available when a hinting session if first started.
        this._newSession = false;

        return this.ternProvider.query(this._cm, {
            caseInsensitive: true,
            type: "completions",
            types: true,
            docs: true,
            urls: true,
            filter: !newSession
        }).then(function (result) {
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
            _self._transformed = HintTransform(hints, HintTransform.sort.byMatch);
            $(TernHints).triggerHandler("hints", [_self._transformed.tokens, _self._transformed.html]);

            return {
                hints: _self._transformed.hints,
                match: null, // Prevent CodeHintManager from formatting results
                selectInitial: true
            };
        });
    };


    TernHints.prototype.insertHint = function ($hintObj) {
        var hints = this.hints,
            hint = this._transformed.tokens[this._selectedIndex];

        this._cm.getDoc().replaceRange(hint.name, hints.result.start, hints.result.end);

        // Return false to indicate that another hinting session is not needed
        return false;
    };


    TernHints.prototype.insertHintOnTab = function () {
        return true;
    };


    return TernHints;

});

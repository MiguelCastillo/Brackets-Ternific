/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';

    var HintHelper = require("HintHelper");

    function TernHints(ternProvider) {
        var _self = this;
        _self.ternProvider = ternProvider;
        _self._cm = null;
    }


    /**
    * Utility function that helps determine if the the parameter _char
    * is one that we can start or continue hinting on.  There are some
    * characters that are not hintable.
    */
    TernHints.prototype.canHint = function (_char, cm /*, file*/) {
        // Support for inner mode
        // var mode = CodeMirror.innerMode(cm.getMode(), token.state).mode;

        var _self = this;

        // If this is true, then we have a new hinting session.  Let's set the new
        // code mirror instance.
        if (_self._cm !== cm && cm !== undefined) {
            _self._cm = cm;
        }

        cm = _self._cm;

        if (!_char || HintHelper.maybeIdentifier(_char)) {
            var cursor = cm.getCursor();
            var token = cm.getTokenAt(cursor);
            return HintHelper.hintable(token);
        }

        _self._cm = null;
        return false;
    };


    /**
    * Inserts a hint from the hints object.
    * The idea here is that getHints is called first to build a valid list of hints.
    * Then select one of the hint items from hints returned by getHints.  The selected
    * hint and the hints object are the parameters you supply in insertHint.
    *
    * 1. call getHints.
    * 2. select a hint from the hints returned by getHints
    * 3. feed the selected hint and the list of hints back in insertHint
    */
    TernHints.prototype.insertHint = function( hint, hints ) {
        if ( !hint || !hints ) {
            throw new TypeError("Must provide valid hint and hints object as they are returned by calling getHints");
        }

        var _self = this;
        var cm = _self._cm;

        var completion  = hint.value,
            cursor      = cm.getCursor(),
            token       = cm.getTokenAt(cursor),
            query       = hints.query.details.text,
            start       = {line: cursor.line, ch: cursor.ch - query.length},
            end         = {line: cursor.line, ch: (token ? token.end : cursor.ch)};

        // Replace the current token with the completion
        cm.getDoc().replaceRange(completion, start, end);
    };


    /**
    * Interface to ask tern for hints.  You can pass in any particular code
    * mirror instance you want to operate on or let ternManager pick the last
    * code mirror instance that was registered via register.
    */
    TernHints.prototype.getHints = function( ) {
        var _self = this;
        var cm = _self._cm;

        if ( !cm ){
            return $.Deferred().reject();
        }

        return _self.ternProvider.query(cm, {type: "completions", types: true, docs: true})
            .pipe(function(data, query) {
                var completions = [];

                // Expand some details about the completion results
                query.details = hintResultDetails(query);

                for (var i = 0; i < data.completions.length; i++) {
                    var completion = data.completions[i],
                        completionType = HintHelper.typeDetails(completion.type),
                        className = completionType.icon;

                    if (completion.guess) {
                        className += " Tern-completion-guess";
                    }

                    var _completion = {
                        value: completion.name,
                        type: completionType.name,
                        icon: completionType.icon,
                        className: className,
                        _completion: completion,
                        _type: completionType
                    };

                    completions.push(_completion);
                }

                var _hints = {
                    list: completions,
                    query: query,
                    cm: cm
                };

                return _hints;
            },
            function(error) {
                return error;
            });
    };


    /**
    * Gets more details about the query itself.  One of the things it
    * provides is the text for the query...  E.g. What is tern searching
    * for when we are asking for feedback.
    */
    function hintResultDetails( query ) {
        if ( query ) {
            var result = query.result;
            var start = CodeMirror.Pos(result.start.line, result.start.ch),
                end = CodeMirror.Pos(result.end.line, result.end.ch);

            var details = {
                text: query.doc.cm.getDoc().getRange(start, end),
                start: start,
                end: end
            };

            return details;
        }
    }


    return TernHints;

});

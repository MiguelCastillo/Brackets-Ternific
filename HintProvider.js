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

define(function(require, exports, module){

    var spromise      = require("libs/js/spromise");
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
        var promise = spromise.defer();

        this.hintManager.ternHints.getHints().done(function (hints) {
            _self.hints = hints;
            var transformedHints = HintTransform(hints);
            promise.resolve(transformedHints);
        }).fail(function (error) {
            promise.reject(error);
        });

        return promise;
    };


    HintProvider.prototype.insertHint = function ($hintObj) {
        var hint = $hintObj.data("token");
        this.hintManager.ternHints.insertHint(hint, this.hints);

        // Return false to indicate that another hinting session is not needed
        return false;
    };


    return HintProvider;

});

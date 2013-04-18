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

    function TernTypes(ternProvider) {
        var _self = this;
        _self.ternProvider = ternProvider;
        _self._cm = null;
    }


    TernTypes.prototype.findType = function( cm ) {
        var _self = this;

        return _self.ternProvider.query(cm, "type")
            .pipe( function(data) {
                var findTypeType = HintHelper.typeDetails(data.type),
                    className = findTypeType.icon;

                if (data.guess) {
                    className += " Tern-completion-guess";
                }

                var _findType = {
                    value: data.name,
                    type: findTypeType.name,
                    icon: findTypeType.icon,
                    className: className,
                    query: data.query,
                    _find: data,
                    _type: HintHelper.findTypeType
                };

                console.log(_findType);
                return _findType;
            },
            function( error ) {
                return error;
            });
    };


    return TernTypes;

});

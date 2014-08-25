/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    'use strict';

    var spromise   = require("libs/js/spromise");
    var HintHelper = require("HintHelper");

    function TernHints(ternProvider) {
        var _self = this;
        _self.ternProvider = ternProvider;
    }


    TernHints.prototype.query = function(cm, filter) {
        return this.ternProvider.query(cm, {
            caseInsensitive: true,
            type: "completions",
            types: true,
            docs: true,
            urls: true,
            filter: filter
        });
    };


    return TernHints;

});

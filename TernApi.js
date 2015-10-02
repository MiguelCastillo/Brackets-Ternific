/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require /*, exports, module*/) {
    "use strict";

    var ternDemo = require("./TernDemo");

    var defaults = {
        filter  : true, // Results will be pretty large if we don't filter stuff out
        sort    : true,
        depths  : true,
        guess   : true,
        origins : false,
        docs    : false,
        expandWordForward: false
    };


    function TernApi() {
        ternDemo.setServer(this);
    }

    TernApi.prototype.loadSettings = function() {
        throw new TypeError("Not implemented");
    };

    TernApi.prototype.addFile = function() {
        throw new TypeError("Not implemented");
    };

    TernApi.prototype.clear = function() {
        throw new TypeError("Not implemented");
    };

    TernApi.prototype.request = function() {
        throw new TypeError("Not implemented");
    };

    TernApi.prototype.query = function() {
        if (!ternDemo.getCurDoc()) {
            throw new TypeError("No document is currently selected");
        }

        var ternRequest   = ternDemo.buildRequest.apply((void 0), arguments);
        ternRequest.query = $.extend({}, defaults, ternRequest.query);
        return this.request(ternRequest);
    };

    TernApi.prototype.trackChange = function() {
        ternDemo.trackChange.apply((void 0), arguments);
    };

    TernApi.prototype.buildRequest = function() {
        return ternDemo.buildRequest.apply((void 0), arguments);
    };

    TernApi.prototype.setCurrentDocument = function(doc) {
        ternDemo.setCurDoc(doc);
    };

    TernApi.prototype.setDocuments = function(docs) {
        ternDemo.setDocs(docs);
    };

    TernApi.defaults = defaults;
    return TernApi;
});


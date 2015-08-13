/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (/*require, exports, module*/) {
    "use strict";

    var _ = brackets.getModule("thirdparty/lodash");


    function Repository() {
        this._items = [];
    }


    Repository.prototype.add = function(document) {
        this._items.push(document);
    };


    Repository.prototype.remove = function(document) {
        var i = this._items.indexOf(document);
        if (i !== -1) {
            this._items.splice(i, 1);
        }
    };


    Repository.prototype.clear = function() {
        this._items.splice(0, Number.MAX_VALUE);
    };


    Repository.prototype.items = function() {
        return this._items.slice();
    };


    Repository.prototype.find = function(criteria) {
        return _.find(this._items, criteria);
    };


    Repository.prototype.getByName = function(name) {
        return _.find(this._items, {"name": name});
    };


    Repository.prototype.getById = function(id) {
        return _.find(this._items, {"id": id});
    };


    return Repository;
});

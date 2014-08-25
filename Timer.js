/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    // From http://msdn.microsoft.com/en-us/library/ie/ff679974(v=vs.94).aspx

    function Timer(start) {
        if(start === true){
            this.start();
        }
    }

    Timer.prototype.start = function() {
        this._start = Date.now();
    };


    Timer.prototype.end = function() {
        this._end = Date.now();
    };


    Timer.prototype.elapsed = function() {
        this.end();
        return (this._end - this._start)/1000;
    };


    exports.Timer = Timer;
    return Timer;
});

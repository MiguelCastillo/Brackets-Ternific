define(function (require, exports, module) {
    "use strict";
    var jsMode = "javascript";

    function test(){
    }

    test.prototype.hi = function(){
    };

    test.prototype.no = function(){
    };

    test.prototype.yes = function(){
    };


    return {
        jsMode: jsMode,
        test: test
    };
});

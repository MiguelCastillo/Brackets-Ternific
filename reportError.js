/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (/*require, exports, module*/) {
    "use strict";

    function reportError(error) {
        if (error && !error.handled) {
            error.handled = true;
            if (error.stack) {
                console.log(error.stack);
            }
            else {
                console.error(error);
            }
        }

        return error;
    }

    return reportError;
});

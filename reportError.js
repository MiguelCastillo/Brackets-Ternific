/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (/*require, exports, module*/) {
    "use strict";

    function reportError(error) {
        if (error && !error.handled) {
            if (!error.stack) {
                error = new Error(error);
            }

            console.log(error.stack);
            error.handled = true;
        }

        return error;
    }

    return reportError;
});

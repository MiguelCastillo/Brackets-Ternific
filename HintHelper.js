/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Some of this code has been taken from brackets javascriptcodehints.
 * Licensed under MIT
 */


define(function(/*require, exports, module*/) {
    "use strict";

    var SINGLE_QUOTE    = "\'",
        DOUBLE_QUOTE    = "\"",
        identifierRegex = /[0-9a-z_.\$]/i;


    function pathFile(fullPath) {
        var index = fullPath.lastIndexOf('/');
        var pathName = fullPath.substr(0, index);
        var fileName = fullPath.substr(index);

        return {
            path: pathName,
            file: fileName
        };
    }


    function typeInfo (type) {
        var suffix, args, returns;

        if (type == "?") {
            suffix = "unknown";
        }
        else if (type == "number" || type == "string" || type == "bool") {
            suffix = type;
        }
        else if (/^fn\(/.test(type)) {
            suffix = "function";
            var arrow = type.lastIndexOf("->");

            if (arrow !== -1) {
                returns = type.substr(arrow + 3).trim();
                if (/fn\([\s]*\)/g.test(returns) || !/[\(\)]+/g.test(returns)) {
                    type = type.substr(0, arrow).trim();
                }
                else {
                    returns = null;
                }
            }

            args = /^fn\(([\w\W]*)\)/g.exec(type)[1];
        }
        else if (/^\[/.test(type)) {
            suffix = "array";
        }
        else {
            suffix = "object";
        }

        return {
            icon: "Tern-completion Tern-completion-" + suffix,
            name: suffix,
            args: args,
            returns: returns
        };
    }


    ///
    ///  The functions below were taken from brackets javascript hinting engine.
    ///

    /**
     * Is the string key perhaps a valid JavaScript identifier?
     *
     * @param {string} key - the string to test
     * @return {boolean} - could key be a valid identifier?
     */
    function maybeIdentifier(key) {
        return identifierRegex.test(key);
    }


    /**
     * Is the token's class hintable? (A very conservative test.)
     *
     * @param {Object} token - the token to test for hintability
     * @returns {boolean} - could the token be hintable?
     */
    function hintable(token) {
        switch (token.type) {
        case "comment":
        case "string":
        case "number":
        case "regexp":
            return false;
        default:
            return true;
        }
    }


    return {
        SINGLE_QUOTE: SINGLE_QUOTE,
        DOUBLE_QUOTE: DOUBLE_QUOTE,
        typeInfo: typeInfo,
        maybeIdentifier: maybeIdentifier,
        hintable: hintable,
        pathFile: pathFile
    };
});

/**
*  This code has been taken from brackets javascriptcodehints.
*
*/

define(function(require, exports, module){

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


    function typeDetails (type) {
        var suffix;

        if (type == "?") {
            suffix = "unknown";
        }
        else if (type == "number" || type == "string" || type == "bool") {
            suffix = type;
        }
        else if (/^fn\(/.test(type)) {
            suffix = "fn";
        }
        else if (/^\[/.test(type)) {
            suffix = "array";
        }
        else {
            suffix = "object";
        }

        return {
            icon: "Tern-completion Tern-completion-" + suffix,
            name: suffix
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
        return identifierRegex.test(key) ||
            (key.indexOf(SINGLE_QUOTE) === 0) ||
            (key.indexOf(DOUBLE_QUOTE) === 0);
    }


    /**
     * Is the token's class hintable? (A very conservative test.)
     *
     * @param {Object} token - the token to test for hintability
     * @return {boolean} - could the token be hintable?
     */
    function hintable(token) {
        switch (token.className) {
        case "comment":
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
        typeDetails: typeDetails,
        maybeIdentifier: maybeIdentifier,
        hintable: hintable,
        pathFile: pathFile
    };
});


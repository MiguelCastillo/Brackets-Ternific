/**
*  This code has been taken from brackets javascriptcodehints.
*
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Brackets Extension to load line navigator CodeMirror addon */
define(function (require, exports, module) {
    "use strict";

    var StringUtils = brackets.getModule("utils/StringUtils");
    var HintHelper  = require("HintHelper");

    var MAX_DISPLAYED_HINTS = 100,
        SINGLE_QUOTE        = HintHelper.SINGLE_QUOTE,
        DOUBLE_QUOTE        = HintHelper.DOUBLE_QUOTE;


    function HintsTransform(hints, query) {

        var trimmedQuery,
            filteredHints,
            formattedHints;

        /*
         * Filter a list of tokens using the query string in the closure.
         *
         * @param {Array.<Object>} tokens - list of hints to filter
         * @param {number} limit - maximum numberof tokens to return
         * @return {Array.<Object>} - filtered list of hints
         */
        function filterWithQuery(tokens, limit) {

            /*
             * Filter arr using test, returning at most limit results from the
             * front of the array.
             *
             * @param {Array} arr - array to filter
             * @param {Function} test - test to determine if an element should
             *      be included in the results
             * @param {number} limit - the maximum number of elements to return
             * @return {Array.<Object>} - new array of filtered elements
             */
            function filterArrayPrefix(arr, test, limit) {
                var i = 0,
                    results = [],
                    elem;

                for (i; i < arr.length && results.length <= limit; i++) {
                    elem = arr[i];
                    if (test(elem)) {
                        results.push(elem);
                    }
                }

                return results;
            }

            // If the query is a string literal (i.e., if it starts with a
            // string literal delimiter, and hence if trimmedQuery !== query)
            // then only string literal hints should be returned, and matching
            // should be performed w.r.t. trimmedQuery. If the query is
            // otherwise non-empty, no string literals should match. If the
            // query is empty then no hints are filtered.
            if (trimmedQuery !== query) {
                return filterArrayPrefix(tokens, function (token) {
                    if (token.literal && token.kind === "string") {
                        return (token.value.indexOf(trimmedQuery) === 0);
                    } else {
                        return false;
                    }
                }, limit);
            } else if (query.length > 0) {
                return filterArrayPrefix(tokens, function (token) {
                    if (token.literal && token.kind === "string") {
                        return false;
                    } else {
                        return (token.value.indexOf(query) === 0);
                    }
                }, limit);
            } else {
                return tokens.slice(0, limit);
            }
        }

        /*
         * Returns a formatted list of hints with the query substring
         * highlighted.
         *
         * @param {Array.<Object>} hints - the list of hints to format
         * @param {string} query - querystring used for highlighting matched
         *      poritions of each hint
         * @param {Array.<jQuery.Object>} - array of hints formatted as jQuery
         *      objects
         */
        function formatHints(hints, query) {
            return hints.map(function (token) {
                var hint        = token.value,
                    index       = hint.indexOf(query),
                    $hintObj    = $("<span>").addClass("brackets-js-hints"),
                    delimiter   = "";

                // Add icon to the hint item
                $("<span>").addClass(token.className).appendTo($hintObj);

                // level indicates either variable scope or property confidence
                switch (token.level) {
                case 0:
                    $hintObj.addClass("priority-high");
                    break;
                case 1:
                    $hintObj.addClass("priority-medium");
                    break;
                case 2:
                    $hintObj.addClass("priority-low");
                    break;
                }

                // is the token a global variable?
                if (token.global) {
                    $hintObj.addClass("global-hint");
                }

                // is the token a literal?
                if (token.literal) {
                    $hintObj.addClass("literal-hint");
                    if (token.kind === "string") {
                        delimiter = DOUBLE_QUOTE;
                    }
                }

                // is the token a keyword?
                if (token.keyword) {
                    $hintObj.addClass("keyword-hint");
                }

                // higlight the matched portion of each hint
                if (index >= 0) {
                    var prefix  = StringUtils.htmlEscape(hint.slice(0, index)),
                        match   = StringUtils.htmlEscape(hint.slice(index, index + query.length)),
                        suffix  = StringUtils.htmlEscape(hint.slice(index + query.length));

                    $hintObj.append(delimiter + prefix)
                        .append($("<span>")
                                .append(match)
                                .addClass("matched-hint"))
                        .append(suffix + delimiter);
                } else {
                    $hintObj.text(delimiter + hint + delimiter);
                }
                $hintObj.data("token", token);

                return $hintObj;
            });
        }

        // trim leading and trailing string literal delimiters from the query
        if (query.indexOf(SINGLE_QUOTE) === 0 ||
                query.indexOf(DOUBLE_QUOTE) === 0) {
            trimmedQuery = query.substring(1);
            if (trimmedQuery.lastIndexOf(DOUBLE_QUOTE) === trimmedQuery.length - 1 ||
                    trimmedQuery.lastIndexOf(SINGLE_QUOTE) === trimmedQuery.length - 1) {
                trimmedQuery = trimmedQuery.substring(0, trimmedQuery.length - 1);
            }
        } else {
            trimmedQuery = query;
        }

        filteredHints = filterWithQuery(hints, MAX_DISPLAYED_HINTS);
        formattedHints = formatHints(filteredHints, trimmedQuery);

        return {
            hints: formattedHints,
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    }


    exports.HintsTransform = {
        apply: HintsTransform
    };

    return HintsTransform;

});

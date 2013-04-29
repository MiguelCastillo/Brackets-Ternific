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

    var MAX_DISPLAYED_HINTS = 400,
        SINGLE_QUOTE        = HintHelper.SINGLE_QUOTE,
        DOUBLE_QUOTE        = HintHelper.DOUBLE_QUOTE;


    var Priorities = {
        "0": "priority-high",
        "1": "priority-medium",
        "-1": "priority-low"
    };


    var sorter = (function(){
        var placementOffset = 1000;
        var limit = MAX_DISPLAYED_HINTS;


        function matchByType(token, criteria, type) {
            if (token.type === type) {
                return token.value.indexOf(criteria);
            }
            else {
                return token.value.indexOf(criteria) + placementOffset;
            }
        }


        function _matchType(tokens, criteria, match, tester) {
            var groups = {}, group, result = [], index;
            //var limit  = criteria.length === 0 ? MAX_DISPLAYED_HINTS : 30;

            $.each(tokens, function(iToken, token) {
                index = tester(token, criteria, match);
                token.level = index;
                group = groups[index] || (groups[index] = {items:[]});
                group.items.push(token);
            });

            $.each(groups, function(groupdId, group) {
                var itemsLength = group.items.length,
                    resultLength = result.length;

                var remaining = (limit - resultLength);
                var maxItems = remaining > itemsLength ? itemsLength : remaining;

                if (remaining > itemsLength) {
                    Array.prototype.push.apply(result, group.items);
                }
                else {
                    Array.prototype.push.apply(result, group.items.slice(0, maxItems));
                    return false;
                }

                // Or... Just copy all of it?
                //Array.prototype.push.apply(result, group.items);
            });

            return result;
        }


        function byFunction(tokens, criteria) {
            return _matchType(tokens, criteria, "fn", matchByType);
        }


        function byMatch(tokens, criteria) {
            var tester;

            if (criteria.length === 0) {
                tester = function(token) {
                    return token.depth;
                };
            }
            else {
                tester = function (token) {
                    return token.value.indexOf(criteria) + token.depth;
                };
            }

            return _matchType(tokens, criteria, '', tester);
        }


        function byPass(tokens) {
            //var limit = criteria.length === 0 ? MAX_DISPLAYED_HINTS : 30;
            return tokens.slice(0, limit);
        }


        function byObject(tokens, criteria) {
            return _matchType(tokens, criteria, "object", matchByType);
        }


        function byString(tokens, criteria) {
            return _matchType(tokens, criteria, "string", matchByType);
        }


        return {
            byFunction: byFunction,
            byMatch: byMatch,
            byPass: byPass,
            byObject: byObject,
            byString: byString
        };

    })();


    /*
     * Returns a formatted list of hints with the query substring
     * highlighted.
     *
     * @param {Array.<Object>} hints - the list of hints to format
     * @param {string} query - querystring used for highlighting matched
     *      poritions of each hint
     *
     * @return {Array.<jQuery.Object>} - array of hints formatted as jQuery
     *      objects
     */
    function formatHints(hints, query) {
        return hints.map(function (token) {
            var hint     = token.value,
                index    = hint.indexOf(query),
                priority = Priorities[token.level] || Priorities['1'];
            var hintHtml;

            // higlight the matched portion of each hint
            if ( index >= 0 ) {
                var prefix = StringUtils.htmlEscape(hint.slice(0, index)),
                    match  = StringUtils.htmlEscape(hint.slice(index, index + query.length)),
                    suffix = StringUtils.htmlEscape(hint.slice(index + query.length));

                hintHtml = ("<span class='brackets-js-hints {0}'>" +
                                "<span class='type {1}'></span>" +
                                "{2}" + //"<span class='prefix'></span>"
                                "<span class='matched-hint'>{3}</span>" +
                                "{4}" + //"<span class='suffix'></span>"
                            "</span>").format(priority, token.className, prefix, match, suffix);
            }
            else {
                hintHtml = ("<span class='brackets-js-hints {0}'>" +
                                "<span class='type {1}'></span>" +
                                "<span class='hint'>{2}</span>" +
                            "</span>").format(priority, token.className, hint);
            }

            return $(hintHtml).data("token", token);
        });
    }


    function HintsTransform(hints, query, sortType) {
        sortType = sortType || "byMatch";

        var trimmedQuery, filteredHints;
        var firstChar = query.charAt(0);
        if (firstChar === SINGLE_QUOTE || firstChar === DOUBLE_QUOTE) {
            trimmedQuery = query.substring(1);
            var lastChar = trimmedQuery.charAt(trimmedQuery.length - 1);
            if( lastChar === SINGLE_QUOTE || lastChar === DOUBLE_QUOTE) {
                trimmedQuery = trimmedQuery.substring(0, trimmedQuery.length - 1);
            }
        }
        else {
            trimmedQuery = query;
        }


        filteredHints = sorter[sortType](hints, trimmedQuery);

        return {
            hints: formatHints(filteredHints, trimmedQuery),
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    }


    return HintsTransform;
});

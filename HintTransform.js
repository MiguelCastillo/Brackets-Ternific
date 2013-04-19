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
            function tester(token) {
                return token.value.indexOf(criteria);
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




    function HintsTransform(hints, query) {

        var trimmedQuery,
            filteredHints,
            formattedHints;


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
                    // Great hit!!!
                    $hintObj.addClass("priority-high");
                    break;
                case -1:
                    // No hits
                    $hintObj.addClass("priority-low");
                    break;
                default:
                    // Any hits
                    $hintObj.addClass("priority-medium");
                    break;
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
                }
                else {
                    $hintObj.append(delimiter + hint + delimiter);
                }

                $hintObj.data("token", token);

                return $hintObj;
            });
        }


        // trim leading and trailing string literal delimiters from the query
        var sortType = "byMatch";
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
        formattedHints = formatHints(filteredHints, trimmedQuery);

        return {
            hints: formattedHints,
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    }


    exports.HintsTransform = HintsTransform;
    return HintsTransform;
});

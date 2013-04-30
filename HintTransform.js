/**
*  This code has been taken from brackets javascriptcodehints.
*
*/


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


        function matchByType(type, criteria, token) {
            if (token.type === type) {
                return token.name.indexOf(criteria);
            }
            else {
                return token.name.indexOf(criteria) + placementOffset;
            }
        }


        function matchByDepth(criteria, token) {
            if (!criteria) {
                return token.depth;
            }
            else {
                return token.name.indexOf(criteria) + token.depth;
            }
        }


        function _sort(tokens, tester) {
            var groups = {},
                result = [],
                index,
                length,
                token,
                group,
                groupdId;

            index = 0,
            length = tokens.length;

            for(; index < length; index++) {
                token = tokens[index];
                token.level = groupdId = tester(token);
                group = groups[groupdId] || (groups[groupdId] = {items:[]});
                group.items.push(token);
            }

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
            return _sort(tokens, matchByType.bind(undefined, "fn", criteria));
        }


        function byMatch(tokens, criteria) {
            return _sort(tokens, matchByDepth.bind(undefined, criteria));
        }


        function byPass(tokens) {
            return tokens.slice(0, limit);
        }


        function byObject(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "object", criteria));
        }


        function byString(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "string", criteria));
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
            var hint           = token.name,
                index          = hint.indexOf(query),
                priority       = Priorities[token.level] || Priorities['1'],
                completionType = HintHelper.typeDetails(token.type),
                icon           = completionType.icon;

            if (token.guess) {
                icon += " Tern-completion-guess";
            }

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
                            "</span>").format(priority, icon, prefix, match, suffix);
            }
            else {
                hintHtml = ("<span class='brackets-js-hints {0}'>" +
                                "<span class='type {1}'></span>" +
                                "<span class='hint'>{2}</span>" +
                            "</span>").format(priority, icon, hint);
            }

            return $(hintHtml).data("token", token);
        });
    }


    function HintsTransform(hints, sortType) {
        sortType = sortType || "byMatch";

        var query = hints.text;
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

        filteredHints = sorter[sortType](hints.result.completions, trimmedQuery);

        return {
            hints: formatHints(filteredHints, trimmedQuery),
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    }


    return HintsTransform;
});

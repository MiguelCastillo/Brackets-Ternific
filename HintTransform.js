/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Some of the code in this module has been derived from brackets javascript hints
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";


    var _          = brackets.getModule("thirdparty/lodash"),
        HintHelper = require("HintHelper");


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
            token.index = token.name.indexOf(criteria);
            if (token.typeInfo.name === type) {
                return token.index;
            }
            else {
                return token.index + placementOffset;
            }
        }


        function matchByDepth(criteria, token) {
            token.index = token.name.indexOf(criteria);
            if (!criteria) {
                return token.depth;
            }
            else {
                // Give items that match the criteria higher priority than
                // items with just perfect depth but no matching criteria.
                if ( token.index !== -1 ) {
                    return token.index + token.depth;
                }
                else {
                    return placementOffset + token.depth;
                }
            }
        }


        function _sort(tokens, clasify, toHtml) {
            var groups = {},
                result = {tokens: [], hints: [], html: ""},
                hint,
                index,
                length,
                token,
                group,
                groupdId;

            for(index = 0, length = tokens.length; index < length; index++) {
                token = tokens[index];
                token.typeInfo = HintHelper.typeInfo(token.type);
                token.level = groupdId = clasify(token);

                group = groups[groupdId] || (groups[groupdId] = {html: '', hints: [], tokens: []});
                hint = toHtml(token);
                group.html += "<li>" + hint + "</li>";
                group.hints.push(hint);
                group.tokens.push(token);
            }

            _.each(groups, function(group /*, groupId*/) {
                result.html += group.html;
                result.hints.push.apply(result.hints, group.hints);
                result.tokens.push.apply(result.tokens, group.tokens);
            });

            return result;
        }


        function byFunction(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "function", criteria), tokenToHtml.bind(undefined, criteria));
        }


        function byMatch(tokens, criteria) {
            return _sort(tokens, matchByDepth.bind(undefined, criteria), tokenToHtml.bind(undefined, criteria));
        }


        function byPass(tokens) {
            return tokens.slice(0, limit);
        }


        function byObject(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "object", criteria), tokenToHtml.bind(undefined, criteria));
        }


        function byString(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "string", criteria), tokenToHtml.bind(undefined, criteria));
        }


        return {
            byFunction: byFunction,
            byMatch: byMatch,
            byPass: byPass,
            byObject: byObject,
            byString: byString
        };

    })();


    function tokenToHtml(criteria, token) {
        var hint     = token.name,
            index    = token.index,
            icon     = token.typeInfo.icon,
            priority = Priorities[token.level] || Priorities['1'];

        if (token.guess) {
            icon += " Tern-completion-guess";
        }

        var hintHtml;

        // higlight the matched portion of each hint
        if (index >= 0) {
            var prefix = _.escape(hint.slice(0, index)),
                match  = _.escape(hint.slice(index, index + criteria.length)),
                suffix = _.escape(hint.slice(index + criteria.length));

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

        return hintHtml;
    }


    /**
     * Process hints from tern to sort and create the needed html to display the thints.
     *
     * @param {{completions: Array}} hints tern response from completion query
     * @param {HintsTransform.sort} sortType sorting type for the hints to be generated.
     * @returns {Object}
     */
    function HintsTransform(hints, sortType) {
        var trimmedQuery, lastChar;
        var query = hints.text;
        var firstChar = query.charAt(0);

        if (firstChar === SINGLE_QUOTE || firstChar === DOUBLE_QUOTE) {
            trimmedQuery = query.substring(1);
            lastChar = trimmedQuery.charAt(trimmedQuery.length - 1);
            if (lastChar === SINGLE_QUOTE || lastChar === DOUBLE_QUOTE) {
                trimmedQuery = trimmedQuery.substring(0, trimmedQuery.length - 1);
            }
        }
        else {
            trimmedQuery = query;
        }

        // Build list of hints.
        return sorter[sortType || HintsTransform.sort.byMatch](hints.result.completions, trimmedQuery);
    }


    HintsTransform.sort = {
        "byFunction": "byFunction",
        "byMatch": "byMatch",
        "byPass": "byPass",
        "byObject": "byObject",
        "byString": "byString"
    };


    return HintsTransform;
});

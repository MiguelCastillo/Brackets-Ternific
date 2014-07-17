/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


/*
* Some of the code in this module has been derived from brackets javascript hints
*/

define(function (require, exports, module) {
    "use strict";

    var _ = brackets.getModule("thirdparty/lodash");
    var HintHelper  = require("HintHelper");


    var MAX_DISPLAYED_HINTS = 512,
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
            if (token.type === type) {
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
                return (token.index !== -1?token.index:placementOffset)+token.depth;
            }
        }


        function _sort(tokens, clasify, toHtml) {
            var groups = {},
                result = [],
                index,
                length,
                token,
                group,
                groupdId,
                groupx;

            for(index = 0, length = tokens.length; index < length; index++) {
                token = tokens[index];
                token.level = groupdId = clasify(token);
                group = groups[groupdId] || (groups[groupdId] = {items:[]});
                group.items.push(toHtml(token));
            }

            groupdId=0;


            for(groupx in groups){
                group=groups[groupx];
                var itemsLength = group.items.length,
                    resultLength = result.length;

                var remaining = (limit - resultLength);
                var maxItems = remaining > itemsLength ? itemsLength : remaining;

                if (remaining > itemsLength) {
                    Array.prototype.push.apply(result, group.items);
                } else {
                    Array.prototype.push.apply(result, group.items.slice(0, maxItems));
                    return false;
                }

                groupdId++;
            }

            return result;
        }


        function byFunction(tokens, criteria) {
            return _sort(tokens, matchByType.bind(undefined, "fn", criteria), tokenToHtml.bind(undefined, criteria));
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


    /**
     * Formats the function parameters and it's return value.
     * @param toke {string}
     * @return {string}
     */
    function functionToHtml(token){
        token = token||'';
        token=token.replace(/(\s+)|(\(+)|(\)+)/g, '');

        var txt=" (",tok,par,pars,param,pname,ptype,ret,auxtype;
        var tokens = token.split('->')||[];

        if (tokens.length>0){
            tok=tokens[0];

            pars=tok.split(',');
            for(par in pars){
                param = pars[par].split(':')||[];
                pname=param[0];

                auxtype=param.length>0?param[1].toLowerCase():'unknown';
                ptype=auxtype==='?'?'unknown':(auxtype==='undefined'?'unknown':auxtype);

                txt+='<span class="Tern-completionR-'+ptype+'"> '+pname+'</span>, ';
            }

            txt=txt.substring(0,txt.length-2);

            txt+=")";
            if (tokens.length>1){
                auxtype=tokens[1].toLowerCase();

                if (auxtype.length>0 && auxtype.charAt(0)==='{'){
                    return txt;
                }else{
                    ptype=auxtype==='?'?'unknown':(auxtype==='undefined'?'unknown':auxtype);
                }
                txt+=' >> <span class="Tern-completionR-'+ptype+'">'+auxtype+'</span>';
            }
        }
        return txt;
    }


    function tokenToHtml(criteria, token) {
        var hint           = token.name,
            index          = token.index,
            priority       = Priorities[token.level] || Priorities['1'],
            completionType = HintHelper.typeDetails(token.type),
            icon           = completionType.icon;

        if (token.guess) {
            icon += " Tern-completion-guess";
        }

        var hintHtml;

        // higlight the matched portion of each hint
        if ( index >= 0 ) {
            var prefix = _.escape(hint.slice(0, index)),
                match  = _.escape(hint.slice(index, index + criteria.length)),
                suffix = _.escape(hint.slice(index + criteria.length)),
                xx;

            if (completionType.name==="fn"){

                xx = functionToHtml(token.type.substring(2));

                hintHtml = "<span class='brackets-js-hints " + priority + "'>" +
                    "<span class='type " + icon + "'></span>" +
                    prefix + //"<span class='prefix'></span>"
                    "<span class='matched-hint'>" + match + "</span>" +
                    suffix + //"<span class='suffix'></span>"
                    "<small>" + xx +"</small>"+
                    "</span> ";
            }else {
                hintHtml = "<span class='brackets-js-hints " + priority + "'>" +
                    "<span class='type " + icon + "'></span>" +
                    prefix + //"<span class='prefix'></span>"
                    "<span class='matched-hint'>" + match + "</span>" +
                    suffix + //"<span class='suffix'></span>"
                    "</span> ";
            }
        }
        else {
            hintHtml = "<span class='brackets-js-hints "+priority+"'>" +
                       "<span class='type "+icon+"'></span>" +
                       "<span class='hint'>"+hint+"</span>" +
                       "</span>";
        }
        return $(hintHtml).data("token",token);
    }



    function HintsTransform(hints, sortType) {
        var hintList;
        sortType = sortType || "byMatch";

        var trimmedQuery;
        var query = hints.text;
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

        hintList = sorter[sortType](hints.result.completions, trimmedQuery);

        return {
            hints: hintList,
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
        };
    }


    return HintsTransform;
});

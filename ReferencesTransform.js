/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (/*require, exports, module*/) {
    "use strict";

    function ReferenceTransform(reference, content /*, file*/) {
        //{Object.<fullPath: string, {
        //    matches: Array.<{
        //        start: {line:number, ch:number},
        //        end: {line:number, ch:number},
        //        startOffset: number,
        //        endOffset: number,
        //        line: string}>,
        //    collapsed: boolean}>
        //}

        var lineNumber = reference.start.line,
            lineStart = lineNumber,
            result, matchOffset;

        // Calculate where in the buffer the line number is pointing to
        while(lineStart--) {
            matchOffset = content.indexOf('\n', matchOffset + 1);
        }

        matchOffset++; // Advance this to make sure the line accounts for the leading \n
        result = $.extend(true, {}, reference);

        result.line = content.substr(matchOffset, content.indexOf('\n', matchOffset + 1) - matchOffset);
        result.isChecked = true;
        return result;
    }


    return ReferenceTransform;
});

/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    var _ = brackets.getModule("thirdparty/lodash");

    function ReferenceTransform(reference, content, file) {
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
            result, lineOffset;

        // Calculate where in the buffer the line number is pointing to
        while(lineStart--) {
            lineOffset = content.indexOf('\n', lineOffset + 1);
        }

        result = $.extend(true, {}, reference);

        // Adjust indexes to the the result summary displays the proper string
        //result.start.ch++;
        //result.end.ch++;
        result.line = content.substr(lineOffset, content.indexOf('\n', lineOffset + 1) - lineOffset),
        result.isChecked = true;
        return result;
    }


    return ReferenceTransform;
});

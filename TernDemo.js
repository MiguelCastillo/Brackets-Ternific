/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(/*require, exports, module*/) {
    "use strict";

    var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
    var Pos = CodeMirror.Pos, bigDoc = 250, curDoc = null, docs = [], server = null;

    function trackChange(doc, change) {
      for (var i = 0; i < docs.length; ++i) {var data = docs[i]; if (data.doc == doc) break;}
      var changed = data.changed;
      if (changed == null)
        data.changed = changed = {from: change.from.line, to: change.from.line};
      var end = change.from.line + (change.text.length - 1);
      if (change.from.line < changed.to) changed.to = changed.to - (change.to.line - end);
      if (end >= changed.to) changed.to = end + 1;
      if (changed.from > change.from.line) changed.from = change.from.line;

      if (doc.lineCount() > bigDoc && change.to - changed.from > 100) setTimeout(function() {
        if (data.changed && data.changed.to - data.changed.from > 100) sendDoc(data);
      }, 100);
    }


    function getFragmentAround(cm, start, end) {
      var minIndent = null, minLine = null, endLine, tabSize = cm.getOption("tabSize");
      for (var p = start.line - 1, min = Math.max(0, p - 50); p >= min; --p) {
        var line = cm.getLine(p), fn = line.search(/\bfunction\b/);
        if (fn < 0) continue;
        var indent = CodeMirror.countColumn(line, null, tabSize);
        if (minIndent != null && minIndent <= indent) continue;
        if (cm.getTokenAt(Pos(p, fn + 1)).type != "keyword") continue;
        minIndent = indent;
        minLine = p;
      }
      if (minLine == null) minLine = min;
      var max = Math.min(cm.lastLine(), start.line + 20);
      if (minIndent == null || minIndent == CodeMirror.countColumn(cm.getLine(start.line), null, tabSize))
        endLine = max;
      else for (endLine = start.line + 1; endLine < max; ++endLine) {
        var indent = CodeMirror.countColumn(cm.getLine(endLine), null, tabSize);
        if (indent <= minIndent) break;
      }
      var from = Pos(minLine, 0);

      return {type: "part",
              name: curDoc.name,
              offsetLines: from.line,
              text: cm.getRange(from, Pos(endLine, 0))};
    }

    function displayError(err) {
    }

    function incLine(off, pos) { return Pos(pos.line + off, pos.ch); }

    function buildRequest(cm, query, allowFragments) {
      var files = [], offsetLines = 0;
      if (typeof query == "string") query = {type: query};
      query.lineCharPositions = true;
      if (query.end == null) {
        query.end = cm.getCursor("end");
        if (cm.somethingSelected())
          query.start = cm.getCursor("start");
      }
      var startPos = query.start || query.end;

      if (curDoc.changed) {
        if (cm.lineCount() > bigDoc && allowFragments !== false &&
            curDoc.changed.to - curDoc.changed.from < 100 &&
            curDoc.changed.from <= startPos.line && curDoc.changed.to > query.end.line) {
          files.push(getFragmentAround(cm, startPos, query.end));
          query.file = "#0";
          var offsetLines = files[0].offsetLines;
          if (query.start != null) query.start = incLine(-offsetLines, query.start);
          query.end = incLine(-offsetLines, query.end);
        } else {
          files.push({type: "full",
                      name: curDoc.name,
                      text: cm.getValue()});
          query.file = curDoc.name;
          curDoc.changed = null;
        }
      } else {
        query.file = curDoc.name;
      }
      for (var i = 0; i < docs.length; ++i) {
        var doc = docs[i];
        if (doc.changed && doc != curDoc) {
          files.push({type: "full", name: doc.name, text: doc.doc.getValue()});
          doc.changed = null;
        }
      }

      return {query: query, files: files};
    }

    function sendDoc(doc) {
      server.request({files: [{type: "full", name: doc.name, text: doc.doc.getValue()}]}, function(error) {
        if (error) return displayError(error);
        else doc.changed = null;
      });
    }


    function getCurDoc() {
        return !!curDoc;
    }

    function setCurDoc(_curDoc) {
        curDoc = _curDoc;
    }

    function setDocs(_docs) {
        docs = _docs;
    }

    function setServer(_server) {
        server = _server;
    }

    return {
        setDocs: setDocs,
        setCurDoc: setCurDoc,
        getCurDoc: getCurDoc,
        setServer: setServer,
        buildRequest: buildRequest,
        trackChange: trackChange
    };
});


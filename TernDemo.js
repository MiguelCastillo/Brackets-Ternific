/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

define(function(require, exports, module) {
    "use strict";

    var Timer = require("Timer");

    var Pos = CodeMirror.Pos, bigDoc = 250, curDoc = null, docs = [], server = null;
    var cachedFunction = {line: null, ch: null, name: null, type: null, bad: null};


    function trackChange(doc, change) {
      if (cachedFunction.line > change.from.line ||
          cachedFunction.line == change.from.line && cachedFunction.ch >= change.from.ch)
        cachedFunction.line = -1;

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


    function workerServer(settings) {
        var worker = new Worker( module.uri.substr(0, module.uri.lastIndexOf("/")) + "/TernWorker.js" );
        var msgId = 1, pending = {}, lastRequest;

        worker.postMessage({
            type: "init",
            data: {
                async: settings.async,
                debug: settings.debug,
                defs: settings.defs,
                plugins: settings.plugins,
            }
        });

        function send(data, callback) {
            // If we just need to send a request to tern, we do it quickly
            // and then exit out.
            if (!callback) {
                worker.postMessage(data);
                return;
            }

            // Otherwise prepare a request and make sure we don't flood tern
            // with requests while it is still processing other stuff.
            data.id = msgId;
            pending[msgId] = {
                callback: callback,
                data: data
                //,timer: new Timer(true)
            };

            if ( lastRequest && lastRequest.state() === "pending" ) {
                //console.log("tern already pending", msgId);
                return;
            }

            lastRequest = $.Deferred();
            lastRequest.done(function(response) {
                //console.log("last request finsihed", response.id, pending[response.id].timer.elapsed());

                // Send the last pending request
                if ( pending[msgId] ) {
                    console.log("send pending request", msgId);
                    worker.postMessage(pending[msgId].data);
                }

                setTimeout(function() {
                    // Handle callback and clean up the pending object
                    pending[response.id].callback(response.err, response.body);
                    delete pending[response.id];
                }, 1);
            });

            worker.postMessage(data);
            msgId++;
        }


        worker.onmessage = function(e) {
            var data = e.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type == "getFile") {
                settings.getFile(data.name).done(function(text){
                    send({
                        type: "addFile",
                        text: text,
                        id: data.id
                    });
                }).fail(function(error) {
                    send({
                        type: "addFile",
                        err: String(error),
                        id: data.id
                    });
                });
            }
            else if (data.id && pending[data.id]) {
                lastRequest.resolve(data);
            }
            else if (data.type == "ready") {
                settings.ready();
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
        };


        worker.onerror = function(e) {
            for (var id in pending) {
                pending[id].callback(e);
            }

            pending = {};
        };


        return {
            worker: worker,
            clear: function() {
                send({
                    type: "clear"
                });
            },
            addFile: function(name, text) {
                send({
                    type: "addFile",
                    name: name,
                    text: text
                });
            },
            deleleteFile: function(name) {
                send({
                    type: "deleteFile",
                    name: name
                });
            },
            request: function(body, c) {
                send({
                    type: "request",
                    body: body
                }, c);
            }
        };
    }


    var ternDemo = {
        server: workerServer,
        trackChange: trackChange,
        buildRequest: function(cm, query, allowFragments){
            if(!curDoc) {
                return "";
            }

            var ternRequest = buildRequest.apply(ternDemo, arguments);
            ternRequest.query = $.extend({
                filter: true, // Results will be pretty large if we don't filter stuff out
                sort: true,
                depths: true,
                guess: true,
                origins: false,
                docs: false,
                expandWordForward: false
            }, ternRequest.query);

            return ternRequest;
        },
        setCurrentDocument: function(_curDoc){
            curDoc = _curDoc;
        },
        setServer: function(_server){
            server = _server;
        },
        setDocs: function(_docs){
            docs = _docs;
        }
    };

    return ternDemo;
});


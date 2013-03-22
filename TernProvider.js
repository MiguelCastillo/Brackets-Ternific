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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, CodeMirror */

define(["require", "exports", "module"], function (require, exports, module) {
    'use strict';

    /**
    * @constructor
    *
    * ternDocument is a set of interfaces that facilitate the interaction
    * with tern.
    */
    function ternDocuments(options) {
        this.ready = $.Deferred();
        this.docs = [];
        this.onReady = this.ready.promise().done;
    }


    ternDocuments.prototype.query = function (query) {
        throw "Must implement";
    };


    ternDocuments.prototype.findDocByProperty = function (_propName, data) {
        var index = 0, length = this.docs.length;
        for (index = 0; index < length; index++) {
            if (this.docs[index][_propName] === data) {
                return this.docs[index];
            }
        }
    };


    ternDocuments.prototype.findDocByName = function (name) {
        return this.findDocByProperty("name", name);
    };


    ternDocuments.prototype.findDocByInstance = function (doc) {
        return this.findDocByProperty("doc", doc);
    };


    ternDocuments.prototype.findDocByCM = function (cm) {
        return this.findDocByProperty("cm", cm);
    };


    ternDocuments.prototype.register = function (cm, name) {
        var _self = this;

        var docMeta = {
            name: name,
            cm: cm,
            doc: cm.getDoc(),
            changed: null,
            _trackChange: function () {
                _self.trackChange.apply(_self, arguments);
            }
        };

        this.addDoc(docMeta);
        CodeMirror.on(docMeta.doc, "change", docMeta._trackChange);
    };


    ternDocuments.prototype.unregister = function (cm) {
        var docMeta = this.findDocByCM(cm);
        CodeMirror.off(docMeta.doc, "change", docMeta._trackChange);
    };


    ternDocuments.prototype.trackChange = function (doc, change) {
        var docMeta = this.findDocByInstance(doc);

        var changed = docMeta.changed;
        if (!changed) {
            docMeta.changed = changed = {
                from: change.from.line,
                to: change.from.line
            };
        }

        var end = change.from.line + (change.text.length - 1);

        if (change.from.line < changed.to) {
            changed.to = changed.to - (change.to.line - end);
        }

        if (end >= changed.to) {
            changed.to = end + 1;
        }

        if (changed.from > change.from.line) {
            changed.from = change.from.line;
        }
    };


    ternDocuments.prototype.getFragmentAround = function (cm, start, end) {
        var minIndent = null, minLine = null, endLine, tabSize = cm.getOption("tabSize");

        for (var p = start.line - 1, min = Math.max(0, p - 50); p >= min; --p) {
            var line = cm.getLine(p), fn = line.search(/\bfunction\b/);
            if (fn < 0) {
                continue;
            }

            var indent = CodeMirror.countColumn(line, null, tabSize);
            if (minIndent != null && minIndent <= indent) {
                continue;
            }

            if (cm.getTokenAt(CodeMirror.Pos(p, fn + 1)).type != "keyword") {
                continue;
            }

            minIndent = indent;
            minLine = p;
        }

        if (minLine == null) {
            minLine = min;
        }

        var max = Math.min(cm.lastLine(), start.line + 20);
        if (minIndent == null || minIndent == CodeMirror.countColumn(cm.getLine(start.line), null, tabSize)) {
            endLine = max;
        }
        else for (endLine = start.line + 1; endLine < max; ++endLine) {
            var indent = CodeMirror.countColumn(cm.getLine(endLine), null, tabSize);
            if (indent <= minIndent) {
                break;
            }
        }

        var from = CodeMirror.Pos(minLine, 0);
        var docMeta = this.findDocByCM(cm);
        return {type: "part",
                name: docMeta.name,
                offset: cm.indexFromPos(from),
                text: cm.getRange(from, CodeMirror.Pos(endLine, 0))
        };
    }



    /**
    * Build a query that corresponds to the code mirror instance. The
    * returned object is an object with details that tern will use to
    * query the document.  The object returned also has the instance of
    * code mirror the query belongs to.  This is needed to complete the
    * full between a query and operating on the document the query of
    * done against.
    */
    ternDocuments.prototype.buildQuery = function( cm, query, allowFragments ) {
        if ( !cm ) {
            throw new TypeError("Invalid CodeMirror instance");
        }

        var startPos, endPos, offset = 0, files = [];

        // 1. Let's make sure we have a query object
        //
        if (typeof query == "string") {
            query = {
                type: query
            };
        }

        // 2. Define a range where the intellence will be applied on
        //
        if (query.end == null && query.start == null) {
            endPos = cm.getCursor("end");
            query.end = cm.indexFromPos(endPos);

            if (cm.somethingSelected()) {
                startPos = cm.getCursor("start")
                query.start = cm.indexFromPos(startPos);
            }
        }
        else {
            endPos = query.end
            query.end = cm.indexFromPos(endPos);

            if (query.start != null) {
                startPos = query.start;
                query.start = cm.indexFromPos(startPos);
            }
        }

        if ( !startPos ) {
            startPos = endPos;
        }

        var docMeta = this.findDocByCM(cm);


        // This help in the process of doing requests without having to
        // resend the whole document content again, which can be a time
        // consuming operation.
        if ( docMeta.changed ) {
            var change = docMeta.changed;

            // If the change is large enough to potentially cause a negative
            // performance impact...
            //
            var processChange = (cm.lineCount() > 100) &&
                                (allowFragments !== false) &&
                                (change.to - change.from < 100) &&
                                (change.from <= startPos.line) &&
                                (change.to > endPos.line);

            if ( processChange ) {
                var docFragment = this.getFragmentAround(cm, startPos, endPos);
                files.push( docFragment );
                query.file = "#0";
                offset = files[0].offset;

                if (query.start != null) {
                    query.start -= offset;
                }

                query.end -= offset;
            }
            else {
                files.push({type: "full",
                        name: docMeta.name,
                        text: cm.getValue()
                    });

                query.file = docMeta.name;
                docMeta.changed = null;
            }
        }
        else {
            query.file = docMeta.name;
            files.push({type: "full",
                    name: docMeta.name,
                    text: cm.getValue()
                });
        }


        return {
            data: {
                query: query,
                files: files
            },
            offset: offset,
            doc: docMeta
        };
    }



    /**
    *  Interface to operate against a local instance of tern
    */
    function localDocuments() {
        ternDocuments.apply(this, arguments);
        var _self = this;

        var ternRequire = window.require.config({
            "baseUrl": require.toUrl("./tern/"),
            "paths": {
                "acorn": "node_modules/acorn"
            },
            waitSeconds: 5
        });

        ternRequire(["tern", "plugin/requirejs/requirejs", "plugin/node/node"], function(tern) {

            //
            // Load up all the definitions that we will need to start with.
            //
            require(["text!./reserved.json", "text!./tern/defs/ecma5.json", "text!./tern/defs/browser.json", "text!./tern/defs/jquery.json",
                     "text!./tern/plugin/requirejs/requirejs.json", "text!./tern/plugin/node/node.json"],
                function( _ecma5Env, _browserEnv, _requireEnv, _jQueryEnv ) {
                    var environment = Array.prototype.slice.call(arguments, 0);
                    $.each(environment.slice(0), function(index, item){
                        environment[index] = JSON.parse(item);
                    });

                    _self._server = new tern.Server({
                        getFile: function(){
                            _self.getFile.apply(_self, arguments);
                        },
                        environment: environment,
                        async: true
                    });

                    _self.ready.resolve(_self);
            });
        });
    }


    localDocuments.prototype = new ternDocuments;
    localDocuments.prototype.constructor = localDocuments;


    localDocuments.prototype.query = function( cm, settings ) {
        var promise = $.Deferred();
        var query = this.buildQuery( cm, settings ), queryData = query.data, queryDoc = query.doc;

        this._server.request( queryData, function(error, data) {
            if (error) {
                promise.reject(error);
            }
            else {
                query.result = data;
                query.details = queryDetails(query);
                promise.resolve(data, query);
            }
        });

        return promise.promise();
    }


    localDocuments.prototype.addDoc = function (doc) {
        this.docs.push(doc);
        this._server.addFile(doc.name);
    }


    var httpCache = {};
    localDocuments.prototype.getFile = function (name, c) {
        if (/^https?:\/\//.test(name)) {
            if (httpCache[name]){
              return c(null, httpCache[name]);
            }

            $.ajax({
                "url": name,
                "contentType": "text"
            })
            .done(function(data, status) {
                httpCache[name] = data;
                c(null, data);
            })
            .fail(function(){
                c(null, "");
            });
        }
        else {
            var docMeta = this.findDocByName(name);
            return c(null, docMeta ? docMeta.doc.getValue() : "");
        }
    }



    /**
    *  Interface to operate against a remote tern server
    */
    function remoteDocuments() {
        ternDocuments.apply(this, arguments);
        var _self = this;

        setTimeout(function(){
            _self.ready.resolve(_self);
        }, 1);
    }


    remoteDocuments.prototype = new ternDocuments;
    remoteDocuments.prototype.constructor = remoteDocuments;


    remoteDocuments.prototype.ping = function (){
        return $.ajax({
            "url": "http://localhost:4943/ping",
            "type": "GET"
        })
        .promise();
    }


    remoteDocuments.prototype.query = function( cm, settings ) {
        var promise = $.Deferred();
        var query = this.buildQuery( cm, settings ), queryData = query.data, queryDoc = query.doc;

        // Send query to the server
        $.ajax({
            "url": "http://localhost:8969",
            "type": "POST",
            "contentType": "application/json; charset=utf-8",
            "data": JSON.stringify(queryData)
        })
        .done(function(data){
            console.log(data);
            query.result = data;
            query.details = queryDetails(query);
            promise.resolve(data, query);
        })
        .fail(function(error){
            console.log(error);
            promise.reject(error);
        });

        return promise.promise();
    }


    remoteDocuments.prototype.addDoc = function(doc) {
        this.docs.push(doc);
    }



    /**
    * Gets more details about the query itself.  One of the things it
    * provides is the text for the query...  E.g. What is tern searching
    * for when we are asking for feedback.
    */
    function queryDetails( query ) {
        if ( query ) {
            var cm = query.doc.cm, result = query.result;
            var start = cm.posFromIndex(result.start + query.offset), end = cm.posFromIndex(result.end + query.offset);
            var queryText = cm.getDoc().getRange(start, end);

            var details = {
                text: queryText,
                start: start,
                end: end
            };

            return details;
        }
    }



    exports.TernDocuments = {
        remote: remoteDocuments,
        local: localDocuments
    }


    return {
        remote: remoteDocuments,
        local: localDocuments
    }

});


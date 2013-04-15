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

define(function (require, exports, module) {
    "use strict";

    var TernDemo   = require("TernDemo"),
        fileLoader = require("FileLoader");

    var ternRequire = window.require.config({
        "baseUrl": require.toUrl("./tern/"),
        "paths": {
            "acorn": "node_modules/acorn"
        },
        waitSeconds: 5
    });


    /**
    * @constructor
    *
    * ternDocument is a set of interfaces that facilitate the interaction
    * with tern.
    */
    function TernProvider(options) {
        var _self = this;
        _self.ready = $.Deferred();
        _self.docs = [];
        _self.currentDocument = null;
        _self.onReady = _self.ready.promise().done;
    }


    TernProvider.prototype.query = function (query) {
        throw "Must implement";
    };


    TernProvider.prototype.findDocByProperty = function (_propName, data) {
        var index = 0, length = this.docs.length;
        for (index = 0; index < length; index++) {
            if (this.docs[index][_propName] === data) {
                return this.docs[index];
            }
        }
    };


    TernProvider.prototype.findDocByName = function (name) {
        return this.findDocByProperty("name", name);
    };


    TernProvider.prototype.findDocByInstance = function (doc) {
        return this.findDocByProperty("doc", doc);
    };


    TernProvider.prototype.findDocByCM = function (cm) {
        return this.findDocByProperty("cm", cm);
    };


    TernProvider.prototype.register = function (cm, name) {
        var _self = this;
        var docMeta = this.findDocByName(name);

        //
        // If the document has not been registered, then we set one up
        //
        if (!docMeta) {
            docMeta = {
                name: name,
                cm: cm,
                doc: cm.getDoc(),
                changed: null
            };

            this.addDoc(docMeta);
        }
        //
        // If the document exists but has not been registered, then we
        // update the properties that need updating and setup up a change
        // tracking callback.
        // This particular case happens when a document is loaded as a
        // dependency as resolved by tern, and later that partial document
        // is actually open needing registration.
        //
        else {
            docMeta.cm = cm;
            docMeta.doc = cm.getDoc();
            docMeta.changed = null;
        }

        _self.currentDocument = docMeta;
        TernDemo.setCurrentDocument(docMeta);
        TernDemo.setDocs(_self.docs);
        TernDemo.setServer(_self._server);

        docMeta._trackChange = function (cm1, change) {
            TernDemo.trackChange(docMeta.doc, change);
        };

        CodeMirror.on(docMeta.doc, "change", docMeta._trackChange);
        return docMeta;
    };


    TernProvider.prototype.unregister = function (cm) {
        var docMeta = this.findDocByCM(cm);
        if (docMeta) {
            delete docMeta.cm;

            if (docMeta.doc && docMeta._trackChange) {
                CodeMirror.off(docMeta.doc, "change", docMeta._trackChange);
            }
        }
    };



    /**
    * Build a query that corresponds to the code mirror instance. The
    * returned object is an object with details that tern will use to
    * query the document.  The object returned also has the instance of
    * code mirror the query belongs to.  This is needed to complete the
    * full between a query and operating on the document the query of
    * done against.
    */
    TernProvider.prototype.buildQuery = function( cm, query, allowFragments ) {
        var _query = TernDemo.buildRequest(cm, query, allowFragments);
        _query.data = _query.request;
        _query.doc = this.findDocByCM(cm);
        delete _query.request;
        return _query;
    };



    /**
    *  Interface to operate against a local instance of tern
    */
    function LocalProvider() {
        var _self = this;
        TernProvider.apply(_self, arguments);

        ternRequire(["lib/tern", "plugin/requirejs", "plugin/node"], function(tern) {

            //
            // Load up all the definitions that we will need to start with.
            //
            require(["text!./reserved.json", "text!./tern/defs/ecma5.json", "text!./tern/defs/browser.json", "text!./tern/defs/jquery.json"], function() {
                var defs = Array.prototype.slice.call(arguments, 0);
                $.each(defs.slice(0), function(index, item){
                    defs[index] = JSON.parse(item);
                });

                _self._server = new tern.Server({
                    getFile: function(){
                        _self.getFile.apply(_self, arguments);
                    },
                    defs: defs,
                    debug: true,
                    async: true,
                    plugins: {
                        requirejs: {
                        }
                    }
                });

                _self.ready.resolve(_self);
            });
        });
    }


    LocalProvider.prototype = new TernProvider;
    LocalProvider.prototype.constructor = LocalProvider;


    LocalProvider.prototype.query = function( cm, settings ) {
        var _self = this;
        var promise = $.Deferred();

        // Throttle the query request so that doc changes enough time to be processed
        setTimeout(function(){
            var query = _self.buildQuery( cm, settings ),
                queryData = query.data;

            _self._server.request( queryData, function(error, data) {
                if (error) {
                    promise.reject(error);
                }
                else {
                    query.result = data;
                    promise.resolve(data, query);
                }
            });
        }, 1);

        return promise.promise();
    };


    LocalProvider.prototype.addDoc = function (doc) {
        this.docs.push(doc);
        this._server.addFile(doc.name, doc.doc.getValue());
    };


    LocalProvider.prototype.getFile = function (name, c) {
        var _self = this;
        var docMeta = this.findDocByName(name);

        if ( docMeta ) {
            c(null, docMeta.doc.getValue());
        }
        else {
            fileLoader.loadFile(name, _self.currentDocument.name)
                .done(function(data) {
                    var docMeta = {
                        name: data.fullPath,
                        doc: new CodeMirror.Doc(data.text, "javascript"),
                        changed: null
                    };

                    _self.addDoc(docMeta);
                    c(null, data.text);
                })
                .fail(function(error){
                    c(error, null);
                });
        }
    };


    /**
    *  Interface to operate against a remote tern server
    */
    function RemoteProvider() {
        var _self = this;
        TernProvider.apply(_self, arguments);

        ternRequire(['text!.tern-port'], function(ternport) {
            _self.port = ternport;
            _self.ping().done(function(){
                console.log("Tern Remote Server is ready");
                _self.ready.resolve(_self);
            }).fail(function(){
                throw "Tern Server is not running";
            });
        });
    }


    RemoteProvider.prototype = new TernProvider;
    RemoteProvider.prototype.constructor = RemoteProvider;


    RemoteProvider.prototype.ping = function (){
        return $.ajax({
            "url": "http://localhost:" + this.port + "/ping",
            "type": "GET"
        })
        .promise();
    };


    RemoteProvider.prototype.query = function( cm, settings ) {
        var promise = $.Deferred();
        var query = this.buildQuery( cm, settings ),
            queryData = query.data;

        // Send query to the server
        $.ajax({
            "url": "http://localhost:" + this.port,
            "type": "POST",
            "contentType": "application/json; charset=utf-8",
            "data": JSON.stringify(queryData)
        })
        .done(function(data){
            query.result = data;
            promise.resolve(data, query);
        })
        .fail(function(error){
            console.log(error);
            promise.reject(error);
        });

        return promise.promise();
    };


    RemoteProvider.prototype.addDoc = function(doc) {
        this.docs.push(doc);
    };


    exports.TernProvider = {
        Remote: RemoteProvider,
        Local: LocalProvider
    };


    return exports.TernProvider;

});


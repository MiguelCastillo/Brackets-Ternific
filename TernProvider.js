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

    var spromise   = require("libs/js/spromise");
    var TernDemo   = require("TernDemo"),
        fileLoader = require("FileLoader");

    /**
    * @constructor
    *
    * TernProvider is a set of interfaces that facilitate the interaction
    * with tern.
    */
    function TernProvider(options) {
        var _self = this;
        _self.ready = spromise.defer();
        _self.docs = [];
        _self.currentDocument = null;
        _self.onReady = _self.ready.promise.done;
    }


    TernProvider.prototype.clear = function() {
        var _self = this;
        _self.docs = [];

        if (_self._server) {
            _self._server.clear();
        }
    };


    TernProvider.prototype.query = function (/*query*/) {
        throw new TypeError("Must implement");
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
        var docMeta = _self.findDocByName(name);

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

            _self.docs.push(docMeta);
            _self._server.addFile(docMeta.name, docMeta.doc.getValue());
        }
        //
        // If the document exists but has not been registered, then we
        // update the properties that need updating and setup up a change
        // tracking callback.
        // This particular case happens when a document is loaded as a
        // dependency when resolved by tern, and later that document is
        // opened in brackets, which will need registration for tracking
        // changes.
        //
        // Only documents that are open in brackets and currently in focus
        // are the ones that should be tracked for changes.  Currently,
        // if a document isn't open in brackets then we are going to assume
        // that it is not being changed. I'm not worried about external
        // editors opening documents and modifying them outside of the
        // current instance of brackets.
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
    * Will read file from disk or remote http file, then will load the content
    * into tern's server.
    *
    * * This will bypass the list of cached documents.
    */
    TernProvider.prototype.addFile = function (name, root) {
        var _self = this;

        return fileLoader.fileMeta(name, root || _self.currentDocument.name || "").done(function(data) {
            var docMeta = {
                name: name, //data.fullPath,
                doc: new CodeMirror.Doc(data.text, "javascript"),
                changed: null
            };

            _self.docs.push(docMeta);
            _self._server.addFile(docMeta.name, docMeta.doc.getValue());
        });
    };


    /**
    *  Interface to operate against a local instance of tern
    */
    function LocalProvider() {
        TernProvider.apply(this, arguments);

        var _self = this;
        var _defs = [
            "text!./reserved.json",
            "text!./tern/defs/browser.json",
            "text!./tern/defs/chai.json",
            "text!./tern/defs/ecma5.json",
            "text!./tern/defs/browser.json",
            "text!./tern/defs/jquery.json",
            "text!./tern/defs/underscore.json"
        ];

        //
        // Load up all the definitions that we will need to start with.
        //
        require(_defs, function() {
            var defs = $.map(arguments, function(item) {
                return JSON.parse(item);
            });

            _self._server = TernDemo.server({
                getFile: function() {
                    return _self.getFile.apply(_self, arguments);
                },
                ready:_self.ready.resolve,
                defs: defs,
                debug: false,
                async: true,
                plugins: {requirejs: {}, node: {}}
            });
        });
    }


    LocalProvider.prototype = new TernProvider();
    LocalProvider.prototype.constructor = LocalProvider;


    LocalProvider.prototype.query = function( cm, settings, allowFragments ) {
        var _self = this;
        var deferred = spromise.defer();

        // Throttle the query request so that doc changes have enough time to be processed
        setTimeout(function(){
            var query = TernDemo.buildRequest(cm, settings, allowFragments);

            _self._server.request( query, function(error, data) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    query.doc = _self.findDocByCM(cm);
                    deferred.resolve(data, query);
                }
            });
        }, 1);

        return deferred.promise;
    };


    /**
    * Gets a file from the list of cached documents. If the document isn't cached,
    * it will get loaded either from local drive or remote via http.  This newly
    * retrieved document will be added to the list of cached documents.
    */
    LocalProvider.prototype.getFile = function (name, root) {
        var _self = this;
        var docMeta = _self.findDocByName(name);
        var deferred = spromise.defer();

        if ( docMeta ) {
            deferred.resolve(docMeta.doc.getValue());
        }
        else {
            fileLoader.fileMeta(name, root || _self.currentDocument.name || "")
                .done(function(data) {
                    var docMeta = {
                        name: name, //data.fullPath,
                        doc: new CodeMirror.Doc(data.text, "javascript"),
                        changed: null
                    };

                    _self.docs.push(docMeta);
                    deferred.resolve(data.text);
                })
                .fail(function(error){
                    deferred.reject(error);
                });
        }

        return deferred.promise;
    };


    /**
    *  Interface to operate against a remote tern server
    */
    function RemoteProvider() {
        var _self = this;
        TernProvider.apply(_self, arguments);

        require(['text!./tern/.tern-port'], function(ternport) {
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


    RemoteProvider.prototype.query = function( cm, settings, allowFragments ) {
        var deferred = spromise.defer();
        var query = TernDemo.buildRequest(cm, settings, allowFragments);

        // Send query to the server
        $.ajax({
            "url": "http://localhost:" + this.port,
            "type": "POST",
            "contentType": "application/json; charset=utf-8",
            "data": JSON.stringify(query)
        })
        .done(function(data){
            deferred.resolve(data, query);
        })
        .fail(function(error){
            deferred.reject(error);
        });

        return deferred.promise;
    };


    return {
        Remote: RemoteProvider,
        Local: LocalProvider
    };

});


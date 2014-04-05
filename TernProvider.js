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

    var spromise     = require("libs/js/spromise");
    var localServer  = require("LocalServer"),
        remoteServer = require("RemoteServer"),
        fileLoader   = require("FileLoader");

    /**
    * @constructor
    *
    * TernProvider is a set of interfaces that facilitate the interaction
    * with tern.
    */
    function TernProvider() {
        var _self = this;
        _self.docs = [];
        _self.currentDocument = null;
    }


    TernProvider.prototype.clear = function() {
        var _self = this;
        _self.docs = [];

        if (_self.tern) {
            _self.tern.clear();
        }
    };


    TernProvider.prototype.query = function (cm, settings, allowFragments) {
        var _self = this;
        return _self.tern.query( cm, settings, allowFragments )
            .done(function(data, query) {
                query.doc = _self.findDocByCM(cm);
            });
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


    TernProvider.prototype.register = function (cm, file) {
        var _self = this;
        var name = file.fullPath;
        var dir  = file.parentPath;
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
            _self.tern.addFile(docMeta.name, docMeta.doc.getValue());
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
        _self.tern.setCurrentDocument(docMeta);
        _self.tern.setDocs(_self.docs);
        _self.tern.loadSettings(cm, dir);

        docMeta._trackChange = function (cm1, change) {
            _self.tern.trackChange(docMeta.doc, change);
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
            _self.tern.addFile(docMeta.name, docMeta.doc.getValue());
        });
    };


    /**
    *  Interface to operate against a local instance of tern
    */
    function LocalProvider() {
        TernProvider.apply(this, arguments);
        var _self = this;
        _self.onReady = localServer(this).then(function(tern) {
            _self.tern = tern;
            return _self;
        }).done;
    }


    LocalProvider.prototype = new TernProvider();
    LocalProvider.prototype.constructor = LocalProvider;


    /**
    * Gets a file from the list of cached documents. If the document isn't cached,
    * it will get loaded either from local drive or remote via http.  This newly
    * retrieved document will be added to the list of cached documents.
    */
    LocalProvider.prototype.getFile = function (name, root) {
        var _self = this;
        var docMeta = _self.findDocByName(name);

        if ( docMeta ) {
            return spromise.resolved(docMeta.doc.getValue());
        }

        return fileLoader.fileMeta(name, root || _self.currentDocument.name || "")
                .then(function(data) {
                    var docMeta = {
                        name: name, //data.fullPath,
                        doc: new CodeMirror.Doc(data.text, "javascript"),
                        changed: null
                    };

                    _self.docs.push(docMeta);
                    return data.text;
                });
    };


    /**
    *  Interface to operate against a remote tern server
    */
    function RemoteProvider() {
        TernProvider.apply(this, arguments);
        var _self = this;
        _self.onReady = remoteServer(this).then(function(tern) {
            _self.tern = tern;
            return _self;
        }).done;
    }


    RemoteProvider.prototype = new TernProvider();
    RemoteProvider.prototype.constructor = RemoteProvider;


    return {
        Remote: RemoteProvider,
        Local: LocalProvider
    };

});


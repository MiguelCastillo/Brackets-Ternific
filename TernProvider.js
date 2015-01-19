/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var _ = brackets.getModule("thirdparty/lodash");
    var CodeMirror   = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        Promise      = require("libs/js/spromise"),
        localServer  = require("LocalServer"),
        fileLoader   = require("FileLoader");


    /**
     * @constructor
     *
     */
    function TernProvider() {
        this.documents = [];
        this.currentDocument = null;
    }


    TernProvider.prototype.clear = function() {
        this.documents = [];
        if (this.tern) {
            this.tern.clear();
        }
    };


    TernProvider.prototype.query = function(cm, settings, allowFragments) {
        return this.tern.query(cm, settings, allowFragments);
    };


    TernProvider.prototype.registerDocument = function(cm, file) {
        var _self   = this,
            name    = file.name,
            dir     = file.parentPath,
            docMeta = this.findDocumentByName(name);

        //
        // If the document has not been registered, then we set one up
        //
        if (!docMeta) {
            docMeta = {
                file: file,
                name: name,
                doc: cm.getDoc(),
                changed: null
            };

            this.documents.push(docMeta);
            this.tern.addFile(docMeta.name, docMeta.doc.getValue());
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
            docMeta.doc     = cm.getDoc();
            docMeta.changed = null;
        }

        this.cm = cm;
        this.currentDocument = docMeta;
        this.tern.setDocuments(this.documents);
        this.tern.setCurrentDocument(docMeta);
        this.tern.loadSettings(dir);

        docMeta._trackChange = function(cm1, change) {
            _self.tern.trackChange(docMeta.doc, change);
        };

        CodeMirror.on(docMeta.doc, "change", docMeta._trackChange);
        return docMeta;
    };


    TernProvider.prototype.unregisterDocument = function(cm) {
        var docMeta = this.findDocumentByInstance(cm.getDoc());
        if (docMeta && docMeta.doc && docMeta._trackChange) {
            CodeMirror.off(docMeta.doc, "change", docMeta._trackChange);
        }
    };


    TernProvider.prototype.findDocumentByName = function(name) {
        return _.find(this.documents, {"name": name});
    };


    TernProvider.prototype.findDocumentByInstance = function(doc) {
        return _.find(this.documents, {"doc": doc});
    };


    /**
     * Will read file from disk or remote http file, then will load the content
     * into tern's server.
     *
     * This will bypass the list of cached documents.
     */
    TernProvider.prototype.addFile = function(name) {
        var _self = this;

        return fileLoader.readFile(name, this.currentDocument.file.parentPath)
            .done(function fileRead(data) {
                var docMeta = {
                    file: data.file,
                    name: name, //data.fullPath,
                    doc: new CodeMirror.Doc(data.content, "javascript"),
                    changed: null
                };

                _self.documents.push(docMeta);
                _self.tern.addFile(docMeta.name, docMeta.doc.getValue());
            });
    };


    /**
     * Gets a file from the list of cached documents. If the document isn't cached,
     * it will get loaded either from local drive or remote via http.  This newly
     * retrieved document will be added to the list of cached documents.
     */
    TernProvider.prototype.getFile = function(name) {
        var _self = this;
        var docMeta = this.findDocumentByName(name);

        if (docMeta) {
            return Promise.resolve({
                docMeta: docMeta,
                content: docMeta.doc.getValue()
            });
        }

        return fileLoader.readFile(name, this.currentDocument.file.parentPath)
            .then(function fileRead(data) {
                var docMeta = {
                    file: data.file,
                    name: name, //data.fullPath,
                    doc: new CodeMirror.Doc(data.content, "javascript"),
                    changed: null
                };

                _self.documents.push(docMeta);
                return {
                    docMeta: docMeta,
                    content: data.content
                };
            });
    };


    /**
     *  Interface to operate against a local instance of tern
     */
    function LocalProvider() {
        TernProvider.apply(this, arguments);

        var _self = this;
        var deferred = localServer.factory(this)
            .then(function localProviderReady(tern) {
                _self.tern = tern;
                return _self;
            });

        this.onReady = deferred.promise.done.bind(deferred);
    }


    LocalProvider.prototype = new TernProvider();
    LocalProvider.prototype.constructor = LocalProvider;


    /**
     * Convenience method to create providers
     */
    function factory() {
        return (new LocalProvider());
    }


    return {
        factory: factory
    };
});


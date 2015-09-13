/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var CodeMirror  = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
    var fileUtils   = brackets.getModule("file/FileUtils");
    var logger      = require("Logger").factory("TernProvider");
    var Promise     = require("node_modules/spromise/dist/spromise.min");
    var reportError = require("reportError");
    var fileReader  = require("fileReader");
    var localServer = require("LocalServer");
    var Repository  = require("Repository");


    /**
     * @constructor
     */
    function TernProvider() {
        this.documentRepository = new Repository();
        this.currentDocument = null;
    }


    TernProvider.prototype.query = function(cm, settings, allowFragments) {
        return this.tern.query(cm, settings, allowFragments);
    };


    TernProvider.prototype.registerDocument = function(cm, file) {
        var _self   = this;
        var docMeta = documentMetaFactory(file.name, cm.getDoc()).create({file: file});

        this.tern.clear();

        this.currentDocument = docMeta;
        providerExtensions(this).addDocument(docMeta);
        serverExtensions(this).addDocument(docMeta);

        this.tern.setDocuments(this.documentRepository.items());
        this.tern.setCurrentDocument(docMeta);
        this.tern.loadSettings(file.parentPath);

        docMeta._trackChange = function(cm, change) {
            _self.tern.trackChange(docMeta.doc, change);
        };

        CodeMirror.on(docMeta.doc, "change", docMeta._trackChange);
    };


    TernProvider.prototype.unregisterDocument = function(cm) {
        var docMeta = this.documentRepository.find({"doc": cm.getDoc()});

        if (docMeta) {
            if (docMeta.doc && docMeta._trackChange) {
                CodeMirror.off(docMeta.doc, "change", docMeta._trackChange);
                docMeta._trackChange = null;
            }

            this.documentRepository.remove(docMeta);
        }

        //
        // TODO: Provide a way to clear all loaded documents. Useful when
        // switching projects.
        //
    };


    /**
     * Will read file from storage and then pushes the content to the tern server.
     */
    TernProvider.prototype.loadDocument = function(filePath) {
        logger.log("loadDocument", filePath);

        // Get the extension and make sure we have an extension before loading the file.
        var extension = fileUtils.getFileExtension(filePath);

        if (!extension) {
            filePath += ".js";
        }

        //
        // TODO: Figure out a way to pass in full paths.  This would work
        // well only if name resolution of modules was properly done with
        // something like browser-resolve or amd-resolve.
        //
        // For now we will just do a simple heuristic based on whether the
        // file is relative or absolute.
        //
        filePath = fileReader.isAbsolute(filePath) ? filePath : (this.currentDocument.file.parentPath + filePath);

        return fileReader
            .fromDirectory(filePath)
            .then(_read, reportError)
            .then(documentMetaFactory(filePath).create, reportError)
            .then(providerExtensions(this).addDocument, reportError);
            //.then(serverExtensions(this).addDocument, reportError);
    };


    /**
     * Get a document.  It will first look in the repository, otherwise it loads it
     * from storage.
     */
    TernProvider.prototype.getDocument = function(name) {
        var docMeta = this.documentRepository.getByName(name);

        if (docMeta) {
            return Promise.resolve(docMeta);
        }

        return this.loadDocument(name);
    };


    function _read(stream) {
        return stream.read();
    }


    function documentMetaFactory(name, doc) {
        function create(data) {
            return {
                file: data.file,
                name: name, //data.fullPath,
                doc: doc || (new CodeMirror.Doc(data.content, "javascript")),
                changed: null
            };
        }

        return {
            create: create
        };
    }


    function providerExtensions(provider) {
        /**
         * Function that adds a document to the document repository
         *
         * @param {object} docMeta - Document meta object with information about
         *  the document.
         */
        function addDocument(docMeta) {
            if (!provider.documentRepository.getByName(docMeta.name)) {
                provider.documentRepository.add(docMeta);
            }

            return docMeta;
        }

        /**
         * Function that reads a document from storage
         */
        function getDocument(name) {
            return provider.getDocument(name);
        }

        return {
            addDocument: addDocument,
            getDocument: getDocument
        };
    }


    function serverExtensions(provider) {
        /**
         * Function that adds a document to the tern server.
         *
         * @param {object} docMeta - Document meta object with information about
         *  the document.
         */
        function addDocument(docMeta) {
            provider.tern.addFile(docMeta.name, docMeta.doc.getValue());
            return docMeta;
        }

        return {
            addDocument: addDocument
        };
    }


    /**
     *  Interface to operate against a local instance of tern
     */
    function LocalProvider() {
        TernProvider.apply(this, arguments);

        var _self = this;

        function setServer(tern) {
            _self.tern = tern;
            return _self;
        }

        var deferred = localServer
          .create(providerExtensions(this))
          .then(setServer);

        this.onReady = deferred.promise.done.bind(deferred);
    }


    LocalProvider.prototype = new TernProvider();
    LocalProvider.prototype.constructor = LocalProvider;


    /**
     * Factory method to create providers
     */
    function createProvider() {
        return (new LocalProvider());
    }


    return {
        create: createProvider
    };
});

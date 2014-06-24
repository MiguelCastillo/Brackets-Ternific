/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


define(function (require, exports, module) {
    'use strict';

    var FileSystem = brackets.getModule("filesystem/FileSystem");

    var spromise       = require("libs/js/spromise");
    var TernProvider   = require("TernProvider"),
        TernHints      = require("TernHints"),
        TernReferences = require("TernReferences"),
        TernTypes      = require("TernTypes");


    /**
    *  Controls the interaction between codemirror and tern
    */
    function TernManager () {
        var deferred = spromise.defer();

//        var ternProvider = new TernProvider.Remote();
        var ternProvider = new TernProvider.Local();
        ternProvider.onReady(deferred.resolve);

        this.ternHints      = new TernHints(ternProvider);
        this.ternReferences = new TernReferences(ternProvider);
        this.ternTypes      = new TernTypes(ternProvider);
        this.ternProvider   = ternProvider;
        this.onReady        = deferred.promise.done;
        this.currentPath    = "";
    }


    TernManager.prototype.clear = function () {
        var _self = this;
        _self.ternProvider.clear();
    };


    /**
    * Register a document with tern
    *
    * @param cm is a code mirror instance we will be operating on.
    * We register listeners for keybinding and we also extract the
    * document content and feed it to tern.
    *
    * @param file is just a file object.  The only thing we currenly
    * use is the fullPath, which also includes the file name.  We
    * map the code mirror instance to that file name.
    *
    */
    TernManager.prototype.register = function (cm, file) {
        if (!cm) {
            throw new TypeError("CodeMirror instance must be valid");
        }

        if (!file) {
            throw new TypeError("File object must be valid");
        }

        var _self = this;

        // First things first.  Unregister the current document before
        // registering the new one.
        _self.unregister();

        var keyMap = {
            "name": "ternBindings",
            "Ctrl-I": function(){
                _self.ternTypes.findType(cm);
            },/*
            "Alt-.": function() {
                //_self.ternReferences.jumpToDef
            },
            "Alt-,": function() {
                //_self.ternReferences.jumpBack
            },*/
            "Ctrl-R": function() {
                _self.ternReferences.findReferences(cm);
            }
        };

        _self._cm = cm;
        cm._ternBindings = _self;
        cm.addKeyMap(keyMap);

        //
        // If we are working on an entirely different path or the new path
        // is not a subfolder of the currentPath, then we will clear all tern
        // stuff because we are most likely working in a different context.
        //
        if (_self.currentPath !== file.parentPath && _self.currentPath.indexOf(file.parentPath) !== 0) {
            _self.currentPath = file.parentPath;
            _self.ternProvider.clear();
            _self.ternProvider.register(cm, file);

        }
        else {
            _self.ternProvider.register(cm, file);
        }
    };


    /**
    * Unregister a previously registered document.  We simply unbind
    * any keybindings we have registered
    */
    TernManager.prototype.unregister = function () {
        var _self = this,
            cm = _self._cm;
        if (!cm || !cm._ternBindings) {
            return;
        }

        cm.removeKeyMap("ternBindings");
        _self.ternProvider.unregister(cm);
        delete cm._ternBindings;
        delete _self._cm;
    };


    function loadFiles (path) {
        var result = spromise.defer();

        function endsWith(_string, suffix) {
            return _string.indexOf(suffix, _string.length - suffix.length) !== -1;
        }

        FileSystem.getDirectoryForPath(path).getContents(function(err, entries) {
            if ( err ) {
                result.reject(err);
            }

            var i, files = [];
            
            for (i in entries) {
                if (entries[i].isFile && endsWith(entries[i].name, ".js")) {
                    files.push(entries[i].name);
                }
            }

            result.resolve({
                files: files,
                path: path
            });
        });

        return result.promise;
    }


    return TernManager;

});


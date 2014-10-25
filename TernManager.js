/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var spromise       = require("libs/js/spromise");
    var TernProvider   = require("TernProvider"),
        TernHints      = require("TernHints"),
        TernReferences = require("TernReferences"),
        TernTypes      = require("TernTypes");


    /**
     *  Controls the interaction between codemirror and tern
     */
    function TernManager (ternProvider) {
        var deferred = spromise.defer();

        if (ternProvider === "server") {
            ternProvider = new TernProvider.Remote();
        }
        else {
            ternProvider = new TernProvider.Local();
        }

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


    TernManager.prototype.registerKeyBindings = function (cm) {
        var _self = this;

        var keyMap = {
            "name": "ternBindings",
            "Ctrl-I": function(){
                _self.ternTypes.findType(cm);
            },
            "Alt-.": function() {
                //_self.ternReferences.jumpToDef
            },
            "Alt-,": function() {
                //_self.ternReferences.jumpBack
            },
            "Ctrl-R": function() {
                _self.ternReferences.getReferences(cm);
            }
        };

        cm._ternBindings = _self;
        cm.addKeyMap(keyMap);
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
    TernManager.prototype.registerDocument = function (cm, file) {
        if (!cm) {
            throw new TypeError("CodeMirror instance must be valid");
        }

        if (!file) {
            throw new TypeError("File object must be valid");
        }

        var _self = this;

        // Unregister keybindings and current document
        if (_self._cm) {
            if (_self._cm._ternBindings === _self) {
                _self._cm.removeKeyMap("ternBindings");
            }

            _self.ternProvider.unregisterDocument(_self._cm);
        }


        //
        // If we are working on an entirely different path or the new path
        // is not a subfolder of the currentPath, then we will clear all tern
        // stuff because we are most likely working in a different context.
        //
        if (_self.currentPath !== file.parentPath && _self.currentPath.indexOf(file.parentPath) !== 0) {
            _self.currentPath = file.parentPath;
            _self.ternProvider.clear();
        }

        _self.registerKeyBindings(cm);
        _self.ternProvider.registerDocument(cm, file);
        _self._cm = cm;
    };


    return TernManager;

});


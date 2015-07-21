/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var CodeMirror     = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        Promise        = require("libs/js/spromise"),
        TernProvider   = require("TernProvider"),
        TernHints      = require("TernHints"),
        TernReferences = require("TernReferences"),
        TernTypes      = require("TernTypes");


    /**
     *  Controls the interaction between codemirror and tern
     */
    function TernManager() {
        var deferred = Promise.defer();

        this.ternProvider = TernProvider.factory();
        this.ternProvider.onReady(deferred.resolve);

        this.ternHints      = new TernHints(this.ternProvider);
        this.ternReferences = new TernReferences(this.ternProvider);
        this.ternTypes      = new TernTypes(this.ternProvider);
        this.onReady        = deferred.promise.done.bind(deferred);
    }


    TernManager.prototype.registerKeyBindings = function(cm) {
        var _self = this;

        var keyMap = {
            "name": "ternificBindings",
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

        cm._ternificBindings = this;
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
    TernManager.prototype.registerDocument = function(cm, file) {
        if ((cm instanceof(CodeMirror)) === false) {
            throw new TypeError("Must provide an instance of CodeMirror");
        }

        if ((typeof(file) === "object") === false) {
            throw new TypeError("Must provide a File object");
        }

        // Unregister keybindings and current document
        if (this._cm) {
            if (this._cm._ternificBindings === this) {
                this._cm.removeKeyMap("ternificBindings");
            }

            this.ternProvider.unregisterDocument(this._cm);
        }

        this.registerKeyBindings(cm);
        this.ternProvider.registerDocument(cm, file);
        this._cm = cm;
    };


    return TernManager;
});

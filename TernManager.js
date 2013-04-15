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
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';

    var TernProvider   = require("TernProvider"),
        TernHints      = require("TernHints"),
        TernReferences = require("TernReferences"),
        TernTypes      = require("TernTypes");

    var _ternProvider = null,
        _cm = null;


    /**
    *  Controls the interaction between codemirror and tern
    */
    var ternManager = (function () {
        var onReady = $.Deferred();

        //_ternProvider = new TernProvider.Remote();
        _ternProvider = new TernProvider.Local();
        _ternProvider.onReady(onReady.resolve);

        return {
            ternHints: new TernHints(_ternProvider),
            ternReferences: new TernReferences(_ternProvider),
            ternTypes: new TernTypes(_ternProvider),
			ternProvider: _ternProvider,
            onReady: onReady.promise().done
        };

    })();


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
    ternManager.register = function (cm, file) {
        if (!cm) {
            throw new TypeError("CodeMirror instance must be valid");
        }

        if (!file) {
            throw new TypeError("File object must be valid");
        }

        // Unregister the current code mirror instance.
        ternManager.unregister(_cm);

        _cm = cm;
        _cm._ternBindings = ternManager;

        var keyMap = {
            "name": "ternBindings",
            "Ctrl-I": function(){
                ternManager.ternTypes.findType(_cm);
            },
            "Alt-.": function() {
                //ternManager.jumpToDef
            },
            "Alt-,": function() {
                //ternManager.jumpBack
            },
            "Ctrl-R": function() {
                ternManager.ternReferences.findReferences(_cm);
            }
        };

        // Register key events
        _cm.addKeyMap(keyMap);
        _ternProvider.register(cm, file.fullPath);
    };


    /**
    * Unregister a previously registered document.  We simply unbind
    * any keybindings we have registered
    */
    ternManager.unregister = function (cm) {
        if (!cm || !cm._ternBindings) {
            return;
        }

        cm.removeKeyMap("ternBindings");
        delete cm._ternBindings;
        _ternProvider.unregister(cm);
    };


    exports.ternManager = ternManager;
    return ternManager;

});


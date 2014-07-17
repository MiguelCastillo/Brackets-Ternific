/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    var EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        CodeHintManager = brackets.getModule("editor/CodeHintManager");

    var HintProvider = require('HintProvider'),
        TernManager  = require('TernManager');

    var jsHints;
    var _ternManager;


    ExtensionUtils.loadStyleSheet(module, "style/main.css");
    ExtensionUtils.loadStyleSheet(module, "style/hintsMenu.css");
    ExtensionUtils.loadStyleSheet(module, "style/ternSettings.css");

    _ternManager = new TernManager();
    _ternManager.onReady(function () {
        /*
         * Handle the activeEditorChange event fired by EditorManager.
         * Uninstalls the change listener on the previous editor
         * and installs a change listener on the new editor.
         *
         * @param {Event} event - editor change event (ignored)
         * @param {Editor} current - the new current editor context
         * @param {Editor} previous - the previous editor context
         */
        function handleActiveEditorChange(event, current, previous) {
            if (current) {
                _ternManager.register(current._codeMirror, current.document.file);
            }
        }

        // install change listener as the active editor changes
        $(EditorManager).on("activeEditorChange.ternific", handleActiveEditorChange);

        // immediately install the current editor
        handleActiveEditorChange(null, EditorManager.getActiveEditor(), null);

        jsHints = new HintProvider(_ternManager);
        CodeHintManager.registerHintProvider(jsHints, ["javascript"], 1);
    });
});

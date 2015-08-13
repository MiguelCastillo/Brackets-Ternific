/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var DocumentManager = brackets.getModule("document/DocumentManager");
    var MainViewManager = brackets.getModule("view/MainViewManager");
    var ProjectManager  = brackets.getModule("project/ProjectManager");
    var EventDispatcher = brackets.getModule("utils/EventDispatcher");
    var Promise         = require("node_modules/spromise/dist/spromise.min");


    /**
     * Provider to tind references of a variable/property
     *
     * @param {TernProvider} ternProvider instance of the tern provider
     */
    function TernReferences(ternProvider) {
        var _self = this;
        this.ternProvider = ternProvider;
        this._cm = null;
        this._token = null;
        this._matches = null;
        this.events = {};

        EventDispatcher.makeEventDispatcher(this.events);

        MainViewManager
            .on("currentDocumentChange", function(evt, currentDocument) {
                _self.events.trigger("documentChange", currentDocument);
            });

        DocumentManager
            .on("pathDeleted", function(/*evt*/) {
                _self.events.trigger("documentChange");
            })
            .on("documentRefreshed", function(/*evt*/) {
                _self.events.trigger("documentChange");
            })
            .on("dirtyFlagChange", function(evt, doc) {
                if (doc.isDirty) {
                    _self.events.trigger("documentChange");
                }
            });

        ProjectManager
            .on("beforeProjectClose", function () {
                _self.events.trigger("documentChange");
            });
    }


    /**
     * Gets all references of whatever the editor cursor is located
     *
     * @param   {CodeMirror} cm CodeMirror instance to initiate the processing from.  This is where the
     *  editor cursor is extracted from
     * @returns {Promise} Promise that will resolved with the references sorted by file
     */
    TernReferences.prototype.getReferences = function(cm) {
        cm = cm || this.cm;
        this._cm = cm;
        this._token = null;

        if (!cm) {
            return Promise.reject("Invalid CodeMirror instance");
        }

        this._token = cm.getTokenAt(cm.getCursor());
        if (!this._token.string) {
            this.events.trigger("references", this.ternProvider, {}, this._token.string);
            return Promise.resolve();
        }

        // Set fragments processing to false because references can only be
        // searched in full documents.
        return this.ternProvider.query(cm, "refs", false)
            .then(function(data) {
                var perFile = {}, i, ref;

                if (data) {
                    for (i = 0; i < data.refs.length; ++i) {
                        ref = data.refs[i];
                        (perFile[ref.file] || (perFile[ref.file] = [])).push(ref);
                    }
                }

                this._matches = perFile;
                this.events.trigger("references", this.ternProvider, perFile, this._token.string);
                return perFile;
            }.bind(this),
            function(error) {
                return error;
            });
    };


    return TernReferences;
});

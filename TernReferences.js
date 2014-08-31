/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    var spromise = require("libs/js/spromise");


    /**
     * Provider to tind references of a variable/property
     *
     * @param {TernProvider} instance of the tern provider
     */
    function TernReferences(ternProvider) {
        this.ternProvider = ternProvider;
        this._cm = null;
        this._token = null;
    }


    TernReferences.prototype.getReferences = function(cm) {
        var _self = this;
        cm = cm || this.cm;

        this._cm = cm;
        this._token = null;

        if (!cm) {
            return spromise.reject("Invalid CodeMirror instance");
        }

        this._token = cm.getTokenAt(cm.getCursor());
        if (!this._token.string) {
            $(TernReferences).triggerHandler("references", [this.ternProvider, {}, this._token.string]);
            return spromise.resolve();
        }

        return this.ternProvider.query(cm, "refs")
            .then(function(data) {
                var perFile = {}, i, ref;

                if (data) {
                    for (i = 0; i < data.refs.length; ++i) {
                        ref = data.refs[i];
                        (perFile[ref.file] || (perFile[ref.file] = [])).push(ref);
                    }
                }

                $(TernReferences).triggerHandler("references", [_self.ternProvider, perFile, _self._token.string]);
                return perFile;
            },
            function(error) {
                return error;
            });
    };


    return TernReferences;
});

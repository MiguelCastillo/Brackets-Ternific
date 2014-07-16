/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


define(function (require, exports, module) {
    "use strict";

    var spromise = require("libs/js/spromise");

    function TernReferences(ternProvider) {
        var _self = this;
        _self.ternProvider = ternProvider;
        _self._cm = null;
        _self.textMarkers = [];
    }


    TernReferences.prototype.query = function( ) {
        var cm = this._cm;

        return this.ternProvider.query( cm, "refs" )
            .then(function(data) {
                var perFile = {}, i, use;
                var drl = data.refs.length;
                for (i = 0; i < drl; ++i) {
                    use = data.refs[i];
                    (perFile[use.file] || (perFile[use.file] = [])).push(use);
                }
                return perFile;
            },
            function(error) {
                return error;
            });
    };


    /**
    * Finds and highlights all refenrences of the token the cursor is currently sitting on
    */
    TernReferences.prototype.findReferences = function( ) {
        var _self = this, cm = _self.ternProvider.currentDocument.cm;

        // Clear markers
        $.each( _self.textMarkers.slice(0), function(index, textMarker) {
            textMarker.clear();
        });

        _self.textMarkers = [];
        _self._cm = cm;

        if ( !cm ) {
            return spromise.rejected("Invalid codemirror instance.");
        }

        _self.query(cm).done(function(refsPerFile) {
            var i,file,refs,marker,refLen;

            for (file in refsPerFile) {
                refs = refsPerFile[file];
                refs.sort(refSort);

                refLen = refs.length;
                for (i = 0; i < refLen; ++i) {
                    marker = cm.markText(refs[i].start, refs[i].end, {className: "Tern-reference-highlight"});
                    _self.textMarkers.push(marker);
                }
            }
        });
    };


    /**
    * Finds and highlights all refenrences of the token the cursor is currently sitting on,
    * then allows to replace all those highlighted references
    */
    TernReferences.prototype.replaceReferences = function( ) {
        var _self = this, cm = _self.ternProvider.currentDocument.cm;

        $.each( _self.textMarkers.slice(0), function(index, textMarker) {
            textMarker.clear();
        });

        _self.textMarkers = [];
        _self._cm = cm;

        if ( !cm ) {
            return spromise.rejected("Invalid codemirror instance.");
        }

        _self.query().done(function(refsPerFile) {
            var i,file,refs,marker,refLen;

            for (file in refsPerFile) {
                refs = refsPerFile[file];
                refs.sort(refSort);
                refLen = refs.length;
                for (i = 0; i < refLen; ++i) {
                    marker = cm.markText(refs[i].start, refs[i].end, {className: "Tern-reference-highlight"});
                    _self.textMarkers.push(marker);
                }
            }
        });
    };


    function refSort(a, b) {
        return b.start - a.start;
    }


    return TernReferences;

});

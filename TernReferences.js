/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    'use strict';

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

                for (i = 0; i < data.refs.length; ++i) {
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
            var i = 0;

            for (var file in refsPerFile) {
                var refs = refsPerFile[file], doc = _self.ternProvider.findDocByName(file).doc;
                refs.sort(refSort);

                for (i = 0; i < refs.length; ++i) {
                    var marker = cm.markText(refs[i].start, refs[i].end, {className: "Tern-reference-highlight"});
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
            var i = 0;

            for (var file in refsPerFile) {
                var refs = refsPerFile[file], doc = _self.ternProvider.findDocByName(file).doc;
                refs.sort(refSort);

                for (i = 0; i < refs.length; ++i) {
                    //doc.replaceRange(newName, doc.posFromIndex(refs[i].start), doc.posFromIndex(refs[i].end));
                    var marker = cm.markText(refs[i].start, refs[i].end, {className: "Tern-reference-highlight"});
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

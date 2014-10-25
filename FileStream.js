/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require /*, exports, module*/) {
    "use strict";


    var spromise = require("libs/js/spromise");


    /**
     * @constructor
     * File provider to read and wrtie from and to a file.
     */
    function FileStream(file) {
        this._file = file.handle;
        this._filePath = file.filePath;
        this._fileName = file.fileName;
    }


    /**
     * Reads the file content
     * @returns {spromise};
     */
    FileStream.prototype.read = function() {
        var _self = this;

        return spromise(function(resolve, reject) {
            _self._file.read(function( err, content /*, stat*/ ) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        file: _self._file,
                        fileName: _self._fileName,
                        fullPath: _self._filePath + _self._fileName,
                        content: content
                    });
                }
            });
        });
    };


    /**
     * Writes content to file
     * @param {string} content String to be written to file
     * @param {Object} options
     * @returns {spromise};
     */
    FileStream.prototype.write = function(content, options) {
        var _self = this;

        return spromise(function(resolve, reject) {
            _self._file.write(content, options, function( err /*, stat*/ ) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        file: _self._file,
                        fileName: _self._fileName,
                        fullPath: _self._filePath + _self._fileName,
                        content: content
                    });
                }
            });
        });
    };


    return FileStream;
});

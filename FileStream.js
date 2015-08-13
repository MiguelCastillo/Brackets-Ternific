/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require /*, exports, module*/) {
    "use strict";


    var Promise = require("node_modules/spromise/dist/spromise.min");


    /**
     * @constructor
     * File provider to read and wrtie from and to a file.
     */
    function FileStream(file) {
        this._file = file.handle;
    }


    /**
     * Reads the file content
     * @returns {Promise};
     */
    FileStream.prototype.read = function() {
        var _self = this;

        return new Promise(function(resolve, reject) {
            _self._file.read(function(err, content /*, stat*/) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        file: _self._file,
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
     * @returns {Promise};
     */
    FileStream.prototype.write = function(content, options) {
        var _self = this;

        return new Promise(function(resolve, reject) {
            _self._file.write(content, options, function(err /*, stat*/) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        file: _self._file,
                        content: content
                    });
                }
            });
        });
    };


    return FileStream;
});

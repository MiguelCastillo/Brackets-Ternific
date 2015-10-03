/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require /*, exports, module*/) {
    "use strict";

    var FileSystem   = brackets.getModule("filesystem/FileSystem");
    var Promise      = require("node_modules/spromise/dist/spromise.min");
    var reportError  = require("reportError");
    var FileStream   = require("FileStream");
    var ProjectFiles = require("ProjectFiles");


    /**
     * Load file from local filesystem
     *
     * @param {string} filePath - is the file path to read
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function fromDirectory(filePath) {
        return new Promise(function(resolve, reject) {
            var handle = FileSystem.getFileForPath(filePath);

            handle.exists(function(err, exists) {
                if (err || !exists) {
                    err = err ? err : new Error(exists ? "Unknown file error" : filePath + " was not found");
                    reject(err);
                }
                else {
                    resolve(new FileStream({handle: handle}));
                }
            });
        });
    }


    /**
     * Reads a file based on the project directory.
     */
    function fromProject(fileName) {
        return fromDirectory(ProjectFiles.currentProject.fullPath + fileName);
    }


    /**
     * Interface to load a file
     *
     * @param {string} filePath is the name of the file to open
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function readFile(filePath) {
        var reader = isAbsolute(filePath) ? fromDirectory(filePath) : fromProject(filePath);

        return reader.then(function(stream) {
            return stream.read();
        }, reportError);
    }


    /**
     * Tests if the path is absolute or relative.
     */
    function isAbsolute(path) {
        return path[0] === '/' || /^[a-zA-Z]:[\/\\]+/.test(path);
    }


    return {
        isAbsolute: isAbsolute,
        readFile: readFile,
        fromDirectory: fromDirectory,
        fromProject: fromProject
    };
});


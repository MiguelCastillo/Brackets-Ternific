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
     * @param {string} fileName is the name of the file to open
     * @param {string} filePath is a fully resolved file path to search fileName in
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function fromDirectory(fileName) {
        return new Promise(function(resolve, reject) {
            var handle = FileSystem.getFileForPath(fileName);

            handle.exists(function(err, exists) {
                if (err || !exists) {
                    err = err ? err : (exists ? "Unknown file error" : fileName + " was not found");
                    reject(err);
                }
                else {
                    resolve(new FileStream({
                        handle: handle,
                        fileName: fileName
                    }));
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
     * @param {string} fileName is the name of the file to open
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
        return path[0] === '/' || /[a-zA-Z]:[\/\\]+/.test(path);
    }


    return {
        isAbsolute: isAbsolute,
        readFile: readFile,
        fromDirectory: fromDirectory,
        fromProject: fromProject
    };
});


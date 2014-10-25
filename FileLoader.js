/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require /*, exports, module*/) {
    "use strict";

    var FileSystem   = brackets.getModule("filesystem/FileSystem"),
        spromise     = require("libs/js/spromise"),
        FileStream   = require("FileStream"),
        ProjectFiles = require("ProjectFiles");

    var inProgress = {};
    var httpCache  = {};


    /**
     * Load file from a remote location via http
     *
     * @param {string} fileName is the name of the file to load
     * @returns {spromise}
     */
    function fromHttp (fileName) {
        if (inProgress[fileName]) {
            return inProgress[fileName];
        }

        if (httpCache[fileName]) {
            return httpCache[fileName];
        }

        inProgress[fileName] = spromise.thenable($.ajax(fileName, {"contentType": "text"}))
            .always(function() {
                delete inProgress[fileName];
            })
            .then(function(content) {
                return {
                    fileName: fileName,
                    fullPath: fileName,
                    content: content
                };
            });

        return inProgress[fileName];
    }


    /**
     * Load file from local filesystem
     *
     * @param {string} fileName is the name of the file to open
     * @param {string} filePath is a fully resolved file path to search fileName in
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function fromDirectory (fileName, filePath) {
        var handle = FileSystem.getFileForPath(filePath + fileName);

        return spromise(function(resolve, reject) {
            handle.exists(function(err, exists) {
                if (err || !exists) {
                    reject(err);
                }
                else {
                    resolve(new FileStream({
                        handle: handle,
                        fileName: fileName,
                        filePath: filePath
                    }));
                }
            });
        });
    }


    /**
     * Interface to load a file
     *
     * @param {string} fileName is the name of the file to open
     * @param {string} filePath is a fully resolved file path to search fileName in
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function readFile (fileName, filePath) {
        if (/^https?:\/\//.test(fileName)) {
            return fromHttp(fileName);
        }

        return spromise(function(resolve, reject) {
            openFile(fileName, filePath)
                .done(function(file) {
                    file.read().done(resolve);
                })
                .fail(reject);
        });
    }


    /**
     * Opens a file from local filesystem.
     *
     * @param {string} fileName is the name of the file to open
     * @param {string} filePath is a fully resolved file path to search fileName in
     * @returns {spromise} if successful, the file meta data is provider. If failed, the reason
     *   is provided.
     */
    function openFile (fileName, filePath) {
        return spromise(function(resolve, reject) {
            fromDirectory(fileName, filePath).done(resolve)
                .fail(function() {
                    fromDirectory(fileName, ProjectFiles.currentProject.fullPath).done(resolve).fail(reject);
                });
        }).fail(function(err) {
            console.log("====> error", err, fileName, filePath);
        });
    }


    return {
        readFile: readFile,
        openFile: openFile,
        fromHttp: fromHttp,
        fromDirectory: fromDirectory
    };
});


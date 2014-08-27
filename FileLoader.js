/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require, exports, module) {
    "use strict";

    var FileSystem   = brackets.getModule("filesystem/FileSystem"),
        spromise     = require("libs/js/spromise"),
        FileStream   = require("FileStream"),
        ProjectFiles = require("ProjectFiles");

    var inProgress = {};
    var httpCache  = {};


    function resolvePath(rootFile) {
        return rootFile ? rootFile.substr(0, rootFile.lastIndexOf("/")) + "/" : "";
    }


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
     */
    function fromDirectory (fileName, rootFile) {
        var filePath = resolvePath(rootFile);
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
     * Load file from the directory of the current project
     */
    function fromProject (fileName) {
        return fromDirectory(fileName, ProjectFiles.currentProject.fullPath);
    }


    /**
     * Interface to load a file
     */
    function loadFile (fileName, rootFile) {
        if (/^https?:\/\//.test(fileName)) {
            return fromHTTP(fileName);
        }

        return spromise(function(resolve, reject) {
            fromDirectory(fileName, rootFile)
            .done(function(file) {
                file.read().done(resolve);
            })
            .fail(function() {
                fromProject(fileName).done(function(file) {
                    file.read().done(resolve).fail(reject);
                }).fail(reject);
            });
        }).fail(function(err) {
            console.log("====> error", err);
        });
    }


    return {
        loadFile: loadFile,
        fromHttp: fromHttp,
        fromProject: fromProject,
        fromDirectory: fromDirectory
    };
});


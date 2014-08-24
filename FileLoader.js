/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */

define(function (require, exports, module) {
    "use strict";

    var spromise     = require("libs/js/spromise");
    var FileSystem   = brackets.getModule("filesystem/FileSystem"),
        ProjectFiles = require("ProjectFiles");

    var fileLoader = (function(){
        var inProgress= {};
        var httpCache = {};

        // Load up the file from a remote location via http
        function fromHTTP(fileName) {
            if (httpCache[fileName]){
                return spromise.resolved(httpCache[fileName]);
            }

            inProgress[fileName] = $.ajax({
                    "url": fileName,
                    "contentType": "text"
                });


            inProgress[fileName].then(function(data) {
                    httpCache[fileName] = {
                        fileName: fileName,
                        fullPath: fileName,
                        text: data
                    };

                    return httpCache[fileName];
                })
                .always(function(){
                    delete inProgress[fileName];
                });

            return inProgress[fileName];
        }


        // Load up the file from a local directory
        function fromDirectory(fileName, rootFile) {
            var deferred = spromise.defer();
            var directoryPath = fileMeta.resolvePath(rootFile);

            fileHandle(fileName, rootFile).done(function(file) {
                file.read().done(function(text) {
                    var data = {
                        fileName: fileName,
                        fullPath: directoryPath + fileName,
                        text: text
                    };

                    deferred.resolve(data);
                })
                .fail(deferred.reject);
            });

            return deferred.promise;
        }


        // Load up the file from the directory of the current project
        function fromProject(fileName) {
            return fromDirectory(fileName, ProjectFiles.currentProject.fullPath);
        }


        // Interface to load the file...
        function fileMeta(fileName, rootFile) {
            if (fileName in inProgress) {
                return inProgress[fileName];
            }

            var deferred;

            if (/^https?:\/\//.test(fileName)) {
                deferred = fromHTTP(fileName);
            }
            else {
                deferred = spromise.defer();

                //
                // First try to load the file from the specified rootFile directoty
                // and if that does not work, then we will try to open it from the
                // project directory.  Sometime both directories will be the same...
                //
                fromDirectory(fileName, rootFile).done(function(data) {
                        deferred.resolve(data);
                    }).fail(function( ) {

                        fromProject(fileName).done(function(data) {
                                deferred.resolve(data);
                            }).fail(function(error){
                                deferred.reject(error);
                            });

                    });
            }

            return deferred;
        }


        fileMeta.resolvePath = function(rootFile){
            return rootFile ? rootFile.substr(0, rootFile.lastIndexOf("/")) + "/" : "";
        };


        function fileHandle(fileName, rootFile) {
            var deferred = spromise.defer();
            var directoryPath = fileMeta.resolvePath(rootFile);
            var _file = FileSystem.getFileForPath (directoryPath + fileName);

            _file.exists(function( err /*, exists*/ ) {
                if ( err ) {
                    deferred.reject(err);
                }

                deferred.resolve({
                    read: function() {
                        var _deferred = spromise.defer();

                        _file.read(function( err, content /*, stat*/ ) {
                            if ( err ) {
                                _deferred.reject(err);
                                return;
                            }
                            _deferred.resolve(content);
                        });

                        return _deferred;
                    },
                    write: function() {

                    }
                });
            });

            return deferred;
        }


        return {
            fileMeta: fileMeta,
            fileHandle: fileHandle
        };

    })();


    return fileLoader;
});


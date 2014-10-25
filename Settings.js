/**
 * Interactive Linter Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var Dialogs         = brackets.getModule("widgets/Dialogs"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        spromise        = require("libs/js/spromise"),
        currentProject  = {};


    function Settings( ) {
        var instance        = {},
            currentSettings = {};

        // Monitor file changes
        FileSystem.on("change", function(evt, file) {
            if ( currentSettings.file && currentSettings.fileObject && file && file.fullPath === currentSettings.fileObject.fullPath ) {
                loadFile().always(function() {
                    $(instance).trigger("change", [currentSettings.settings]);
                });
            }
        });


        function setSettings( settings ) {
            var deferred = spromise.defer();
            settings = stripComments(settings);

            try {
                settings = JSON.parse(settings);
                deferred.resolve(settings);
            }
            catch( ex ) {
                if ( !settings ) {
                    deferred.resolve();
                    return;
                }

                Dialogs.showModalDialog(
                    "TernificErr",
                    "Ternific Error",
                    "Error processing ternific settings<br>" +
                    ex.toString());

                deferred.reject("Error processing ternific settings");
            }

            return deferred.promise;
        }


        function loadFile( ) {
            var traverse = currentSettings.path.indexOf(currentProject.fullPath) !== -1;
            return findFile(currentSettings.file, currentSettings.path, traverse)
                .always(function(file) {
                    currentSettings.fileObject = file;
                })
                .then(readFile, $.noop)
                .then(setSettings, $.noop)
                .then(function(settings) {
                    return (currentSettings.settings = settings);
                });
        }


        function loadSettings(file, path) {
            if ( !file ) {
                return spromise.resolved();
            }

            // Cache so that we are not loading up the same file when navigating in the same directory...
            if ( path === currentSettings.path && currentSettings.path) {
                return spromise.resolved(currentSettings.settings);
            }

            currentSettings.path = normalizePath(path || currentProject.fullPath);
            currentSettings.file = file;
            return loadFile().promise;
        }


        instance.load = loadSettings;
        return instance;
    }


    function getParentPath( path ) {
        var result = stripTrailingSlashes( path );
        return result.substr(0, result.lastIndexOf("/") + 1);
    }


    function findFile( fileName, filePath, traverse ) {
        var deferred = spromise.defer();

        function find( filePath ) {
            if ( !filePath ) {
                return deferred.reject(false);
            }

            try {
                var file = FileSystem.getFileForPath (filePath + "/" + fileName);
                file.exists(function( err, exists ) {
                    if ( exists ) {
                        deferred.resolve(file);
                    }
                    else if ( err || !traverse || filePath.indexOf( currentProject.fullPath ) === -1 ) {
                        deferred.reject(false);
                    }
                    else {
                        find( getParentPath(filePath) );
                    }
                });
            }
            catch(ex) {
                deferred.reject(false);
            }
        }

        find( filePath );
        return deferred.promise;
    }


    function readFile( file ) {
        var deferred = spromise.defer();

        file.read(function( err, content /*, stat*/ ) {
            if ( err ) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(content);
        });

        return deferred.promise;
    }



    /**
    * Make sure we only have forward slashes and we dont have any duplicate slashes
    */
    function normalizePath( path ) {
        return path.replace(/\/+|\\+/g, "/");
    }


    /**
    * Lets get rid of the trailing slash
    */
    function stripTrailingSlashes(path) {
        return path.replace(/\/$/, "");
    }


    /**
     * Strips all commments from a json string.
     */
    function stripComments( text ) {
        var string = text || '';
        string = string.replace(/\/\*(?:[^\*\/])*\*\//g, '');
        string = string.replace(/\/\/.*/g, '');
        return string;
    }


    $(ProjectManager).on("projectOpen", function(e, project) {
        currentProject = project;
    });


    return Settings;
});

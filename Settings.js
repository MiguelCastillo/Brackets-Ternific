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
        Promise         = require("libs/js/spromise"),
        currentProject  = {};


    function Settings() {
    }


    Settings.factory = function() {
        var instance        = {},
            currentSettings = {};

        // Monitor file changes
        FileSystem.on("change", fileChanged);
        function fileChanged(evt, file) {
            if (currentSettings.file && currentSettings.fileObject &&
                file && file.fullPath === currentSettings.fileObject.fullPath) {
                loadFile().always(fileLoaded);
            }
        }


        function fileLoaded() {
            $(instance).trigger("change", [currentSettings.settings]);
        }


        function parseSettings(settings) {
            var deferred = Promise.defer();
            
            settings = Mustache.render(settings, {project: currentProject.fullPath});
            
            settings = stripComments(settings);

            try {
                settings = JSON.parse(settings);
                deferred.resolve(settings);
            }
            catch(ex) {
                if (!settings) {
                    deferred.resolve();
                    return;
                }

                Dialogs.showModalDialog(
                    "TernificErr",
                    "Ternific Error",
                    "Error processing ternific settings<br>" +
                    ex.toString()
                );

                deferred.reject("Error processing ternific settings");
            }

            return deferred.promise;
        }


        function setSettings(settings) {
            return (currentSettings.settings = settings);
        }


        function setFileObject(file) {
            currentSettings.fileObject = file;
        }


        function loadFile() {
            var traverse = currentSettings.path.indexOf(currentProject.fullPath) !== -1;

            return findFile(currentSettings.file, currentSettings.path, traverse)
                .always(setFileObject)
                .then(readFile, $.noop)
                .then(parseSettings, $.noop)
                .then(setSettings, $.noop);
        }


        function loadSettings(file, path) {
            if (!file) {
                return Promise.resolve();
            }

            // Cache so that we are not loading up the same file when navigating in the same directory...
            if (path === currentSettings.path && currentSettings.path) {
                return Promise.resolve(currentSettings.settings);
            }

            currentSettings.path = normalizePath(path || currentProject.fullPath);
            currentSettings.file = file;
            return loadFile().promise;
        }


        instance.load = loadSettings;
        return instance;
    };


    function getParentPath(path) {
        var result = stripTrailingSlashes(path);
        return result.substr(0, result.lastIndexOf("/") + 1);
    }


    function findFile(fileName, filePath, traverse) {
        var deferred = Promise.defer();

        function find(filePath) {
            if (!filePath) {
                return deferred.reject(false);
            }

            try {
                var file = FileSystem.getFileForPath (filePath + "/" + fileName);
                file.exists(function(err, exists) {
                    if (exists) {
                        deferred.resolve(file);
                    }
                    else if (err || !traverse || filePath.indexOf( currentProject.fullPath ) === -1) {
                        deferred.reject(false);
                    }
                    else {
                        find(getParentPath(filePath));
                    }
                });
            }
            catch(ex) {
                deferred.reject(false);
            }
        }

        find(filePath);
        return deferred.promise;
    }


    function readFile(file) {
        var deferred = Promise.defer();

        file.read(function(err, content /*, stat*/) {
            if (err) {
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
    function normalizePath(path) {
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
    function stripComments(text) {
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

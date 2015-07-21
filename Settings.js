/**
 * Interactive Linter Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var Dialogs        = brackets.getModule("widgets/Dialogs");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var FileSystem     = brackets.getModule("filesystem/FileSystem");
    var FileUtils      = brackets.getModule("file/FileUtils");
    var Promise        = require("libs/js/spromise");


    function Settings(filePath) {
        this.project = ProjectManager.getProjectRoot();
        this.data = null;
        this.fileObject = null;
        this.filePath = filePath;
        this.baseUrl = null;
        watchChanges(this);
    }


    Settings.create = function(filePath) {
        return new Settings(filePath);
    };


    /**
     * Gets the full path to the current project
     *
     * @returns {string}
     */
    Settings.prototype.projectPath = function() {
        return (this.project && this.project.fullPath) || '';
    };


    /**
     * Load settings file.
     *
     * @param {string} baseUrl - Path to start searching for settings file to
     *  be loaded. If one isn't provided, the current project path is used.
     *
     * @returns {Promise}
     */
    Settings.prototype.load = function(baseUrl) {
        var _self = this;
        var dirty = this.dirty;
        this.dirty = false;

        baseUrl = baseUrl ? normalizePath(baseUrl) : this.projectPath();

        // Cache so that we are not loading up the same file when navigating in
        // the same directory...
        if (!dirty && this.baseUrl && baseUrl === this.baseUrl) {
            return Promise.resolve({
                data: this.data,
                changed: false
            });
        }

        this.baseUrl = baseUrl;

        return new Promise(function(resolve, reject) {
            function processFileObject(fileObject) {
                var currentFileObject = _self.fileObject;
                _self.fileObject = fileObject;

                if (!fileObject) {
                    _self.data = null;

                    // Resolve promise
                    resolve({
                        data: _self.data,
                        changed: true
                    });
                }

                // If not dirty and we are loading the same file, we just
                // return what we have already loaded.
                else if (!dirty && (fileObject && currentFileObject && fileObject.fullPath === currentFileObject.fullPath)) {
                    // Resolve promise
                    resolve({
                        data: _self.data,
                        changed: false
                    });
                }

                // If the settings file is reloaded because it changed, or
                // it's a different file, then we read it, parse it, and
                // resolve the promise with the corresponding data.
                else {
                    readFile(fileObject)
                        .then(parseSettings, $.noop)
                        .then(function(settings) {
                            _self.data = settings;

                            // Resolve promise
                            resolve({
                                data: _self.data,
                                changed: true
                            });
                        });
                }
            }

            findFile(_self, _self._canTraverse()).always(processFileObject);
        });
    };


    Settings.prototype._canTraverse = function() {
        var projectPath = this.projectPath();
        var baseUrl = this.baseUrl;
        return projectPath !== baseUrl && baseUrl.indexOf(projectPath) !== -1;
    };


    /**
     * Cleans out settings data. It removes all comments from the file before
     * it is converted to a JSON structure.
     *
     * @param {string} settingsString - String settings. Generally read from
     *  directly from a file a text, and needs to be converted to JSON.
     *
     * @returns {object}
     */
    function parseSettings(settingsString) {
        if (!settingsString) {
            throw new Error("Must provide settings");
        }

        try {
            return JSON.parse(stripComments(settingsString));
        }
        catch(ex) {
            Dialogs.showModalDialog(
                "TernificErr",
                "Ternific Error",
                "Error processing ternific settings<br>" +
                ex.toString()
            );
        }
    }


    function watchChanges(settings) {
        function fileChanged(evt, file) {
            if (file && settings.fileObject && file.fullPath === settings.fileObject.fullPath) {
                settings.load().always(function fileLoaded() {
                    $(settings).trigger("change", [settings]);
                });
            }
        }

        function projectChanged(evt, project) {
            settings.project = project;
        }

        function dispose() {
            FileSystem.off("change", fileChanged);
            ProjectManager.off("change", projectChanged);
        }

        FileSystem.on("change", fileChanged);
        ProjectManager.on("projectOpen", projectChanged);

        return {
            dispose: dispose
        };
    }


    function findFile(settings, traverse) {
        var filePath = settings.filePath;
        var deferred = Promise.defer();

        function find(baseUrl) {
            if (!baseUrl) {
                return deferred.reject(false);
            }

            try {
                var file = FileSystem.getFileForPath(baseUrl + filePath);
                file.exists(function(err, exists) {
                    if (exists) {
                        deferred.resolve(file);
                    }
                    else if (err || !traverse || baseUrl.indexOf(settings.projectPath()) === -1) {
                        deferred.reject(false);
                    }
                    else {
                        find(FileUtils.getParentPath(baseUrl));
                    }
                });
            }
            catch(ex) {
                deferred.reject(false);
            }
        }

        find(settings.baseUrl);
        return deferred.promise;
    }


    /**
     * Reads file content and returns a promise that is resolve when the file is
     * read from storage.
     *
     * @param {File} file - File object
     *
     * @returns {Promise}
     */
    function readFile(file) {
        return new Promise(function(resolve, reject) {
            file.read(function(err, content /*, stat*/) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(content);
                }
            });
        });
    }


    /**
     * Make sure we only have forward slashes and we dont have any duplicate slashes
     */
    function normalizePath(path) {
        return path.replace(/[\/\\]+/g, "/");
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


    return Settings;
});

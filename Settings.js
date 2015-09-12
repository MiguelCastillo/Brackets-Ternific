/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var _               = brackets.getModule("thirdparty/lodash");
    var Dialogs         = brackets.getModule("widgets/Dialogs");
    var ProjectManager  = brackets.getModule("project/ProjectManager");
    var FileSystem      = brackets.getModule("filesystem/FileSystem");
    var FileUtils       = brackets.getModule("file/FileUtils");
    var EventDispatcher = brackets.getModule("utils/EventDispatcher");
    var Promise         = require("node_modules/spromise/dist/spromise.min");


    function Settings(filePath, watchProject) {
        this.project = ProjectManager.getProjectRoot();
        this.data = null;
        this.file = null;
        this.filePath = filePath;
        this.baseUrl = null;
        watchChanges(this, watchProject);
    }


    EventDispatcher.makeEventDispatcher(Settings.prototype);


    Settings.create = function(filePath, watchProject) {
        return new Settings(filePath, watchProject);
    };


    /**
     * Gets the full path to the current project
     *
     * @returns {string}
     */
    Settings.prototype.projectPath = function() {
        return this.project && this.project.fullPath || "";
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
        return this._load(baseUrl, false);
    };


    /**
     * Reload settings file.
     *
     * @returns {Promise}
     */
    Settings.prototype.reload = function() {
        return this._load(this.baseUrl, true);
    };


    /**
     * Traverses directory structure merging settings it finds along the way.
     *
     * NOT IMPLEMENTED
     */
    Settings.prototype.aggregate = function(/*baseUrl*/) {
        throw new Error("Not implemented");
    };


    /**
     * Load settings file.
     *
     * @private
     *
     * @param {string} baseUrl - Path to start searching for settings file to
     *  be loaded. If one isn't provided, the current project path is used.
     * @param {boolean} reload - Forces the reload of the current file.
     *
     * @returns {Promise}
     */
    Settings.prototype._load = function(baseUrl, reload) {
        var _self = this;
        var prevBaseUrl = this.baseUrl;
        _self.baseUrl = joinPath(this.projectPath(), baseUrl);

        if (!reload && _self.baseUrl === prevBaseUrl) {
            return Promise.resolve({
                changed: false
            });
        }

        return load(this, reload).always(function(result) {
            if (result.changed) {
                _self.file = result.file;
                _self.data = result.data;
                _self.trigger("change", _self.data);
            }
        });
    };


    /**
     * Tests whether or not the baseUrl is a subdirectory of the project.  If it is,
     * then we can traverse up the directory hierarchy.
     *
     * @returns {boolean}
     */
    function canTraverse(baseUrl, projectPath) {
        return projectPath !== baseUrl && baseUrl.indexOf(projectPath) !== -1;
    }


    /**
     * Load settings starting from `settings.baseUrl`.
     *
     * @returns {{file: file, data: object, changed: boolean}}
     */
    function load(settings, reload) {
        function fileFound(file) {
            var currentFile = settings.file;

            if (!reload && (currentFile && file.fullPath === currentFile.fullPath)) {
                return {
                    changed: false
                };
            }
            else {
                return readFile(file)
                    .then(parseSettings, _.noop)
                    .then(function(data) {
                        return {
                            file: file,
                            data: data,
                            changed: true
                        };
                    });
            }
        }

        function fileNotFound() {
              return {
                  file: null,
                  data: null,
                  changed: settings.data !== null || settings.file !== null
              };
        }

        return findFile(settings, canTraverse(settings.baseUrl, settings.projectPath())).then(fileFound, fileNotFound);
    }


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


    function watchChanges(settings, watchProject) {
        function fileChanged(evt, file) {
            if (file && settings.file && file.fullPath === settings.file.fullPath) {
                settings.reload();
            }
        }

        function projectChanged(evt, project) {
            settings.project = project;
            settings.reload();
        }

        function dispose() {
            FileSystem.off("change", fileChanged);

            if (watchProject !== false) {
                ProjectManager.off("change", projectChanged);
            }
        }

        FileSystem.on("change", fileChanged);

        if (watchProject !== false) {
            ProjectManager.on("projectOpen", projectChanged);
        }

        return {
            dispose: dispose
        };
    }


    /**
     * Finds the settings file starting from `baseUrl`.
     */
    function findFile(settings, traverse) {
        var filePath = settings.filePath;
        var projectPath = settings.projectPath();

        return new Promise(function(resolve, reject) {
            (function find(baseUrl) {
                if (!baseUrl || projectPath && baseUrl.indexOf(projectPath) === -1) {
                    reject(false);
                    return;
                }

                try {
                    var file = FileSystem.getFileForPath(baseUrl + filePath);

                    file.exists(function(err, exists) {
                        if (exists) {
                            resolve(file);
                        }
                        else if (err || !traverse) {
                            reject(false);
                        }
                        else {
                            find(FileUtils.getParentPath(baseUrl));
                        }
                    });
                }
                catch(ex) {
                    reject(false);
                }
            })(settings.baseUrl);
        });
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


    function joinPath(projectPath, baseUrl) {
        // TODO: Change to a path.join to consistently handle when settings are
        // read from the project or from a subdirectory - always taking into
        // account the project path.
        return baseUrl ? normalizePath(baseUrl) : projectPath;
    }


    /**
     * Make sure we only have forward slashes and we dont have any duplicate slashes
     */
    function normalizePath(path) {
        return path.replace(/[\/\\]+/g, "/");
    }


    /**
     * Strips all commments from a json string.
     */
    function stripComments(text) {
        var string = text || "";
        string = string.replace(/\/\*(?:[^\*\/])*\*\//g, "");
        string = string.replace(/\/\/.*/g, "");
        return string;
    }


    return Settings;
});

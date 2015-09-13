/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var ProjectManager  = brackets.getModule("project/ProjectManager");
    var FileSystem      = brackets.getModule("filesystem/FileSystem");
    var EventDispatcher = brackets.getModule("utils/EventDispatcher");
    var Promise         = require("node_modules/spromise/dist/spromise.min");
    var FileStream      = require("FileStream");


    function ProjectFiles() {
    }


    EventDispatcher.makeEventDispatcher(ProjectFiles.prototype);


    ProjectFiles.prototype.openFile = function(fileName /*, forceCreate*/) {
        var filePath = this.currentProject.fullPath;
        var handle = FileSystem.getFileForPath(filePath + fileName);

        return new Promise(function(resolve, reject) {
            handle.exists(function(err /*, exists*/) {
                if (err) {
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
    };


    ProjectFiles.prototype.resolveName = function(fileName) {
        return this.currentProject.fullPath + fileName;
    };


    var projectFiles = new ProjectFiles();

    ProjectManager.on("projectOpen", function(e, project) {
        projectFiles.currentProject = project;
        projectFiles.trigger("projectOpen", project);
    });


    return projectFiles;
});

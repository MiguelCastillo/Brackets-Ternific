/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var spromise       = require("libs/js/spromise"),
        FileStream     = require("FileStream"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        FileSystem     = brackets.getModule("filesystem/FileSystem");


    function ProjectFiles() {
    }


    ProjectFiles.prototype.openFile = function(fileName /*, forceCreate*/) {
        var filePath = this.currentProject.fullPath;
        var handle = FileSystem.getFileForPath(filePath + fileName);

        return spromise(function(resolve, reject) {
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


    var _projectFiles = new ProjectFiles();
    $(ProjectManager).on("projectOpen", function(e, project){
        _projectFiles.currentProject = project;
        $(_projectFiles).trigger('projectOpen', [project]);
    });


    return _projectFiles;
});

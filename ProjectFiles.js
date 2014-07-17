/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


define(function (require, exports, module) {
    'use strict';

    var ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem");


    function ProjectFiles() {
    }


    ProjectFiles.prototype.openFile = function( fileName, forceCreate ) {
        var deferred = $.Deferred();
        var directoryPath = this.currentProject.fullPath;
        var file = FileSystem.getFileForPath (directoryPath + fileName);

        file.exists(function( err /*, exists*/ ) {
            if ( err ) {
                deferred.reject(err);
            }

            deferred.resolve({
                read: function() {
                    var _deferred = $.Deferred();

                    file.read(function( err, content /*, stat*/ ) {
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
    };


    ProjectFiles.prototype.resolveName = function(fileName) {
        return currentProject.fullPath + fileName;
    };


    var _projectFiles = new ProjectFiles();
    $(ProjectManager).on("projectOpen", function(e, project){
        _projectFiles.currentProject = project;
        $(_projectFiles).trigger('projectOpen', [project]);
    });


    return _projectFiles;

});

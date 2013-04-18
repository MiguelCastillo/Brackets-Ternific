/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/*jslint plusplus: true, nomen: true, regexp: true, maxerr: 50 */

define(function (require, exports, module) {
    'use strict';

    var FileUtils        = brackets.getModule("file/FileUtils"),
        NativeFileSystem = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        ProjectManager   = brackets.getModule("project/ProjectManager");


    var currentProject;


    function ProjectFiles() {
    }


    /**
    * Creates a file reader/writer that's relative to the current project.
    *
    * @param {String} fileName - the name of the file to open in the current project
    * @param {String} type - for whether the file is open for reading or writing.
    *       values can be "read" or "write".
    * @param {Boolean} forceCreate - flag to force the creation of the file if
    *       the file isn't found.  This will only apply when type is "write".
    *
    * @return {$.Deferred} a jQuery deferred object with the file reader or
    *       writer.
    */
    ProjectFiles.prototype.openFile = function( fileName, type, forceCreate ) {
        var deferred = $.Deferred();

        // Try to load up the linterSettings file, which is per project.
        var directoryPath = FileUtils.canonicalizeFolderPath(currentProject.fullPath) + "/";

        // Get the directory path handler first, and then try to write to the file
        var directoryEntry = new NativeFileSystem.DirectoryEntry(directoryPath);

        directoryEntry.getFile( fileName, {
            create: forceCreate,
            exclusice: true
        }, function( fileEntry ){

            if (type === "write") {
                fileEntry.createWriter(function(fileWriter){
                    deferred.resolve(fileWriter);
                });
            }
            else {
                var fileReader = {
                    readAsText: function() {
                        return FileUtils.readAsText(fileEntry);
                    }
                };

                deferred.resolve(fileReader);
            }

        }, deferred.reject);


        return deferred;
    };


    /**
    * Interface to revolve the full path for the given file name. This will
    * figure out the full path to the file but it will not resolve whether
    * or not the file exists
    * @param {String} fileName - is the file to resolve the full path for.
    *
    * @return {String} full path for the file in the directory of the current
    *       project
    */
    ProjectFiles.prototype.resolveName = function(fileName) {
        return FileUtils.canonicalizeFolderPath(currentProject.fullPath) + "/" + fileName;
    };


    var _projectFiles = new ProjectFiles();

    // This is a simple proxy to send messages when new projects are open.
    $(ProjectManager).on("projectOpen", function(e, project){
        currentProject = project;
        $(_projectFiles).triggerHandler('projectOpen', [project]);
    });

    return _projectFiles;

});

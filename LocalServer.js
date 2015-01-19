/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module) {
    "use strict";

    var TERN_ROOT        = "./libs/tern/",
        TERN_DEFINITIONS = TERN_ROOT + "defs/",
        WORKER_SCRIPT    = module.uri.substr(0, module.uri.lastIndexOf("/")) + "/TernWorker.js";

    var Promise         = require("libs/js/spromise"),
        TernApi         = require("TernApi"),
        Settings        = require("Settings"),
        globalSettings  = require("text!./libs/tern/.tern-project"),
        projectSettings = Settings.factory();



    try {
        globalSettings = JSON.parse(globalSettings);
    }
    catch(ex) {
        globalSettings = {};
    }


    /**
     * Bridge to communicate into tern worker thread.
     */
    function LocalServer(documenProvider) {
        this.settings        = {};
        this.documenProvider = documenProvider;
        this.worker          = getWorker(this, WORKER_SCRIPT);

        // Call tern api to set the rest of the stuff up.
        TernApi.call(this);
    }


    LocalServer.prototype = new TernApi();
    LocalServer.prototype.constructor = LocalServer;


    LocalServer.prototype.clear = function() {
        return this.worker.send({
            type: "clear"
        });
    };


    LocalServer.prototype.request = function(body) {
        return this.worker.send({
            type: "request",
            body: body
        }, true);
    };


    LocalServer.prototype.addFile = function(name, text) {
        return this.worker.send({
            type: "addFile",
            name: name,
            text: text
        });
    };


    LocalServer.prototype.deleteFile = function(name) {
        return this.worker.send({
            type: "deleteFile",
            name: name
        });
    };


    LocalServer.prototype.loadSettings = function(fullPath) {
        var _self = this;
        function done(settings) {
            loadSettings(_self, settings);
        }

        projectSettings.load(".tern-project", fullPath).always(done);
    };


    LocalServer.factory = function(provider) {
        return new Promise(function(resolve) {
            var localServer = new LocalServer(provider);
            initialize(localServer, provider.settings);
            resolve(localServer);
        });
    };


    function initialize(localServer) {
        // Init with empty settings. Until a document is open that can give us
        // some context...
        localServer.worker.send({
            type: "init",
            body: localServer.settings
        });
    }


    function loadSettings(localServer, settings) {
        settings = settings || $.extend({}, globalSettings);

        if (localServer.settings === settings) {
            return;
        }

        localServer.settings = settings;
        settings.libs = $.map(settings.libs || [], function(item) {
            return "text!" + TERN_DEFINITIONS + item + ".json";
        });

        require(settings.libs, function() {
            settings.defs = $.map(arguments, function(item) {
                var result;
                try {result = JSON.parse(item);} catch(ex) {}
                return result || {};
            });

            initialize(localServer);
        });
    }


    function getWorker(server, workerScript) {
        if (!server.worker) {
            server.worker = getWorker.factory(server, workerScript);
        }

        return server.worker;
    }


    getWorker.factory = function(server, workerScript) {
        // Create worker thread to process tern requests.
        var worker  = new Worker(workerScript);
        var current = null,
            pending = null;

        worker.onmessage = function(evt) {
            var data = evt.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type == "getFile") {
                server.documenProvider
                    .getFile(data.name)
                    .done(function(file) {
                        worker.send({
                            type: "addFile",
                            text: file.content,
                            id: data.id
                        });
                    })
                    .fail(function(error) {
                        worker.send({
                            type: "addFile",
                            err: String(error),
                            id: data.id
                        });
                    });
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
            else if (current) {
                current.deferred.resolve(data.body);
            }
        };


        worker.onerror = function(e) {
            if (current) {
                current.deferred.reject(e);
            }
        };


        worker.send = function(data, callback) {
            // Some requests to tern dont need to be waited on...  So, just send tern
            // the message and exit out.
            if (!callback) {
                worker.postMessage(data);
                return;
            }

            // New request
            var request = {
                data: data,
                deferred: Promise.defer()
            };


            if (!current) {
                current = request;
                worker.postMessage(request.data);
            }
            else {
                if (pending) {
                    // Resolve with null to trigger a cancellation...  This happens when we
                    // can safely skip requests before they are sent for processing to tern.
                    pending.deferred.resolve(null);
                }

                pending = request;
            }

            return request.deferred.done(processResponse);
        };


        function processResponse(response) {
            if (response !== null) {
                current = pending;
                if (pending) {
                    pending = null;
                    worker.postMessage(current.data);
                }
            }
        }


        return worker;
    };


    return LocalServer;
});

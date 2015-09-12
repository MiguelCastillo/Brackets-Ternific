/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module) {
    "use strict";

    var _               = brackets.getModule("thirdparty/lodash");
    var extensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var Promise         = require("node_modules/spromise/dist/spromise.min");
    var TernApi         = require("TernApi");
    var Settings        = require("Settings");

    var globalSettings  = Settings.create(".tern-project", false);
    var projectSettings = Settings.create(".tern-project");
    var logger          = require("Logger").factory("LocalServer");

    var TERN_ROOT        = "node_modules/tern/";
    var TERN_DEFINITIONS = TERN_ROOT + "defs/";
    var WORKER_SCRIPT    = extensionUtils.getModulePath(module, "TernWorker.js");

    // Initialize global settings
    globalSettings.load(extensionUtils.getModulePath(module));

    function parseJSON(data) {
        try {
            return JSON.parse(data);
        }
        catch(ex) {
            return undefined;
        }
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

        var processSettings = createSettingsProcessor(this, globalSettings, projectSettings);
        globalSettings.on("change", processSettings);
        projectSettings.on("change", processSettings);
        processSettings();
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


    LocalServer.prototype.getFile = function(data) {
        logger.log(data.type, data.name, data);
        var server = this;
        this.documenProvider.getDocument(data.name)
            .then(function(docMeta) {
                server.worker.send({
                    type: "addFile",
                    text: docMeta.doc.getValue(),
                    id: data.id
                });
            }, function(error) {
                logger.error(error);
                server.worker.send({
                    type: "addFile",
                    err: String(error),
                    id: data.id
                });
            });
    };


    LocalServer.prototype.loadSettings = function(fullPath) {
        projectSettings.load(fullPath);
    };


    LocalServer.create = function(provider) {
        return new Promise(function(resolve) {
            var localServer = new LocalServer(provider);
            initialize(localServer, provider.settings);
            resolve(localServer);
        });
    };


    function initialize(localServer, settings) {
        localServer.worker.send({
            type: "init",
            body: settings
        });
    }


    function createSettingsProcessor(localServer, global, project) {
        return function() {
            var settings = _.assign({}, global.data || {}, project.data || {});

            getDefinitions(settings.libs).then(function(defs) {
                settings.defs = defs;
                initialize(localServer, settings);
            });
        };
    }


    function getDefinitions(libs) {
        libs = _.map(libs || [], function(item) {
            if (item.indexOf("/") !== -1 || item.indexOf("\\") !== -1) {
                return "text!" + item + ".json";
            }

            return "text!" + TERN_DEFINITIONS + item + ".json";
        });

        return new Promise(function(resolve) {
            require(libs, function() {
                var defs = _.reduce(arguments, function(result, item) {
                    item = parseJSON(item);
                    if (item) {
                        result.push(item);
                    }
                    return result;
                }, []);

                resolve(defs);
            });
        });
    }


    function getWorker(server, workerScript) {
        if (!server.worker) {
            server.worker = getWorker.create(server, workerScript);
        }

        return server.worker;
    }


    getWorker.create = function(server, workerScript) {
        // Create worker thread to process tern requests.
        var worker  = new Worker(workerScript),
            current = null,
            pending = null;

        worker.onmessage = function(evt) {
            var data = evt.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type == "getFile") {
                server.getFile(data);
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
            else if (current) {
                if (data.err) {
                    current.deferred.reject(data.err);
                }
                else {
                    current.deferred.resolve(data.body);
                }
            }
        };


        worker.onerror = function(e) {
            if (current) {
                current.deferred.reject(e);
            }
        };


        worker.send = function(data, defer) {
            logger.log(data.type, data);
            return defer ? deferredRequest(data) : worker.postMessage(data);
        };


        function deferredRequest(data) {
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

            return request.deferred
                .done(function(response) {
                    logger.log(response);
                    processResponse(response);
                })
                .fail(function(error) {
                    logger.error(error);
                    processResponse();
                });
        }


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

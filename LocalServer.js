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
    var workerFactory   = require("workerFactory");
    var TernApi         = require("TernApi");
    var Settings        = require("Settings");

    var globalSettings  = Settings.create(".tern-project", false);
    var projectSettings = Settings.create(".tern-project");

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
        this.worker          = workerFactory.create(this, WORKER_SCRIPT);

        // Call tern api to set the rest of the stuff up.
        TernApi.call(this);

        var processSettings = createSettingsProcessor(this, globalSettings, projectSettings);
        globalSettings.on("change", processSettings);
        projectSettings.on("change", processSettings);
        processSettings();
    }


    LocalServer.prototype = new TernApi();
    LocalServer.prototype.constructor = LocalServer;


    LocalServer.prototype.request = function(body) {
        return this.worker.deferredSend({
            type: "request",
            body: body
        }, true);
    };


    LocalServer.prototype.clear = function() {
        this.worker.send({
            type: "clear"
        });
    };


    LocalServer.prototype.addFile = function(name, text) {
        this.worker.send({
            type: "addFile",
            name: name,
            text: text
        });
    };


    LocalServer.prototype.deleteFile = function(name) {
        this.worker.send({
            type: "deleteFile",
            name: name
        });
    };


    LocalServer.prototype.loadSettings = function(fullPath) {
        projectSettings.load(fullPath);
    };


    LocalServer.create = function(provider) {
        return new Promise(function(resolve) {
            var localServer = new LocalServer(provider);
            initialize(localServer);
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
        libs = _.toArray(libs).map(function(item) {
            if (item.indexOf("/") !== -1 || item.indexOf("\\") !== -1) {
                return "text!" + item + ".json";
            }

            return "text!" + TERN_DEFINITIONS + item + ".json";
        });

        return new Promise(function(resolve) {
            require(libs, function() {
                var defs = _.toArray(arguments).reduce(function(result, item) {
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


    return LocalServer;
});

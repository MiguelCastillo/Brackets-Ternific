/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module) {

    var spromise        = require("libs/js/spromise");
    var TernDemo        = require("TernDemo"),
        Settings        = require("Settings"),
        globalSettings  = require("text!./tern/.tern-project");

    var projectSettings = Settings();

    globalSettings = JSON.parse(globalSettings || {});


    function getWorker( provider ) {
        if ( getWorker.worker ) {
            return getWorker.worker;
        }

        // Create worker thread to process tern requests.
        var worker  = getWorker.worker = new Worker( module.uri.substr(0, module.uri.lastIndexOf("/")) + "/TernWorker.js" );
        var current = null,
            pending = null;

        worker.onmessage = function(e) {
            var data = e.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type == "getFile") {
                provider.getFile(data.name)
                    .done(function(text){
                        worker.send({
                            type: "addFile",
                            text: text,
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
            else if (data.id && current) {
                current.deferred.resolve(data);
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
        };


        worker.onerror = function(e) {
            if ( current ) {
                current.deferred.reject(e);
            }
        };


        worker.send = function send(data, callback) {
            // Some requests to tern dont need to be waited on...  So, just send tern
            // the message and exit out.
            if (!callback) {
                worker.postMessage(data);
                return;
            }

            // If there is already a pending request, we will besically invalidate that
            // request and queue up the incoming new one...  This will generally be the
            // case when someone types so fast that skipping results does not affect the
            // user; a person couldn't type that fast and use hints at the same time. :)
            if ( pending ) {
                pending.deferred.resolve();
            }

            // Message ID is no longer needed, but the worker thread needs it
            data.id = 1;

            // New request
            pending = {
                data: data,
                deferred: spromise.defer()
            };

            if ( current && current.deferred.state() === "pending" ) {
                return pending.deferred.then( resolvePending );
            }
            else {
                current = pending;
                pending = null;
                worker.postMessage(data);
                return current.deferred.then( resolvePending );
            }
        };


        function resolvePending(response) {
            // Send the last pending request
            if ( pending ) {
                current = pending;
                pending = null;
                worker.postMessage(current.data);
            }
            else {
                current = null;
            }

            return response.body;
        }


        return worker;
    }


    function init(provider) {
        var worker   = getWorker(provider);
        var instance = {
            send: worker.send,
            loadSettings: LocalServer.loadSettings,
            clear: function() {
                worker.send({
                    type: "clear"
                });
            },
            addFile: function(name, text) {
                worker.send({
                    type: "addFile",
                    name: name,
                    text: text
                });
            },
            deleleteFile: function(name) {
                worker.send({
                    type: "deleteFile",
                    name: name
                });
            },
            request: function(body) {
                return worker.send({
                    type: "request",
                    body: body
                }, true);
            },
        };

        // Init with empty settings. Until a document is open that can give us
        // some context...
        worker.send({
            type: "init",
            body: {}
        });

        // Call TernDemo and extend the instance.
        return $.extend(instance, TernDemo(instance));
    }


    function loadSettings( settings ) {
        var worker = getWorker(LocalServer.provider);
        settings = settings || $.extend({}, globalSettings);
        if ( settings === currentSettings ) {
            return;
        }

        currentSettings = settings;
        settings.libs = $.map(settings.libs || [], function(item) {
            return "text!./tern/defs/" + item + ".json";
        });

        require(settings.libs, function() {
            settings.defs = $.map(arguments, function(item) {
                return JSON.parse(item);
            });

            // Post an init message to load settings
            worker.send({
                type: "init",
                body: settings
            });
        });
    }


    var currentSettings;
    LocalServer.loadSettings = function(cm, fullPath) {
        projectSettings
            .load(".tern-project", fullPath)
            .done(loadSettings)
            .fail(function() {loadSettings();});
    };


    /**
    * Bridge to communicate into tern worker thread.
    */
    function LocalServer(provider) {
        LocalServer.provider = provider;

        return spromise(function(resolve) {
            resolve(init(provider));
        });
    }


    return LocalServer;
});

/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 * Fork by David Sánchez i Gregori
 * Licensed under MIT
 */


define(function(require, exports, module) {
    "use strict";
    var spromise        = require("libs/js/spromise");
    var TernDemo        = require("TernDemo"),
        Settings        = require("Settings"),
        globalSettingsTxt  = require("text!./tern/.tern-project"),
        globalSettings = {};

    var projectSettings = Settings();

   globalSettings = JSON.parse(globalSettingsTxt||"{}");


    // Free memory
    globalSettingsTxt=null;


    function getWorker(provider) {
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
            if (data.type === "getFile") {
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
            else if (data.type === "debug") {
                console.log(data.message);
            }
            else if (current) {
                current.deferred.resolve(data);
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

            // If there is already a pending request, we will basically invalidate that
            // request and queue up the incoming new one...  What this will do is that it
            // will make make sure we are only processing the first and last request for
            // hints.  Anything in the middle isn't as important because we are generally
            // interested in the very last input to properly show which hints are available
            // at the time the user stops typing.  Keeping track of the first request allows
            // me to make sure I don't flood tern with requests.
            if ( pending ) {
                pending.deferred.resolve();
            }

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
            }
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

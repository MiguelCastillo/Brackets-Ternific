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
        var msgId   = 1,
            pending = {};
        var lastRequest;

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
            else if (data.id && pending[data.id]) {
                pending[data.id].deferred.resolve(data);
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
        };


        worker.onerror = function(e) {
            if ( lastRequest ) {
                lastRequest.reject(e);
                pending = {};
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
            if ( pending[msgId] ) {
                pending[msgId].deferred.resolve();
            }

            // Queue up the next request to tern
            data.id = msgId;
            pending[msgId] = {
                data: data,
                deferred: spromise.defer()
                //,timer: new Timer(true)
            };

            if ( lastRequest && lastRequest.state() === "pending" ) {
                console.log("tern request is already pending", msgId);
                return pending[msgId].deferred.promise;
            }

            lastRequest = pending[msgId].deferred;
            worker.postMessage(data);
            msgId++;

            return lastRequest.then(function(response) {
                //console.log("last request finsihed", response.id, pending[response.id].timer.elapsed());
                pending[response.id] = null;

                // Send the last pending request
                if ( pending[msgId] ) {
                    lastRequest = pending[msgId].deferred;
                    worker.postMessage(pending[msgId].data);
                }

                // Reset the msgId so that we don't run into a very unlikely buffer overflow
                if ( msgId !== 2 ) {
                    msgId = 1;
                }

                return response.body;
            });
        };

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

define(function(require, exports, module) {

    var spromise = require("libs/js/spromise");
    var TernDemo = require("TernDemo");


    function init(provider, settings) {
        var worker  = new Worker( module.uri.substr(0, module.uri.lastIndexOf("/")) + "/TernWorker.js" );
        var msgId   = 1,
            pending = {},
            ready   = spromise.defer();

        var lastRequest;

        function send(data, callback) {
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

            return lastRequest.done(function(response) {
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
            });
        }


        worker.onmessage = function(e) {
            var data = e.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type == "getFile") {
                provider.getFile(data.name)
                    .done(function(text){
                        send({
                            type: "addFile",
                            text: text,
                            id: data.id
                        });
                    })
                    .fail(function(error) {
                        send({
                            type: "addFile",
                            err: String(error),
                            id: data.id
                        });
                    });
            }
            else if (data.id && pending[data.id]) {
                console.log(data);
                pending[data.id].deferred.resolve(data.body);
            }
            else if (data.type == "ready") {
                ready.resolve(instance);
            }
            else if (data.type == "debug") {
                console.log(data.message);
            }
        };


        worker.onerror = function(e) {
            lastRequest.reject(e);
            pending = {};
        };


        var instance = {
            send: send,
            clear: function() {
                instance.send({
                    type: "clear"
                });
            },
            addFile: function(name, text) {
                instance.send({
                    type: "addFile",
                    name: name,
                    text: text
                });
            },
            deleleteFile: function(name) {
                instance.send({
                    type: "deleteFile",
                    name: name
                });
            },
            request: function(body) {
                return instance.send({
                    type: "request",
                    body: body
                }, true);
            }
        };

        // Call TernDemo and extend the instance.
        $.extend(instance, TernDemo(instance));

        // Post an init message
        worker.postMessage({
            type: "init",
            data: $.extend({}, settings)
        });

        return ready.promise;
    }


    /**
    * Bridge to communicate into tern worker thread.
    */
    function LocalServer(provider) {
        var defs = [
            "text!./tern/defs/reserved.json",
            "text!./tern/defs/browser.json",
            "text!./tern/defs/chai.json",
            "text!./tern/defs/ecma5.json",
            "text!./tern/defs/browser.json",
            "text!./tern/defs/jquery.json",
            "text!./tern/defs/underscore.json"
        ];

        return spromise(function(resolve) {
            require(defs, function() {
                defs = $.map(arguments, function(item) {
                    return JSON.parse(item);
                });

                init(provider, {
                    defs: defs,
                    debug: true,
                    async: true,
                    plugins: {
                        requirejs: {},
                        doc_comment: {},
                        angular: {},
                        component: {}
                    }
                })
                .always(resolve);
            });
        });
    }


    return LocalServer;
});

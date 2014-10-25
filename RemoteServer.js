/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require /*, exports, module*/) {
    "use strict";

    var spromise = require("libs/js/spromise");
    var TernDemo = require("TernDemo");


    function init( provider, settings ) {

        function send(data) {
            return spromise(function(resolve, reject) {
                if ( !data.body ) {
                    return reject();
                }

                // Send query to the server
                $.ajax({
                    "url": "http://localhost:" + settings.port,
                    "type": "POST",
                    "contentType": "application/json; charset=utf-8",
                    "data": JSON.stringify(data.body)
                })
                .done(function(result) {
                    resolve(result, data);
                })
                .fail(reject);
            }).promise;
        }

        var instance = {
            send: send,
            loadSettings: $.noop,
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
            deleteFile: function(name) {
                instance.send({
                    type: "deleteFile",
                    name: name
                });
            },
            request: function(body) {
                return instance.send({
                    type: "request",
                    body: body
                });
            }
        };


        // Call TernDemo and extend the instance.
        $.extend(instance, TernDemo(instance));
        return instance;
    }


    /**
    * Bridge to communicate into tern worker thread.
    */
    function RemoteServer(provider) {
        var portDef = ['text!./.tern-port'];

        return spromise(function(resolve, reject) {
            require(portDef, function(port) {
                $.ajax({
                    "url": "http://localhost:" + port + "/ping",
                    "type": "GET"
                })
                .done(function(result) {
                    resolve(init(provider, {
                        port: port
                    }));
                })
                .fail(reject);
            });
        });
    }


    return RemoteServer;
});

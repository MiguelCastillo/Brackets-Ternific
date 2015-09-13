/**
 * Ternific Copyright (c) 2015 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    "use strict";

    var logger  = require("Logger").factory("LocalServer");
    var Promise = require("node_modules/spromise/dist/spromise.min");


    function createWorker(server, workerScript) {
        var worker  = new Worker(workerScript);
        var current = null;
        var pending = null;


        worker.onmessage = function(evt) {
            var data = evt.data;

            // If tern requests a file, then we will load it and then send it back to
            // tern as an addFile action.
            if (data.type === "getFile") {
                getFile(server, data);
            }
            else if (data.type === "debug") {
                logger.log(data.message);
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
            logger.error(e);
            if (current) {
                current.deferred.reject(e);
            }
        };


        function send(data) {
            logger.log(data.type, data);
            worker.postMessage(data);
        }


        function deferredSend(data) {
            logger.log(data.type, data);

            var request = {
                data: data,
                deferred: Promise.defer()
            };

            if (!current) {
                current = sendRequest(request);
            }
            else {
                if (pending) {
                    pending.deferred.resolve(null);
                }

                pending = request;
            }

            return request.deferred;
        }


        function sendRequest(request) {
            worker.postMessage(request.data);

            request.deferred
                .done(function(response) {
                    logger.log(response);
                    sendPending();
                })
                .fail(function(error) {
                    logger.error(error);
                    sendPending();
                });

            return request;
        }


        function sendPending() {
            current = null;
            if (pending) {
                current = sendRequest(pending);
                pending = null;
            }
        }


        return {
            send: send,
            deferredSend: deferredSend
        };
    }


    function getFile(server, data) {
        logger.log(data.type, data.name, data);
        server.documenProvider.getDocument(data.name)
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
    }


    return {
        create: createWorker
    };
});

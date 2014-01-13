/**
* Lifted from tern demo/worker.js and it has been adapted with a couple
* of extra features needed such as a ready message as well as a message
* to clear all the server data.
*/


importScripts("tern/node_modules/acorn/acorn.js", "tern/node_modules/acorn/acorn_loose.js", "tern/node_modules/acorn/util/walk.js",
              "tern/lib/signal.js", "tern/lib/tern.js", "tern/lib/def.js", "tern/lib/infer.js", "tern/lib/comment.js",
              "tern/plugin/requirejs.js", "tern/plugin/doc_comment.js");


function Server(settings) {
    var _self = this, nextId = 1;
    _self.pending = {};
    _self.server = new tern.Server({
        getFile: function(file, c) {
            _self.pending[nextId] = c;

            postMessage({
                type: "getFile",
                name: file,
                id: nextId
            });

            ++nextId;
        },
        async: settings.async,
        defs: settings.defs,
        debug: settings.debug,
        plugins: settings.plugins
    });

    postMessage({
        type:"ready"
    });
}


Server.prototype.clear = function() {
    this.server.reset();
    this.server.files = [];
};


Server.prototype.addFile = function(data) {
    var _self = this;

    if (data.id && _self.pending[data.id]){
        var c = _self.pending[data.id];
        delete _self.pending[data.id];
        c(data.err, data.text);
    }
    else {
        _self.server.addFile(data.name, data.text);
    }
};


Server.prototype.deleteFile = function(data) {
    this.server.delFile(data);
};


Server.prototype.request = function(data) {
    this.server.request(data.body, function(err, reqData) {
        postMessage({
            id: data.id,
            body: reqData,
            err: err && String(err)
        });
    });
};


onmessage = function(e) {
    var data = e.data;
    var method = Server.instance && Server.instance[data.type];

    if ( typeof method === 'function' ) {
        return method.apply(Server.instance, [data || {}]);
    }

    switch (data.type) {
        case "init":
            Server.instance = new Server(data.data);
            break;
        default:
            throw new Error("Unknown message type: " + data.type);
    }
};


var console = {
    log: function(v) {
        postMessage({
            type: "debug",
            message: v
        });
    }
};

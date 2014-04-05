/**
* Lifted from tern demo/worker.js and it has been adapted with a couple
* of extra features needed such as a ready message as well as a message
* to clear all the server data.
*/


importScripts("tern/node_modules/acorn/acorn.js",
              "tern/node_modules/acorn/acorn_loose.js",
              "tern/node_modules/acorn/util/walk.js",
              "tern/lib/signal.js",
              "tern/lib/tern.js",
              "tern/lib/def.js",
              "tern/lib/infer.js",
              "tern/lib/comment.js");


function Extender(/*target, [source]+ */) {
    var sources = Array.prototype.slice.call(arguments),
        target  = sources.shift();

    for ( var source in sources ) {
        source = sources[source];

        // Copy properties
        for (var property in source) {
            target[property] = source[property];
        }
    }

    return target;
}


function LoadPlugins(settings) {
    var plugins = [];
    for ( var i in settings.plugins ) {
        plugins.push("tern/plugin/" + i + ".js");
    }

    // Import plugins
    importScripts.apply((void 0), plugins);
}


function Server(settings) {
    var _self = this, nextId = 1;
    _self.pending = {};

    LoadPlugins(settings);
    Extender(settings, {
        getFile: function(file, c) {
            _self.pending[nextId] = c;

            postMessage({
                type: "getFile",
                name: file,
                id: nextId
            });

            ++nextId;
        }
    });

    // Instantiate tern server.
    _self.server = new tern.Server(settings);

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

    if ( data.type === "init" ) {
        Server.instance = new Server(data.body || {});
        return;
    }

    if ( typeof method === 'function' ) {
        return method.apply(Server.instance, [data || {}]);
    }

    switch (data.type) {
        default:
            throw new Error("Unknown message type: " + data.type);
    }
};


var console = {
    log: function(v) {
        postMessage({
            type: "debug",
            message: arguments
        });
    }
};


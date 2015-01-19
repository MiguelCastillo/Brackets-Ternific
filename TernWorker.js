/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


importScripts("libs/tern/node_modules/acorn/acorn.js",
              "libs/tern/node_modules/acorn/acorn_loose.js",
              "libs/tern/node_modules/acorn/util/walk.js",
              "libs/tern/lib/signal.js",
              "libs/tern/lib/tern.js",
              "libs/tern/lib/def.js",
              "libs/tern/lib/infer.js",
              "libs/tern/lib/comment.js");


function Extender(/*target, [source]+ */) {
    var sources = Array.prototype.slice.call(arguments),
        target  = sources.shift();

    for (var source in sources) {
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
    for (var i in settings.plugins) {
        plugins.push("libs/tern/plugin/" + i + ".js");
    }

    // Import plugins
    importScripts.apply((void 0), plugins);
}


function Server(settings) {
    var _self = this,
        nextId = 1;

    this.pending = {};
    LoadPlugins(settings);
    Extender(settings, {
        getFile: getFile
    });


    // Instantiate tern server.
    this.settings = settings;
    this.server   = new tern.Server(settings);

    postMessage({
        type:"ready"
    });

    function getFile(file, c) {
        _self.pending[nextId] = c;
        postMessage({
            type: "getFile",
            name: file,
            id: nextId
        });
        ++nextId;
    }
}


Server.prototype.clear = function() {
    this.server = new tern.Server(this.settings || {});
};


Server.prototype.addFile = function(data) {
    var _self = this;

    if (data.id && _self.pending[data.id]) {
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
    function done(err, reqData) {
        postMessage({
            id: data.id,
            body: reqData,
            err: err && String(err)
        });
    }

    try {
        this.server.request(data.body, done);
    }
    catch(ex) {
        done(ex);
    }
};


onmessage = function(e) {
    var data = e.data;
    var method = Server.instance && Server.instance[data.type];

    if (data.type === "init") {
        Server.instance = new Server(data.body || {});
        return;
    }

    if (typeof method === 'function') {
        return method.apply(Server.instance, [data || {}]);
    }

    throw new TypeError("Unknown message type: " + data.type);
};


var logger = {
    log: function() {
        postMessage({
            type: "debug",
            message: arguments
        });
    }
};


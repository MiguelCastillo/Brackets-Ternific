/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


importScripts(
    "node_modules/tern/node_modules/acorn/dist/acorn.js",
    "node_modules/tern/node_modules/acorn/dist/acorn_loose.js",
    "node_modules/tern/node_modules/acorn/dist/walk.js",
    "node_modules/tern/lib/signal.js",
    "node_modules/tern/lib/tern.js",
    "node_modules/tern/lib/def.js",
    "node_modules/tern/lib/infer.js",
    "node_modules/tern/lib/comment.js"
);


var TERN_ROOT    = "node_modules/tern/";
var TERN_PLUGINS = TERN_ROOT + "plugin/";



function Extender(target /*, [source]+ */) {
  var source, length, i;
  target = target || {};

  // Allow n params to be passed in to extend this object
  for (i = 1, length  = arguments.length; i < length; i++) {
    source = arguments[i];
    for (var property in source) {
      if (source.hasOwnProperty(property)) {
        target[property] = source[property];
      }
    }
  }

  return target;
}


function LoadPlugins(settings) {
    var plugins = [], plugin;

    for (var pluginName in settings.plugins) {
        plugin = settings.plugins[pluginName];

        if (pluginName.indexOf("/") !== -1 || pluginName.indexOf("\\") !== -1) {
            plugins.push(pluginName + ".js");
        }
        else {
            plugins.push(TERN_PLUGINS + pluginName + ".js");
        }
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


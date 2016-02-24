/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


importScripts("node_modules/requirejs/require.js");


require.config({
    baseUrl: "node_modules/",
    packages: [{
        name: "acorn",
        main: "dist/acorn",
        location: "tern/node_modules/acorn"
    }]
});


require(["tern/lib/tern"], function(tern) {
  var TERN_ROOT    = "tern/";
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


  function parsePlugins(settings) {
      var paths = [], configs = {}, config, name;

      for (var pluginKey in settings.plugins) {
          config = settings.plugins[pluginKey];

          //https://regex101.com/r/cJ7wX6/1
          pluginKey = pluginKey.replace(/[\/\\]+/g, "/");

          if (pluginKey.indexOf("/") !== -1) {
              paths.push(pluginKey + ".js");
          }
          else {
              paths.push(TERN_PLUGINS + pluginKey);
          }

          //https://regex101.com/r/nT6tR7/1
          name = /\/?(\w+)(?:[.\w]+)?$/.exec(pluginKey)[1];
          configs[name] = config;
      }

      return {
          paths: paths,
          configs: configs
      };
  }


  function Server(settings) {
      this.pending = {};
      var nextId = 1;
      var plugins = parsePlugins(settings);

      require(plugins.paths, function() {
        this.settings = Extender({}, settings, {
            getFile: getFile.bind(this),
            plugins: plugins.configs
        });

        this.server = new tern.Server(this.settings);

        postMessage({ type: "ready" });

        function getFile(file, c) {
            this.pending[nextId] = c;
            postMessage({
                type: "getFile",
                name: file,
                id: nextId
            });
            ++nextId;
        }
      }.bind(this));
  }


  Server.prototype.clear = function() {
      this.server = new tern.Server(this.settings || {});
  };


  Server.prototype.addFile = function(data) {
      if (data.id && this.pending[data.id]) {
          var c = this.pending[data.id];
          delete this.pending[data.id];
          c(data.err, data.text);
      }
      else {
          this.server.addFile(data.name, data.text);
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


  var serverInstance;
  onmessage = function(e) {
      var data = e.data;
      var method = serverInstance && serverInstance[data.type];

      if (data.type === "init") {
          serverInstance = new Server(data.body || {});
      }
      else if (typeof method === "function") {
          method.apply(serverInstance, [data || {}]);
      }
      else if (serverInstance) {
          throw new TypeError("Unknown message type: " + data.type);
      }
  };


  var logger = {
      log: function() {
          postMessage({
              type: "debug",
              message: arguments
          });
      }
  };
});

/**
* Lifter from tern demo/worker.js and it has been adapted with a couple
* of extra features needed such as a ready message as wel as a message
* to clear all the server data.
*/


importScripts("tern/node_modules/acorn/acorn.js", "tern/node_modules/acorn/acorn_loose.js", "tern/node_modules/acorn/util/walk.js",
              "tern/lib/tern.js", "tern/lib/def.js", "tern/lib/jsdoc.js", "tern/lib/infer.js", "tern/plugin/requirejs.js");

var server;

onmessage = function(e) {
  var data = e.data;
  switch (data.type) {
  case "defs": return startServer(data.data);
  case "clear":
    server.reset();
    server.files = [];
    break;
  case "add": return server.addFile(data.name, data.text);
  case "del": return server.delFile(data.name);
  case "req": return server.request(data.body, function(err, reqData) {
    postMessage({id: data.id, body: reqData, err: err && String(err)});
  });
  case "getFile":
    var c = pending[data.id];
    delete pending[data.id];
    return c(data.err, data.text);
  default: throw new Error("Unknown message type: " + data.type);
  }
};

var nextId = 0, pending = {};
function getFile(file, c) {
  postMessage({type: "getFile", name: file, id: ++nextId});
  pending[nextId] = c;
}

function startServer(defs) {
  server = new tern.Server({
    getFile: getFile,
    async: true,
    defs: defs,
    debug: true,
    plugins: {requirejs: {}}
  });

  postMessage({type:"ready"});
}

var console = {
  log: function(v) { postMessage({type: "debug", message: v}); }
};

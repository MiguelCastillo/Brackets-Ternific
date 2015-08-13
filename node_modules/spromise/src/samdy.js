/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

var define, require;
(function() {
  var root = this,
      cache = {};

  /**
   * Load the module by calling its factory with the appropriate dependencies, if at all possible
   */
  function load(mod) {
    if (typeof(mod.factory) === "function") {
      return require(mod.deps, mod.factory);
    }
    return mod.factory;
  }

  /**
   * Resolve dependencies
   */
  function resolve(deps, rem) {
    var i, length, dep, mod, result = [];

    for (i = 0, length = deps.length; i < length; i++) {
      dep = deps[i];
      mod = cache[dep] || rem[dep];

      if (!mod) {
        throw new TypeError("Module " + dep + " has not yet been loaded");
      }

      if (cache[dep]) {
        if (!mod.hasOwnProperty("code")) {
          mod.code = load(mod);
        }
        result[i] = mod.code;
      }
      else {
        result[i] = mod;
      }
    }

    return result;
  }

  /**
   * Interface to retrieve a module and resolve any unresolved dependencies.
   */
  require = function require(deps, factory) {
    var name, result, rem = {};
    rem.require = require;
    rem.exports = {};
    rem.module  = {exports: rem.exports};

    if (typeof(deps) === "string") {
      name = deps;
      deps = [deps];
    }

    if (deps.length) {
      deps = resolve(deps.slice(0), rem);
    }

    if (typeof(factory) === "function") {
      result = factory.apply(root, deps);
    }
    else {
      result = cache[name] ? cache[name].code : factory;
    }

    return result === (void 0) ? rem.module.exports : result;
  };

  /**
   * Interface to register a module.  Only named module can be registered.
   */
  define = function define(name, deps, factory) {
    cache[name] = {
      name: name,
      deps: deps,
      factory: factory
    };
  };

}).call(this);

/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

(function() {
  "use strict";

  var Promise = require("./promise"),
      async   = require("./async");

  function _result(input, args, context) {
    if (typeof(input) === "function") {
      return input.apply(context, args||[]);
    }
    return input;
  }

  function All(values) {
    values = values || [];

    // The input is the queue of items that need to be resolved.
    var resolutions = [],
        promise     = Promise.defer(),
        context     = this,
        remaining   = values.length;

    if (!values.length) {
      return promise.resolve(values);
    }

    // Check everytime a new resolved promise occurs if we are done processing all
    // the dependent promises.  If they are all done, then resolve the when promise
    function checkPending() {
      remaining--;
      if (!remaining) {
        promise.resolve.call(context, resolutions);
      }
    }

    // Wrap the resolution to keep track of the proper index in the closure
    function resolve(index) {
      return function() {
        resolutions[index] = arguments.length === 1 ? arguments[0] : arguments;
        checkPending();
      };
    }

    function processQueue() {
      var i, item, length;
      for (i = 0, length = remaining; i < length; i++) {
        item = values[i];
        if (item && typeof item.then === "function") {
          item.then(resolve(i), promise.reject);
        }
        else {
          resolutions[i] = _result(item);
          checkPending();
        }
      }
    }

    // Process the promises and callbacks
    async(processQueue);
    return promise;
  }

  module.exports = All;
}());


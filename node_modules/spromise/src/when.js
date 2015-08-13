/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

(function() {
  "use strict";

  var Promise = require("./promise"),
      All     = require("./all");

  /**
   * Interface to allow multiple promises to be synchronized
   */
  function When() {
    var context = this, args = arguments;
    return new Promise(function(resolve, reject) {
      All.call(context, args).then(function(results) {
        resolve.apply(context, results);
      },
      function(reason) {
        reject.call(context, reason);
      });
    });
  }

  module.exports = When;
}());

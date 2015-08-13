/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

(function() {
  "use strict";

  var Promise   = require("./promise");
  Promise.async = require("./async");
  Promise.when  = require("./when");
  Promise.all   = require("./all");
  Promise.race  = require("./race");

  module.exports = Promise;
}());

/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

(function() {
  "use strict";

  var Promise = require("./promise");

  function Race(iterable) {
    if (!iterable) {
      return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
      var i, length, _done = false;
      for (i = 0, length = iterable.length; i < length; i++) {
        iterable[i].then(_resolve, _reject);
      }

      function _resolve() {
        if (!_done) {
          _done = true;
          /*jshint -W040 */
          resolve.apply(this, arguments);
          /*jshint +W040 */
        }
      }

      function _reject() {
        if (!_done) {
          _done = true;
          /*jshint -W040 */
          reject.apply(this, arguments);
          /*jshint +W040 */
        }
      }
    });
  }

  module.exports = Race;
}());

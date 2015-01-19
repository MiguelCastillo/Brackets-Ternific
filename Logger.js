define(function(require, exports, module) {
    "use strict";

    var _enabled = false,
        _only    = false;

    function getDate() {
      return (new Date()).getTime();
    }

    function Logger(name) {
      this.name = name;
      this._enabled = true;
    }

    Logger.prototype.factory = function(name) {
      return new Logger(name);
    };

    Logger.prototype.log = function() {
      if (!this.isEnabled()) {
        return;
      }

      console.log.apply(console, [getDate(), this.name].concat(arguments));
    };

    Logger.prototype.dir = function() {
      if (!this.isEnabled()) {
        return;
      }

      console.dir.apply(console, arguments);
    };

    Logger.prototype.error = function() {
      if (!this.isEnabled()) {
        return;
      }

      console.error.apply(console, arguments);
    };

    Logger.prototype.isEnabled = function() {
      return this._enabled && _enabled && (!_only || _only === this.name);
    };

    Logger.prototype.enable = function() {
      this._enabled = true;
    };

    Logger.prototype.disable = function() {
      this._enabled = false;
    };

    Logger.prototype.only = function() {
      Logger._only = this.name;
    };

    Logger.prototype.all = function() {
      Logger._only = null;
    };

    Logger.prototype.disableAll = function() {
      Logger.disable();
    };

    Logger.prototype.enableAll = function() {
      Logger.enable();
    };


    // Expose the constructor to be able to create new instances from an
    // existing instance.
    Logger.prototype.Logger = Logger;
    Logger._enabled = typeof(console) !== 'undefined';
    Logger.enable  = function() {
      _enabled = true;
    };

    Logger.disable = function() {
      _enabled = false;
    };

    Logger.only = function(name) {
      _only = name;
    };

    module.exports = new Logger();
});

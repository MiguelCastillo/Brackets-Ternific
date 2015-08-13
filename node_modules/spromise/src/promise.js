/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */

(function() {
  "use strict";

  var async = require("./async");

  var states = {
    "pending"  : 0,
    "resolved" : 1,
    "rejected" : 2,
    "always"   : 3,
    "notify"   : 4
  };

  var strStates = [
    "pending",
    "resolved",
    "rejected"
  ];

  /**
   * Small Promise
   */
  function Promise(resolver, stateManager) {
    stateManager = stateManager || new StateManager();
    var target = this;

    target.then = function(onResolved, onRejected) {
      return stateManager.then(onResolved, onRejected);
    };

    target.resolve = function() {
      stateManager.transition(states.resolved, arguments, this);
      return target;
    };

    target.reject = function() {
      stateManager.transition(states.rejected, arguments, this);
      return target;
    };

    // Read only access point for the promise.
    target.promise = {
      then   : target.then,
      always : target.always,
      done   : target.done,
      catch  : target.fail,
      fail   : target.fail,
      notify : target.notify,
      state  : target.state,
      constructor : Promise // Helper to detect spromise instances
    };

    target.promise.promise = target.promise;
    target.then.stateManager = stateManager;

    if (resolver) {
      resolver.call(target, target.resolve, target.reject);
    }
  }

  Promise.prototype.done = function(cb) {
    this.then.stateManager.enqueue(states.resolved, cb);
    return this.promise;
  };

  Promise.prototype.catch = Promise.prototype.fail = function(cb) {
    this.then.stateManager.enqueue(states.rejected, cb);
    return this.promise;
  };

  Promise.prototype.finally = Promise.prototype.always = function(cb) {
    this.then.stateManager.enqueue(states.always, cb);
    return this.promise;
  };

  Promise.prototype.notify = function(cb) {
    this.then.stateManager.enqueue(states.notify, cb);
    return this.promise;
  };

  Promise.prototype.state = function() {
    return strStates[this.then.stateManager.state];
  };

  Promise.prototype.isPending = function() {
    return this.then.stateManager.state === states.pending;
  };

  Promise.prototype.isResolved = function() {
    return this.then.stateManager.state === states.resolved;
  };

  Promise.prototype.isRejected = function() {
    return this.then.stateManager.state === states.resolved;
  };

  Promise.prototype.delay = function delay(ms) {
    var _self = this;
    return new Promise(function(resolve, reject) {
      _self.then(function() {
        async.delay(resolve.bind(this), ms, arguments);
      }, reject.bind(this));
    });
  };

  /**
   * Provides a set of interfaces to manage callback queues and the resolution state
   * of the promises.
   */
  function StateManager(options) {
    // Initial state is pending
    this.state = states.pending;

    // If a state is passed in, then we go ahead and initialize the state manager with it
    if (options && options.state) {
      this.transition(options.state, options.value, options.context);
    }
  }

  /**
   * Figure out if the promise is pending/resolved/rejected and do the appropriate
   * action with the callback based on that.
   */
  StateManager.prototype.enqueue = function (state, cb) {
    if (!this.state) {
      (this.queue || (this.queue = [])).push(TaskAction);
    }
    else {
      // If the promise has already been resolved and its queue has been processed, then
      // we need to schedule the new task for processing ASAP by putting in the asyncQueue
      TaskManager.asyncTask(TaskAction);
    }

    var stateManager = this;
    function TaskAction() {
      if (stateManager.state === state || states.always === state) {
        cb.apply(stateManager.context, stateManager.value);
      }
      else if (states.notify === state) {
        cb.call(stateManager.context, stateManager.state, stateManager.value);
      }
    }
  };

  /**
   * Transitions the state of the promise from pending to either resolved or
   * rejected.  If the promise has already been resolved or rejected, then
   * this is a noop.
   */
  StateManager.prototype.transition = function (state, value, context) {
    if (this.state) {
      return;
    }

    this.state   = state;
    this.context = context;
    this.value   = value;

    var queue = this.queue;
    if (queue) {
      this.queue = null;
      TaskManager.asyncQueue(queue);
    }
  };

  // 2.2.7: https://promisesaplus.com/#point-40
  StateManager.prototype.then = function(onResolved, onRejected) {
    var stateManager = this;

    // Make sure onResolved and onRejected are functions, or null otherwise
    onResolved = (onResolved && typeof(onResolved) === "function") ? onResolved : null;
    onRejected = (onRejected && typeof(onRejected) === "function") ? onRejected : null;

    // 2.2.7.3 and 2.2.7.4: https://promisesaplus.com/#point-43
    // If there are no onResolved or onRejected callbacks and the promise
    // is already resolved, we just return a new promise and copy the state
    if ((!onResolved && stateManager.state === states.resolved) ||
        (!onRejected && stateManager.state === states.rejected)) {
      return new Promise(null, stateManager);
    }

    var promise = new Promise();
    stateManager.enqueue(states.notify, function NotifyAction(state, value) {
      var handler = (state === states.resolved) ? (onResolved || onRejected) : (onRejected || onResolved);
      if (handler) {
        value = StateManager.runHandler(state, value, this, promise, handler);
      }

      if (value !== false) {
        (new Resolution({promise: promise})).finalize(state, value, this);
      }
    });
    return promise;
  };


  StateManager.runHandler = function(state, value, context, promise, handler) {
    // Try catch in case calling the handler throws an exception
    try {
      value = handler.apply(context, value);
    }
    catch(ex) {
      printDebug(ex);
      promise.reject.call(context, ex);
      return false;
    }

    return value === undefined ? [] : [value];
  };


  /**
   * Thenable resolution
   */
  function Resolution(options) {
    this.promise = options.promise;
  }

  /**
   * Promise resolution procedure
   *
   * @param {states} state - Is the state of the promise resolution (resolved/rejected)
   * @param {array} value - Is value of the resolved promise
   * @param {context} context - Is that context used when calling resolved/rejected
   */
  Resolution.prototype.finalize = function(state, value, context) {
    var resolution = this,
        promise    = this.promise,
        input, pending;

    if (value.length) {
      input = value[0];

      // 2.3.1 https://promisesaplus.com/#point-48
      if (input === promise) {
        pending = promise.reject.call(context, new TypeError("Resolution input must not be the promise being resolved"));
      }

      // 2.3.2 https://promisesaplus.com/#point-49
      // if the incoming promise is an instance of spromise, we adopt its state
      else if (input && input.constructor === Promise) {
        pending = input.notify(function NotifyDelegate(state, value) {
          resolution.finalize(state, value, this);
        });
      }

      // 2.3.3 https://promisesaplus.com/#point-53
      // Otherwise, if x is an object or function
      else if (input !== undefined && input !== null) {
        switch(typeof(input)) {
          case "object":
          case "function":
            pending = this.runThenable(input, context);
        }
      }
    }

    // 2.3.4 https://promisesaplus.com/#point-64
    // If x is not an object or function, fulfill promise with x.
    if (!pending) {
      if (state === states.resolved) {
        promise.resolve.apply(context, value);
      }
      else {
        promise.reject.apply(context, value);
      }
    }
  };

  /**
   * Run thenable.
   */
  Resolution.prototype.runThenable = function(thenable, context) {
    var resolution = this,
        resolved   = false;

    try {
      // 2.3.3.1 https://promisesaplus.com/#point-54
      var then = thenable.then;  // Reading `.then` could throw
      if (typeof(then) === "function") {
        // 2.3.3.3 https://promisesaplus.com/#point-56
        then.call(thenable, function resolvePromise() {
          if (!resolved) { resolved = true;
            resolution.finalize(states.resolved, arguments, this);
          }
        }, function rejectPromise() {
          if (!resolved) { resolved = true;
            resolution.promise.reject.apply(this, arguments);
          }
        });

        return true;
      }
    }
    catch (ex) {
      if (!resolved) {
        resolution.promise.reject.call(context, ex);
      }

      return true;
    }

    return false;
  };

  /**
   * Task manager to handle queuing up async tasks in an optimal manner
   */
  var TaskManager = {
    _asyncQueue: [],
    asyncTask: function(task) {
      if (TaskManager._asyncQueue.push(task) === 1) {
        async(TaskManager.taskRunner(TaskManager._asyncQueue));
      }
    },
    asyncQueue: function(queue) {
      if (queue.length === 1) {
        TaskManager.asyncTask(queue[0]);
      }
      else {
        TaskManager.asyncTask(TaskManager.taskRunner(queue));
      }
    },
    taskRunner: function(queue) {
      return function runTasks() {
        var task;
        while ((task = queue[0])) {
          TaskManager._runTask(task);
          queue.shift();
        }
      };
    },
    _runTask: function(task) {
      try {
        task();
      }
      catch(ex) {
        printDebug(ex);
      }
    }
  };

  function printDebug(ex) {
    if (Factory.debug) {
      console.error(ex);
      if (ex && ex.stack) {
        console.log(ex.stack);
      }
    }
  }

  /**
   * Public interface to create promises
   */
  function Factory(resolver) {
    return new Promise(resolver);
  }

  // Enable type check with instanceof
  Factory.prototype = Promise.prototype;

  /**
   * Interface to play nice with libraries like when and q.
   */
  Factory.defer = function () {
    return new Promise();
  };

  /**
   * Create a promise that's already rejected
   *
   * @returns {Promise} A promise that is alraedy rejected with the input value
   */
  Factory.reject = function () {
    return new Promise(null, new StateManager({
      context: this,
      value: arguments,
      state: states.rejected
    }));
  };

  /**
   * Interface that makes sure a promise is returned, regardless of the input.
   * 1. If the input is a promsie, then that's immediately returned.
   * 2. If the input is a thenable (has a then method), then a new promise is returned
   *    that's chained to the input thenable.
   * 3. If the input is any other value, then a new promise is returned and resolved with
   *    the input value
   *
   * @returns {Promise}
   */
  Factory.resolve = Factory.thenable = function (value) {
    if (value) {
      if (value.constructor === Promise) {
        return value;
      }
      else if (typeof(value.then) === "function") {
        return new Promise(value.then);
      }
    }

    return new Promise(null, new StateManager({
      context: this,
      value: arguments,
      state: states.resolved
    }));
  };

  /**
   * Creates a promise that's resolved after ms number of milleseconds. All arguments passed
   * in to delay, with the excpetion of ms, will be used to resolve the new promise with.
   *
   * @param {number} ms - Number of milliseconds to wait before the promise is resolved.
   */
  Factory.delay = function delay(ms) {
    var args = Array.prototype.slice(arguments, 1);
    return new Promise(function(resolve) {
      async.delay(resolve.bind(this), ms, args);
    });
  };

  // Expose enums for the states
  Factory.states = states;
  Factory.debug  = false;
  module.exports = Factory;
}());

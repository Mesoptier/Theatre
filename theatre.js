var Q = require("q");
var util = require("util");

module.exports = Theatre;

function Theatre() {
  this._instances = new WeakMap();
  this._overrides = new WeakMap();
}

/**
 * Resolves the dependencies for a class and then instantiates the class.
 *
 * @param {Function|Array.<Function>} classy Class or array of classes to instantiate
 * @returns {Promise.<Object>|Promise.<Array.<Object>>} Instance or array of instances
 */
Theatre.prototype.resolve = function (classy) {
  if (util.isArray(classy))
    return this._resolveAll(classy);

  if (this._overrides.has(classy))
    classy = this._overrides.get(classy);

  var cyclePath = this._detectCycle(classy);
  if (cyclePath !== false)
    return Q.reject(this._createCycleDetectedError(cyclePath));

  var singleton = false;
  var dependencies = [];

  if (typeof classy.__theatre !== "undefined") {
    if (typeof classy.__theatre.single !== "undefined")
      singleton = classy.__theatre.single;

    if (typeof classy.__theatre.inject !== "undefined")
      dependencies = classy.__theatre.inject;
  }

  // If this class is a singleton and we already have a promise for an instance, return the promise
  if (singleton && this._instances.has(classy))
    return this._instances.get(classy);

  // After the dependencies are resolved, instantiate the class
  var instancePromise = this._resolveAll(dependencies)
    .then(function (resolved) {
      var tmpClass = function () {};
      tmpClass.prototype = classy.prototype;
      var instance = new tmpClass();
      var maybePromise = classy.apply(instance, resolved);
      instance.constructor = classy;

      return Q(maybePromise)
        .thenResolve(instance);
    });

  if (singleton)
    this._instances.set(classy, instancePromise);

  return instancePromise;
};

/**
 * Resolves an array of promises.
 *
 * @param {Array} classes Array of classes to resolve.
 * @returns {Promise.<Array.<Object>>} Array of instances.
 * @private
 */
Theatre.prototype._resolveAll = function (classes) {
  classes = classes.map(function (classy) {
    return this.resolve(classy);
  }, this);

  return Q.all(classes);
};

/**
 * Adds an override for a class.
 *
 * @param {Function} oldClass Class to be overridden.
 * @param {Function} newClass New class to override the old one with.
 */
Theatre.prototype.addOverride = function (oldClass, newClass) {
  this._overrides.set(oldClass, newClass);
};

/**
 * Removes an override for a class.
 *
 * @param {Function} oldClass Overridden class to be returned to normal.
 */
Theatre.prototype.removeOverride = function (oldClass) {
  this._overrides.delete(oldClass);
};

/**
 * Removes all overrides.
 */
Theatre.prototype.removeAllOverrides = function () {
  // Weakmap#clear() was removed, so we just create a new WeakMap
  this._overrides = new WeakMap();
};

/**
 * Detects cycles in the dependencies of classes.
 *
 * @param {Function} classy Class to check the dependency list for.
 * @param {Array} [ancestors] Ancestors of the class.
 * @returns {boolean|Array.<Function>} The path if a cycle was found, otherwise false.
 * @private
 */
Theatre.prototype._detectCycle = function (classy, ancestors) {
  if (this._overrides.has(classy))
    classy = this._overrides.get(classy);

  if (typeof ancestors === "undefined") {
    ancestors = [];
  } else if (ancestors.indexOf(classy) != -1) {
    var path = ancestors.slice(ancestors.indexOf(classy));
    path.push(classy);
    return path;
  }

  if (classy.__theatre && classy.__theatre.inject) {
    var dependencies = classy.__theatre.inject;

    ancestors = ancestors.slice(0);
    ancestors.push(classy);

    for (var i = 0, result; i < dependencies.length; i++) {
      result = this._detectCycle(dependencies[i], ancestors);
      if (result !== false)
        return result;
    }
  }

  return false;
};

Theatre.prototype._createCycleDetectedError = function (path) {
  path = path.map(function (classy) {
    return classy.name || "Anonymous";
  }).join(" -> ");

  return new Error("Cycle detected in class dependencies: " + path);
};
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

  if (this._detectCycle(classy))
    return Q.reject(new Error("Class dependencies contain a cycle"));

  var singleton = false;
  var dependencies = [];

  if (typeof classy.__theatre !== "undefined") {
    if (typeof classy.__theatre.single !== "undefined")
      singleton = classy.__theatre.single;

    if (typeof classy.__theatre.inject !== "undefined")
      dependencies = classy.__theatre.inject;
  }

  // If this class is a singleton and we already have an instance, return the instance
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
 * @returns {boolean} Whether a cycle was detected.
 * @private
 */
Theatre.prototype._detectCycle = function (classy, ancestors) {
  if (typeof ancestors === "undefined")
    ancestors = [];

  if (ancestors.indexOf(classy) != -1)
    return true;

  ancestors = ancestors.slice(0);
  ancestors.push(classy);

  if (classy.__theatre && classy.__theatre.inject) {
    var dependencies = classy.__theatre.inject;
  } else {
    return false;
  }

  for (var i = 0; i < dependencies.length; i++) {
    if (this._detectCycle(dependencies[i], ancestors))
      return true;
  }

  return false;
}
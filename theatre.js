var Q = require("q");

module.exports = Theatre;

function Theatre() {
  this._instances = new WeakMap();
  this._overrides = new WeakMap();
}

/**
 *
 * @param classy
 * @returns {Promise.<Object>}
 */
Theatre.prototype.resolve = function (classy) {
  if (this._overrides.has(classy))
    classy = this._overrides.get(classy);

  if (detectCycle(classy))
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

  // Create resolve-promises for the dependencies
  dependencies = dependencies.map(function (dependency) {
    return this.resolve(dependency);
  }, this);

  // After the dependencies are resolved, instantiate the class
  var instancePromise = Q.all(dependencies)
    .then(function (resolved) {
      var tmpClass = function () {};
      tmpClass.prototype = classy.prototype;
      var instance = new tmpClass();
      var maybePromise = classy.apply(instance, resolved);
      instance.constructor = classy;

      return Q(maybePromise)
        .then(function () {
          return instance;
        });
    });

  if (singleton)
    this._instances.set(classy, instancePromise);

  return instancePromise;
};

/**
 * Adds an override for a class.
 *
 * @param oldClass Class to be overridden.
 * @param newClass New class to override the old one with.
 */
Theatre.prototype.addOverride = function (oldClass, newClass) {
  this._overrides.set(oldClass, newClass);
};

/**
 * Removes an override for a class.
 *
 * @param oldClass Overridden class to be returned to normal.
 */
Theatre.prototype.removeOverride = function (oldClass) {
  this._overrides.delete(oldClass);
};

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
 */
function detectCycle(classy, ancestors) {
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
    if (detectCycle(dependencies[i], ancestors))
      return true;
  }

  return false;
}
__Work in progress!__

Theatre
=======

Small dependency injection framework for Node.js. Features:
  * [Constructor injection](http://en.wikipedia.org/wiki/Dependency_injection#Constructor_injection)
  * Asynchronous constructors using promises
  * Class overriding/mocking


## Usage
To install, simply run `npm install theatre`.

_Note:_ Theatre uses ES6's WeakMap, so any app using it needs Node.js to be run with either the `--harmony_collections` or `--harmony` flag.


### Defining a class
Theatre works with regular Javascript classes. Class options (such as dependencies) are placed in the `__theatre` property. This means that classes can also be used without Theatre, and also that dependencies can include classes that weren't specifically designed for Theatre.

#### `__theatre` options
  * `single` - Boolean, default: `false` - Whether the class should only be instantiated once
  * `inject` - Array, default: `[]` - List of dependencies, items are classes

##### Example
```javascript
var Logger = require("./logger");

module.exports = Shouter;

Shouter.__theatre = {
  single: true, // The class is a singleton
  inject: [
    Logger // The class depends on the Logger class
  ]
};

function Shouter(logger) {
  this.logger = logger;
}

Shouter.prototype.log = function (message) {
  this.logger(message.toUpperCase());
};
```


### Resolving a class
#### `Theatre#resolve(classy)`
  * `classy` - Function or Array.<Function> - Class or array of classes to instantiate
  
Resolves the dependencies for a class and then instantiates the class. Returns a promise for an instance of the given class. 

If `classy` is a singleton and has already been requested, the promise for the previous request is returned.<br>

##### Example
```javascript
var Theatre = require("theatre");
var Shouter = require("./shouter");

var app = new Theatre();

app.resolve(Shouter).then(function (shouter) {
  shouter.log("Hello, world!"); // -> HELLO, WORLD!
});
```


### Overriding a class
When a resolve request is made for an overridden class, the resolver uses the class with which it was overridden instead. This allows you easily mock dependencies during testing.

#### `Theatre#addOverride(oldClass, newClass)`
  * `oldClass` - Function - Class to be overridden.
  * `newClass` - Function - New class to override the old one with.

Adds an override.

#### `Theatre#removeOverride(oldClass)`
  * `oldClass` - Function - Overridden class to be returned to normal.

Removes an override.

#### `Theatre#removeAllOverrides()`
Removes all overrides.

##### Example
```javascript
app.addOverride(Shouter, MockShouter);

app.resolve(Shouter).then(function (shouter1) {
  console.log(shouter1 instanceof MockShouter); // -> true
  
  app.removeOverride(Shouter);
  
  app.resolve(Shouter).then(function (shouter2) {
    console.log(shouter2 instanceof Shouter); // -> true
  });
});
```

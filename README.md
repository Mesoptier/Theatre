Theatre
=======

Small dependency injection framework for Node.js. Features:
  * [Constructor injection](http://en.wikipedia.org/wiki/Dependency_injection#Constructor_injection)
  * Asynchronous constructors using promises
  * Class overriding/mocking


## Usage
Theatre uses ES6's WeakMap, so Node.js needs to be run with either the `--harmony_collections` or `--harmony` flag.

### `#resolve(classy)`
  * `classy` is the class to instantiate and resolve dependencies for
  
Resolves the dependencies for a class and then instantiates the class. Returns a promise for an instance of the given class. If `classy` is a singleton class and has already been requested before, the promise for the previous request is returned.


## Example

```javascript
// Logger
function Logger() {}

Logger.prototype.log = function (message) {
  console.log(message);
};

// Shouter
Shouter.__theatre = {
  inject: [ Logger ]
};

function Shouter(logger) {
  this.logger = logger;
}

Shouter.prototype.log = function (message) {
  this.logger.log(message.toUpperCase());
};

// Run
var Theatre = require("theatre");
var app = new Theatre();
app.resolve(Shouter).then(function (shouter) {
  shouter.log("Hello world!"); // -> HELLO WORLD!
});
```

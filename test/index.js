var chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-spies"));

var expect = chai.expect;

var Theatre = require("../theatre");

describe("Theatre", function () {
  var app = new Theatre();

  beforeEach(function () {
    app = new Theatre();
  });

  describe("#resolve()", function () {

    it("should call the class constructor", function () {
      var spy = chai.spy("constructor");

      function Test() {
        spy();
      }

      return app.resolve(Test)
        .then(function () {
          expect(spy).to.have.been.called();
        });
    });

    it("should return a promise for the class instance", function () {
      function Test() {}

      return app.resolve(Test)
        .then(function (instance) {
          expect(instance).to.be.instanceof(Test);
        });
    });

    it("should resolve and inject dependencies", function () {
      var spy = chai.spy("constructor");

      function Test1(test2) {
        expect(test2).to.be.instanceof(Test2);
        spy();
      }
      function Test2() { }

      Test1.__theatre = {
        inject: [Test2]
      };

      return app.resolve(Test1)
        .then(function () {
          expect(spy).to.have.been.called();
        });
    });

    it("should detect dependency cycles of length 1", function () {
      function Test1() {}

      Test1.__theatre = { inject: [Test1] };

      return expect(app.resolve(Test1))
        .to.be.rejectedWith(Error, "Class dependencies contain a cycle");
    });

    it("should detect dependency cycles of length 2", function () {
      function Test1() {}
      function Test2() {}

      Test1.__theatre = { inject: [Test2] };
      Test2.__theatre = { inject: [Test1] };

      return expect(app.resolve(Test1))
        .to.be.rejectedWith(Error, "Class dependencies contain a cycle");
    });

    it("should detect dependency cycles of length 3", function () {
      function Test1() {}
      function Test2() {}
      function Test3() {}

      Test1.__theatre = { inject: [Test2] };
      Test2.__theatre = { inject: [Test3] };
      Test3.__theatre = { inject: [Test1] };

      return expect(app.resolve(Test1))
        .to.be.rejectedWith(Error, "Class dependencies contain a cycle");
    });

  });
});
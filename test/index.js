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

    it("should return a promise for an array of instances", function () {
      function Test1() {}
      function Test2() {}

      return app.resolve([Test1, Test2])
        .spread(function (test1, test2) {
          expect(test1).to.be.instanceof(Test1);
          expect(test2).to.be.instanceof(Test2);
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

  describe("#addOverride()", function () {

    it("should override a class", function () {
      function Test1() {}
      function Test2() {}

      app.addOverride(Test1, Test2);

      return app.resolve(Test1).then(function (test) {
        expect(test).to.be.instanceof(Test2);
      });
    });

  });

  describe("#removeOverride()", function () {

    it("should remove override for a class", function () {
      function Test1() {}
      function Test2() {}

      app.addOverride(Test1, Test2);
      app.removeOverride(Test1);

      return app.resolve(Test1).then(function (test) {
        expect(test).to.be.instanceof(Test1);
      });
    });

  });

  describe("#removeAllOverrides()", function () {

    it("should remove all overrides", function () {
      function Test1() {}
      function Test2() {}
      function Test3() {}

      app.addOverride(Test1, Test3);
      app.addOverride(Test2, Test3);
      app.removeAllOverrides();

      return app.resolve([Test1, Test2])
        .spread(function (test1, test2) {
          expect(test1).to.be.instanceof(Test1);
          expect(test2).to.be.instanceof(Test2);
        });
    });

  });
});
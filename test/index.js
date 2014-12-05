var chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-spies"));

var expect = chai.expect;
var assert = chai.assert;

var Theatre = require("../theatre");

describe("Theatre", function () {
  var app = new Theatre();

  beforeEach(function () {
    app = new Theatre();
  });

  describe("#resolve()", function () {

    describe("with single class", function () {

      it("should call the class constructor", function () {
        function Test() {}

        Test = chai.spy(Test);

        return app.resolve(Test)
          .then(function () {
            expect(Test).to.have.been.called();
          });
      });

      it("should return a promise for the instance", function () {
        function Test() {}

        return expect(app.resolve(Test))
          .to.eventually.be.instanceof(Test);
      });

      it("should call #resolve() dependencies", function () {
        app.resolve = chai.spy(app.resolve);

        function Test1() {}
        function Test2() {}

        Test1.__theatre = {
          inject: [Test2]
        };

        return app.resolve(Test1)
          .then(function () {
            expect(app.resolve).to.have.been.called.with(Test2);
          });
      });

      it("should inject dependencies", function () {
        function Test1(test2) {
          expect(test2).to.be.instanceof(Test2);
        }
        function Test2() {}

        Test1 = chai.spy(Test1);

        Test1.__theatre = {
          inject: [Test2]
        };

        return app.resolve(Test1)
          .then(function () {
            expect(Test1).to.have.been.called();
          });
      });

      it("should detect dependency cycles of length 1", function () {
        function Test1() {}

        Test1.__theatre = { inject: [Test1] };

        return expect(app.resolve(Test1))
          .to.be.rejectedWith(Error, "Cycle detected in class dependencies: Test1 -> Test1");
      });

      it("should detect dependency cycles of length 2", function () {
        function Test1() {}
        function Test2() {}

        Test1.__theatre = { inject: [Test2] };
        Test2.__theatre = { inject: [Test1] };

        return expect(app.resolve(Test1))
          .to.be.rejectedWith(Error, "Cycle detected in class dependencies: Test1 -> Test2 -> Test1");
      });

      it("should detect dependency cycles of length 3", function () {
        function Test1() {}
        function Test2() {}
        function Test3() {}

        Test1.__theatre = { inject: [Test2] };
        Test2.__theatre = { inject: [Test3] };
        Test3.__theatre = { inject: [Test1] };

        return expect(app.resolve(Test1))
          .to.be.rejectedWith(Error, "Cycle detected in class dependencies: Test1 -> Test2 -> Test3 -> Test1");
      });

    });

    describe("with an array of classes", function () {

      it("should call #resolve() for each class", function () {
        app.resolve = chai.spy(app.resolve.bind(app));

        function Test1() {}
        function Test2() {}

        return app.resolve([Test1, Test2])
          .then(function () {
            expect(app.resolve).to.have.been.called.with(Test1);
            expect(app.resolve).to.have.been.called.with(Test2);
          });
      });

      it("should return a promise for an array of instances", function () {
        function Test1() {}
        function Test2() {}

        return app.resolve([Test1, Test2])
          .then(function (instances) {
            expect(instances[0]).to.be.instanceof(Test1);
            expect(instances[1]).to.be.instanceof(Test2);
          });
      });

    });

    describe("with a singleton class", function () {

      it("should call the class constructor once", function () {
        function Test() {}
        Test = chai.spy(Test);

        Test.__theatre = {
          single: true
        };

        return app.resolve([Test, Test])
          .then(function () {
            expect(Test).to.have.been.called.once();
          });
      });

      it("should return the same instance", function () {
        function Test() {}

        Test.__theatre = {
          single: true
        };

        return app.resolve([Test, Test])
          .spread(function (test1, test2) {
            expect(test1).to.equal(test2);
          });
      });

    });

    describe("with an overridden class", function () {

      it("should detect dependency cycles", function () {
        function Test1() {}
        function Test2() {}
        function MockTest2() {}

        Test1.__theatre = { inject: [Test2] };
        Test2.__theatre = { inject: [Test1] };
        MockTest2.__theatre = { inject: [Test1] };

        app.addOverride(Test2, MockTest2);

        return expect(app.resolve(Test1))
          .to.be.rejectedWith(Error, "Cycle detected in class dependencies: Test1 -> MockTest2 -> Test1");
      });

    });

  });

  describe("#addOverride()", function () {

    it("should add an override for a class", function () {
      function Test1() {}
      function Test2() {}

      app.addOverride(Test1, Test2);

      expect(app._overrides.has(Test1)).to.equal(true);
      expect(app._overrides.get(Test1)).to.equal(Test2);
    });

  });

  describe("#removeOverride()", function () {

    it("should remove override for a class", function () {
      function Test1() {}
      function Test2() {}

      app.addOverride(Test1, Test2);
      app.removeOverride(Test1);

      expect(app._overrides.has(Test1)).to.equal(false);
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

      expect(app._overrides.has(Test1)).to.equal(false);
      expect(app._overrides.has(Test2)).to.equal(false);
    });

  });
});
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
describe('App', function () {
    it('is a constructor', function () {
        assert.isFunction(src_1.App);
    });
});
//# sourceMappingURL=app.test.js.map
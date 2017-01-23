/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var modelHelpers = require('../../server/lib/model-helpers');
var loopback = require('loopback');

describe('Model Helpers', function() {

    it('should parse page', function(cb) {
        modelHelpers.parsePage.should.be.instanceOf(Function);
        should.equal(modelHelpers.parsePage(10), 10);
        should.equal(modelHelpers.parsePage(-10), 1);
        should.equal(modelHelpers.parsePage(10000), 1);
        cb();
    });

    it('should parse limit', function(cb) {
        modelHelpers.parseLimit.should.be.instanceOf(Function);
        should.equal(modelHelpers.parseLimit(10), 10);
        should.equal(modelHelpers.parseLimit(-10), 20);
        should.equal(modelHelpers.parseLimit(101), 20);
        cb();
    });

    it('should ensure auth context', function(cb) {
        modelHelpers.ensureAuth.should.be.instanceOf(Function);

        var ctx = {
            req: {
                accessToken: '1'
            }
        };

        modelHelpers.ensureAuth(ctx, {}, function(err, callback) {
            should.equal(err, undefined);
            cb();
        });
    });

    it('should throw auth error', function(cb) {
        modelHelpers.ensureAuth.should.be.instanceOf(Function);


        var ctx = {
            req: {}
        };

        modelHelpers.ensureAuth(ctx, {}, function(err, callback) {
            should.throws(err);
            cb();
        });
    });

    describe('method whitelisting', function() {
        var model;

        before(function() {
            modelHelpers.whitelistModelMethods.should.be.instanceOf(Function);
        });

        beforeEach(function() {
            model = loopback.createModel('model', {name: String});
        });

        it('should work', function(cb) {
            modelHelpers.whitelistModelMethods(model, [
                'create',
                'find'
            ]);

            model.sharedClass._disabledMethods.should.have.property('upsert');
            model.sharedClass._disabledMethods.should.have.property('findById');
            model.sharedClass._disabledMethods.should.have.property('count');
            model.sharedClass._disabledMethods.should.not.have.property('create');
            model.sharedClass._disabledMethods.should.not.have.property('find');

            cb();
        });
    });
});

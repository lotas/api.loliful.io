/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var nailExtend = require('../../common/models/nail');
var LoopBackContext = require('loopback-context');


describe('Model: Nail', function () {
    var dataSource;
    var Nail, Hammer;
    var createSpy = function(data, cb) {
        cb(null, data);
    };

    beforeEach(function () {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        LoopBackContext.getCurrentContext = function() {
            return {
                "get": function() {
                    return {
                        id: 1  // userid
                    };
                }
            };
        };

        Nail = loopback.createModel('nail', { name: String});
        Hammer = loopback.createModel('hammer', {text: String});
        Nail.attachTo(dataSource);
        Hammer.attachTo(dataSource);
        Nail.hasMany(Hammer, {as: 'hammers'});
        nailExtend(Nail);

        Nail.attachMeta = function(res, fk, cb) {
            return cb(null, res);
        };
    });

    it('should disable remote methods', function (cb) {
        Nail.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Nail.sharedClass._disabledMethods.should.have.property('prototype.__destroyById__hammers', true);
        Nail.sharedClass._disabledMethods.should.have.property('prototype.__delete__hammers', true);
        Nail.sharedClass._disabledMethods.should.have.property('prototype.__findById__hammers', true);

        cb();
    });

    it('should remove unwanted fields on create', function(cb) {

        should.exist(Nail.__onCreateFilterData);
        Nail.__onCreateFilterData.should.be.instanceOf(Function);

        Nail.__onCreateFilterData(createSpy)({
            rating: 1,
            countVotes: 2,
            text: 'okok',
            userId: 9999
        }, function(err, data) {
            if (err) return cb(err);

            data.should.have.property('text', 'okok');
            data.should.have.property('userId', 1);
            data.should.not.have.property('countVotes');
            data.should.not.have.property('rating');

            cb();
        });
    });

    it('should validate presence of text on create', function(cb) {
        Nail.create({}, function(err) {
            should.throws(err);
            err.statusCode.should.be.exactly(422);
            cb();
        });
    });

    it('should validate short message', function(cb) {
        Nail.create({text: 'a'}, function(err) {
            should.throws(err);

            err.statusCode.should.be.exactly(422);
            err.name.should.be.exactly('ValidationError');
            cb();
        });
    });
    it('should validate long message', function(cb) {
        Nail.create({text: new Array(4096).join('a')}, function(err) {
            should.throws(err);

            err.statusCode.should.be.exactly(422);
            err.name.should.be.exactly('ValidationError');
            cb();
        });
    });
    //it('should allow removal based on time', function(cb) {
    //    should.exist(Nail.__canBeDeleted);
    //
    //    var oldTime = '2014-02-12T22:44:10.219Z';
    //    var recent = Date.now();
    //    var span = 30 * 60 * 1000;
    //
    //    should.equal(Nail.__canBeDeleted(oldTime, span), false);
    //    should.equal(Nail.__canBeDeleted(recent, span), true);
    //
    //    cb();
    //});
    it('should allow to delete if there was no replies yet', function() {
        should.equal(Nail.__canBeDeleted({countAnswers: 0}), true);
        should.equal(Nail.__canBeDeleted({countAnswers: undefined}), true);
    });
    it('should not allow to delete if there are replies', function() {
        should.equal(Nail.__canBeDeleted({countAnswers: 1}), false);
        should.equal(Nail.__canBeDeleted({countAnswers: 1000}), false);
    });

    it('should remove unwanted fields from update call', function(cb) {
        var ctx = {
            instance: {
                id: 1,
                text: '123'
            },
            args: {
                data: {
                    text: 'allowed',
                    countVotes: 'not allowed',
                    rating: 'not allowed'
                }
            }
        };

        Nail.__beforeRemoteUpdateAttributes(ctx, {}, function() {
            ctx.args.data.should.have.property('text', 'allowed');
            ctx.args.data.should.not.have.property('countVotes');
            ctx.args.data.should.not.have.property('rating');

            cb();
        });
    });
});

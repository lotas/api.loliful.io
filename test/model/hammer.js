var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var hammerExtend = require('../../common/models/hammer');
var LoopBackContext = require('loopback-context');


describe('Model: Hammer', function () {
    var dataSource;
    var Hammer;
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
                "get": function(key) {
                    return {
                        id: 1  // userid
                    };
                }
            };
        };

        Hammer = loopback.createModel('model', { name: String});
        Hammer.attachTo(dataSource);
        hammerExtend(Hammer);
    });

    it('should disable remote methods', function (cb) {

        Hammer.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Hammer.sharedClass._disabledMethods.should.have.property('create', true);

        cb();
    });

    it('should remove unwanted fields on create', function(cb) {

        should.exist(Hammer.__onCreateFilterData);
        Hammer.__onCreateFilterData.should.be.instanceOf(Function);

        Hammer.__onCreateFilterData(createSpy)({
            rating: 1,
            countVotes: 2,
            text: 'okok',
            nailId: 3,
            userId: 9999
        }, function(err, data) {
            if (err) return cb(err);

            data.should.have.property('text', 'okok');
            data.should.have.property('userId', 1);
            data.should.have.property('nailId', 3);
            data.should.not.have.property('countVotes');
            data.should.not.have.property('rating');

            cb();
        });
    });


    it('should validate presence of text on create', function(cb) {
        Hammer.create({}, function(err, data) {
            should.throws(err);
            err.statusCode.should.be.exactly(422);
            cb();
        });
    });

    it('should validate short message', function(cb) {
        Hammer.create({text: ''}, function(err, data) {
            should.throws(err);

            err.statusCode.should.be.exactly(422);
            err.name.should.be.exactly('ValidationError');
            cb();
        });
    });
    it('should validate long message', function(cb) {
        Hammer.create({text: new Array(4096).join('a')}, function(err, data) {
            should.throws(err);

            err.statusCode.should.be.exactly(422);
            err.name.should.be.exactly('ValidationError');
            cb();
        });
    });

    it('should update hammer rating', function(cb) {
        should.exist(Hammer.__onVoteUpdateRating);
        Hammer.__onVoteUpdateRating.should.be.instanceOf(Function);

        Hammer.__onVoteUpdateRating(createSpy)({
            nailId: 3
        }, function(err, data) {
            if (err) return cb(err);

            // should be the same
            cb();
        });
    });

    it('should allow removal based on time', function(cb) {
        should.exist(Hammer.__canBeDeleted);

        should.equal(Hammer.__canBeDeleted({countVotes: 1}), false);
        should.equal(Hammer.__canBeDeleted({countVotes: 0}), true);

        cb();
    });

    it('should remove unwanted fields from update call', function(cb) {
        var ctx = {
            instance: {
                id: 1,
                text: 'text'
            },
            args: {
                data: {
                    text: 'allowed',
                    countVotes: 'not allowed',
                    rating: 'not allowed'
                }
            }
        };

        Hammer.__beforeRemoteUpdateAttributes(ctx, {}, function() {
            ctx.args.data.should.have.property('text', 'allowed');
            ctx.args.data.should.not.have.property('countVotes');
            ctx.args.data.should.not.have.property('rating');

            cb();
        });
    });

});

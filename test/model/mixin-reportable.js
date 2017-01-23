/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var reportable = require('../../common/mixins/reportable.js');

describe('Model: Mixin: Reportable', function() {
	var dataSource;
	var Model, ModelUser;

	beforeEach(function() {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Model = loopback.createModel('model', {name: String, countVotes: Number, rating: Number});
        Model.attachTo(dataSource);
	});

    it('should attach report remote', function(cb) {
        reportable(Model);

        var voteRemote = _.find(Model.sharedClass._methods, {name: 'report'});
        should.exist(voteRemote);
        voteRemote.should.be.instanceOf(Object);

        cb();
    });

    it('should call report', function(cb) {
        var called = false;

        Model.app = {
            models: {
                user: {
                    findById: function() {
                        called = true;
                    }
                }
            }
        };

        reportable(Model);
        Model.create({id: 1});

        Model.report(1, function(err, res) {
            if (err) return cb(err);

            should.equal(res, true);
            should.equal(true, called);

            Model.findById(1, function(err, obj) {
                if (err) return cb(err);

                obj.should.have.property('reported');
                obj.reported.should.be.above(0);
                cb();
            });
        });
    });
});

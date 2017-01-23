/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var votable = require('../../common/mixins/votable.js');

describe('Model: Mixin: Votable', function() {
	var dataSource;
	var Model;
    var Votes;

	beforeEach(function() {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Model = loopback.createModel('model', {name: String, countVotes: Number, rating: Number});
        Votes = loopback.createModel('votes', {userId: String, modelId: String});
        Model.attachTo(dataSource);
        Votes.attachTo(dataSource);

        Votes.addVote = function(name, id, user, cb) {
            cb();
        };

        Votes.removeVote = function(name, id, user, cb) {
            cb();
        };

        Model.app = {
            models: {
                votes: Votes
            }
        };
	});

	it('should disable remote methods', function(cb) {
        votable(Model);

        Model.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__delete__votes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__get__votes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__create__votes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__findById__votes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__destroyById__votes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__updateById__votes', true);

        cb();
	});

    it('should attach vote remote', function(cb) {
        votable(Model);

        Model.should.have.property('vote').and.be.instanceOf(Function);

        var voteRemote = _.find(Model.sharedClass._methods, {name: 'vote'});
        should.exist(voteRemote);
        voteRemote.should.be.instanceOf(Object);

        cb();
    });

    it('should attach unvote remote', function(cb) {
        votable(Model);

        Model.should.have.property('unvote').and.be.instanceOf(Function);

        var unvoteRemote = _.find(Model.sharedClass._methods, {name: 'unvote'});
        should.exist(unvoteRemote);
        unvoteRemote.should.be.instanceOf(Object);

        cb();
    });

    it('should call vote', function(cb) {
        votable(Model);
        Model.create({id: 1});

        Model.vote(1, 1, function(err, res) {
            if (err) return cb(err);

            should.equal(res, 0);
            cb();
        });
    });
    it('should call unvote', function(cb) {
        votable(Model);
        Model.create({id: 1});

        Model.unvote(1, 1, function(err, res) {
            if (err) return cb(err);

            should.equal(res, 0);
            cb();
        });
    });
});

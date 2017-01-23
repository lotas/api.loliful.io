/* global beforeEach */
/* global before */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var attachMeta = require('../../common/mixins/attach-meta.js');

describe('Model: Mixin: AttachMeta', function() {
	var dataSource;
	var Model;
    var Votes, Favorites, Nail, Hammer, User;

    beforeEach(function() {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Model = loopback.createModel('model', {name: String, countVotes: Number, rating: Number});

        Votes = loopback.createModel('votes', {userId: String, modelId: String});
        Favorites = loopback.createModel('favorites', {userId: String, nailId: String, hammerId: String});
        Nail = loopback.createModel('nail', {userId: String, text: String});
        Hammer = loopback.createModel('hammer', {userId: String, nailId: String, text: String});
        User = loopback.createModel('user', {id: String, name: String, email: String, avatar: String});

        Model.attachTo(dataSource);
        Votes.attachTo(dataSource);
        Favorites.attachTo(dataSource);
        Nail.attachTo(dataSource);
        Hammer.attachTo(dataSource);
        User.attachTo(dataSource);
    });

    it('provide attach- functions', function(cb) {
        attachMeta(Model);

        Model.attachMeta.should.be.instanceOf(Function);
        Model.attachNails.should.be.instanceOf(Function);
        Model.attachHammers.should.be.instanceOf(Function);
        Model.attachUserNames.should.be.instanceOf(Function);

        cb();
    });

    describe('Attaching', function() {
        var nails = [{
            id: '1',
            text: 'one',
            userId: '1'
        }, {
            id: '2',
            text: 'two',
            userId: '2'
        }];
        var hammers = [{
            text: 'one',
            nailId: '1',
            userId: '1'
        }, {
            text: 'two',
            nailId: '2',
            userId: '2'
        }];
        var users = [{
            email: 'one@one.com',
            name: 'one',
            avatar: 'ava1',
            id: '1'
        }, {
            email: 'two@two.com',
            name: 'two',
            avatar: 'ava2',
            id: '2'
        }];
        var favorites = [{
            userId: '1',
            nailId: '1'
        }, {
            userId: '2',
            hammerId: '2'
        }];

        before(function(cb) {
            Nail.create(nails, (err, res) => {
                User.create(users, (err, res) => {
                    Hammer.create(hammers, (err, res) => {
                        Favorites.create(favorites, (err, res) => {
                            cb();
                        });
                    });
                });
            });
        });

        it('should attach user names', function(cb) {
            var testNails = _.clone(nails);
            attachMeta(Nail);

            Nail.attachUserNames(testNails)
                .then(objects => {
                    should.equal(objects.length, testNails.length);
                    objects[0].should.have.property('$user');
                    objects[0].$user.should.have.property('name', 'one');
                    objects[0].$user.should.have.property('avatar', 'ava1');
                    objects[1].should.have.property('$user');
                    objects[1].$user.should.have.property('name', 'two');
                    objects[1].$user.should.have.property('avatar', 'ava2');
                });

            cb();
        });

        it('should attach nails', function(cb) {
            var testHammers = _.clone(hammers);
            attachMeta(Hammer);

            Hammer.attachNails(testHammers)
                .then(objects => {
                    should.equal(objects.length, testHammers.length);
                    objects[0].should.have.property('$nail');
                    objects[0].$nail.should.have.property('text', 'one');
                    objects[1].should.have.property('$nail');
                    objects[1].$nail.should.have.property('text', 'two');
                });

            cb();
        });

        it('should attach nails and hammers', function(cb) {
            var testFavs = _.clone(favorites);
            attachMeta(Favorites);

            Favorites.attachNails(testFavs)
                .then(Favorites.attachHammers)
                .then(objects => {
                    should.equal(objects.length, testFavs.length);
                    objects[0].should.have.property('$nail');
                    objects[0].$nail.should.have.property('text', 'one');
                    objects[1].should.have.property('$hammer');
                    objects[1].$hammer.should.have.property('text', 'two');
                });

            cb();
        });

        it('should deep attach users', function(cb) {
            var testHammers = _.clone(hammers);
            attachMeta(Hammer);

            Hammer.attachNails(testHammers)
                .then(Hammer.attachUserNames)
                .then(objects => {
                    should.equal(objects.length, testHammers.length);
                    objects[0].should.have.property('$nail');
                    objects[0].$nail.should.have.property('$user');
                    objects[0].$nail.$user.should.have.property('name', 'one');
                    objects[0].$nail.$user.should.have.property('avatar', 'ava1');
                });

            cb();
        });

    });

});

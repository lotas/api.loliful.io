/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var favoritable = require('../../common/mixins/favoritable.js');

describe('Model: Mixin: Favoritable', function() {
	var dataSource;
	var Model;
    var Favorite;

	beforeEach(function() {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Model = loopback.createModel('model', {name: String, countVotes: Number, rating: Number});
        Favorite = loopback.createModel('favorites', {userId: String, modelId: String});
        Model.attachTo(dataSource);
        Favorite.attachTo(dataSource);

        Favorite.addToFav = function(name, id, user, cb) {
            cb(null, true);
        };
        Favorite.removeFromFav = function(name, id, user, cb) {
            cb(null, true);
        };

        Model.app = {
            models: {
                favorite: Favorite
            }
        };
	});

	it('should disable remote methods', function(cb) {
        favoritable(Model);

        Model.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__delete__favorites', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__get__favorites', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__create__favorites', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__findById__favorites', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__destroyById__favorites', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__updateById__favorites', true);

        cb();
	});

    it('should attach remote methods', function(cb) {
        favoritable(Model);

        // Model.should.have.property('addToFav').and.be.instanceOf(Function);
        // Model.should.have.property('removeFromFav').and.be.instanceOf(Function);

        var addToFav = _.find(Model.sharedClass._methods, {name: 'addToFav'});
        should.exist(addToFav);
        addToFav.should.be.instanceOf(Object);

        var removeFromFav = _.find(Model.sharedClass._methods, {name: 'removeFromFav'});
        should.exist(removeFromFav);
        removeFromFav.should.be.instanceOf(Object);

        cb();
    });

    it('should call addToFav', function(cb) {
        favoritable(Model);

        Model.create({id: 1}, function(err, obj) {
            if (err) return cb(err);

            obj.addToFav(1, function(err, res) {
                if (err) return cb(err);

                should.equal(res, true);
                cb();
            });
        });
    });

    it('should call removeFromFav', function(cb) {
        favoritable(Model);

        Model.create({id: 1}, function(err, obj) {
            if (err) return cb(err);

            obj.removeFromFav(1, function(err, res) {
                if (err) return cb(err);

                should.equal(res, true);
                cb();
            });
        });
    });
});

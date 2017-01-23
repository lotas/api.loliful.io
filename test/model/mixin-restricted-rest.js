/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var restrictedRest = require('../../common/mixins/restricted-rest.js');

describe('Model: Mixin: Restricted REST', function () {
    var dataSource;
    var Model;

    beforeEach(function () {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Model = loopback.createModel('model', { name: String, countVotes: Number, rating: Number });
        Model.attachTo(dataSource);
    });

    it('should disable remote methods', function (cb) {
        restrictedRest(Model);

        Model.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Model.sharedClass._disabledMethods.should.have.property('prototype.updateAttributes', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__destroyById__accessTokens', true);
        Model.sharedClass._disabledMethods.should.have.property('prototype.__updateById__accessTokens', true);
        Model.sharedClass._disabledMethods.should.have.property('updateAll', true);
        Model.sharedClass._disabledMethods.should.have.property('upsert', true);
        Model.sharedClass._disabledMethods.should.have.property('createChangeStream', true);

        cb();
    });


    it('should not disable updateAttributes', function (cb) {
        restrictedRest(Model, {updateAttributes: true});

        Model.sharedClass._disabledMethods.should.be.instanceOf(Object);
        Model.sharedClass._disabledMethods.should.not.have.property('prototype.updateAttributes');
        cb();
    });



});

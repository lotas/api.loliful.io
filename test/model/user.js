/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var userExtend = require('../../common/models/user');

describe('Model: User', function () {
    var dataSource;
    var User;

    beforeEach(function () {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        User = loopback.createModel('model', { name: String, email: String});
        User.attachTo(dataSource);
    });

    it('should disable remote methods', function (cb) {
        userExtend(User);

        User.sharedClass._disabledMethods.should.be.instanceOf(Object);
        User.sharedClass._disabledMethods.should.have.property('prototype.__updateById__nails', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__destroyById__nails', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__delete__nails', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__create__nails', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__create__accessTokens', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__delete__accessTokens', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__findById__accessTokens', true);
        User.sharedClass._disabledMethods.should.have.property('prototype.__create__notificationSettings', true);

        cb();
    });


    it('should findOrCreate new user', cb => {
        userExtend(User);

        User.findOrCreate({email: 'one@two.three'}, {email: 'one@two.three', name: 'one'}, function(err, res) {
            should.equal(err, null);
            res.should.have.property('email', 'one@two.three');

            cb();
        });
    });
    it('should findOrCreate existing user', cb => {
        userExtend(User);

        User.create({email: 'one@two.three', name: 'one'}, function(err, res) {
            User.findOrCreate({email: 'one@two.three'}, {email: 'one@two.three', name: 'one'}, function(err, res) {
                should.equal(err, null);
                res.should.have.property('email', 'one@two.three');

                cb();
            });
        });
    });

    it('should update avatar from social identities', cb => {
        userExtend(User);

        User.updateAvatarFromSocial.should.be.instanceOf(Function);

        cb();
    });

});

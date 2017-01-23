/* global before */
/* global beforeEach */
/* global it */
/* global describe */
var app = require('../../server/server');
var assert = require('assert');
var loopback = require('loopback');

before(function changeDataSourceToMemory(done) {

    var db = loopback.createDataSource({
        connector: loopback.Memory
    });

    loopback.configureModel(loopback.getModel('userCredential'), {dataSource: db});
    loopback.configureModel(loopback.getModel('userIdentity'), {dataSource: db});
    loopback.configureModel(loopback.getModel('user'), {dataSource: db});

    if (db.connected) {
        db.automigrate(addUser);
    } else {
        db.once('connected', function () {
            db.automigrate(addUser);
        });
    }

    function addUser() {
        app.models.user.create({
            'id': 1,
            'name': 'John',
            'firstName': 'Doe',
            'created': new Date(),
            'gender': 'M',
            'type': 'teacher',
            'username': 'john-doe',
            'password': 'testme',
            'email': 'john-doe@mailinator.com'
        }, done);
    }
});

describe('Sync credentials when adding identities', function () {

    var user;
    var loginProvider = 'google';
    var linkProvider = 'google';
    var dummyLoginData = {
        'provider': loginProvider,
        'authScheme': 'oAuth 2.0',
        'externalId': '1081943683967445545454654646465411',
        'profile': {'info': 'some-provider-info'},
        'credentials': {'accessToken': 'secret-token-from-google'}
    };
    var dummyLinkData = {
        'provider': linkProvider,
        'authScheme': 'oAuth 2.0',
        'externalId': '1081943683967445545454654646465411',
        'profile': {'info': 'some-provider-info'},
        'credentials': {'accessToken': 'secret-token-from-google'}
    };

    before(function (done) {
        app.models.user.findOne({id: 1}, function (err, u) {
            if (err) return done(err);
            user = u;
            dummyLoginData.userId = user.id;

            done();
        });
    });

    describe('IDENTITIES', function(){
        //reset tables
        beforeEach(function(done){
            app.models.userIdentity.destroyAll({provider: loginProvider}, function (err) {
                if (err) return done(err);
                app.models.userCredential.destroyAll({provider: linkProvider}, done);
            });
        });

        describe('add new identity', function () {
            it('should add the identity and credentials', function (done) {
                addDataAndExpectOneIdentityAndCredential(dummyLoginData, app.models.userIdentity, done);
            });
        });

        //https://github.com/strongloop/loopback-component-passport/issues/131
        describe('add existing identity', function () {
            it('should do nothing on both tables', function (done) {
                addDataAndExpectOneIdentityAndCredential(dummyLoginData, app.models.userIdentity, done);
            });
        });

        //https://github.com/strongloop/loopback-component-passport/issues/131
        describe('add existing identity with no credentials yet', function () {
            it('should not add identity but add credentials', function (done) {
                app.models.userCredential.destroyAll({'provider': linkProvider}, function (err) {
                    if (err) return done(err);
                    addDataAndExpectOneIdentityAndCredential(dummyLoginData, app.models.userIdentity, done);
                });
            });
        });

        describe('add new identity with already existing credentials', function () {
            it('should add identity but not add credentials', function (done) {
                app.models.userIdentity.destroyAll({'provider': loginProvider}, function (err) {
                    if (err) return done(err);
                    addDataAndExpectOneIdentityAndCredential(dummyLoginData, app.models.userIdentity, done);
                });
            });
        });
    });

    describe('CREDENTIALS', function(){

        //reset tables
        before(function(done){
            app.models.userIdentity.destroyAll({}, function (err) {
                if (err) return done(err);
                app.models.userCredential.destroyAll({}, done);
            });
        });

        // test failing
        describe('add new credential', function () {
            it('should add the credential and identity', function (done) {
                addDataAndExpectOneIdentityAndCredential(dummyLinkData, app.models.userCredential, done);
            });
        });

        describe('add existing credential', function () {
            it('should fail and return a Validation error', function (done) {
                app.models.userCredential.create(dummyLinkData, function (err) {
                    if (!err) return done('it should fail');

                    assert.equal(err.code, 'Validation Error');
                    assert.equal(err.message, 'Credentials already linked');

                    app.models.userIdentity.find(
                        {externalId: dummyLinkData.externalId, provider: loginProvider},
                        function (err, identities) {
                            if (err) return done(err);
                            assert.equal(identities.length, 1);
                            //get credentials for this provider and externalId
                            app.models.userCredential.find(
                                {externalId: dummyLinkData.externalId, provider: linkProvider},
                                function (err, creds) {
                                    if (err) return done(err);
                                    assert.equal(creds.length, 1);
                                    done();
                                });
                        });
                });
            });
        });

        describe('add new credential with existing identity', function () {
            it('should fail and return a Validation error', function (done) {
                app.models.userCredential.destroyAll({'provider': linkProvider}, function (err) {
                    if (err) return done(err);
                    addDataAndExpectOneIdentityAndCredential(dummyLinkData, app.models.userCredential, done);
                });
            });
        });

    });



    function addDataAndExpectOneIdentityAndCredential(data, model, done) {
        model.create(data, function (err, inst) {
            if (err) return done(err);
            assert.equal(inst.provider, data.provider);
            assert.equal(inst.externalId, data.externalId);

            app.models.userIdentity.find(
                {externalId: data.externalId, provider: loginProvider},
                function (err, identities) {
                    if (err) return done(err);
                    assert.equal(identities.length, 1);
                    //get credentials for this provider and externalId
                    app.models.userCredential.find(
                        {externalId: data.externalId, provider: linkProvider},
                        function (err, creds) {
                            if (err) return done(err);
                            assert.equal(creds.length, 1);
                            done();
                        });
                });
        });
    }
});

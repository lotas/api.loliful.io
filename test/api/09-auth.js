/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Auth', function() {
    var app;

    beforeEach(function() {
        app = require('../../server/server.js');
    });


    describe('/auth/success', function() {
        it('should redirect to login', function(cb) {
            request(app)
                .get('/auth/success')
                .send()
                .expect(302, cb);
        });

        it('should redirect back to login if user isDeleted', function(cb) {
            app.models.user.create({
                email: `${Date.now()}deleted@loliful.io`,
                name: Date.now(),
                accounts: '[]',
                password: '123123',
                about: 'about me',
                isDeleted: 1
            }, function(err, userEntity) {
                if (err) {
                    return cb(err);
                }

                userEntity.createAccessToken(9999999, {}, function(err, res) {
                    if (err) return cb(err);

                    request(app)
                        .get('/auth/success')
                        .set('Authorization', res.id)
                        .send()
                        .expect(302, function(err, res) {
                            if (err) return cb(err);

                            should.equal('http://local.loliful.io/login?msg=Account+disabled', res.headers.location);

                            cb();
                        });
                });
            });
        });
    });


    describe('/auth/token/:token', function() {
        it('should return 404 when unkown token userd', function(cb) {
            request(app)
                .get('/auth/token/non4existant555')
                .expect(404, cb);
        });
        it('should return token payload', function(cb) {
            app.models.shortToken.create({
                token: '123aaa321',
                expires: Date.now() + 1000 * 3600,
                data: {
                    accessToken: 1,
                    user: 2
                }
            }, (err, shortToken) => {
                request(app)
                    .get('/auth/token/123aaa321')
                    .send()
                    .expect(200, function(err, res) {
                        res.body.should.have.property('accessToken', 1);
                        res.body.should.have.property('user', 2);
                        cb();
                    });
            });
        });
    });

    describe('/avatar/:userId', function() {
        it('should respond with something', function(cb) {
            request(app)
                .get('/avatar/123')
                .expect(200, cb);
        });
    });

    describe('/profile/:userId', function() {
        var user;

        before(function(cb) {
            app.models.user.create({
                email: `${Date.now()}@loliful.io`,
                name: Date.now(),
                accounts: '[]',
                emailVerfied: 2,
                password: '123123123sdfadsf',
                about: 'about me'
            }, function(err, userEntity) {
                if (err) {
                    return cb(err);
                }
                user = userEntity;
                cb();
            });
        });
        it('return limited account details', function(cb) {
            request(app)
                .get(`/profile/${user.id}`)
                .expect(200, function(err, res) {
                    res.body.should.have.property('id', user.id);
                    res.body.should.have.property('name', user.name);
                    res.body.should.have.property('accounts');
                    res.body.should.have.property('about', user.about);
                    res.body.should.not.have.property('email');
                    res.body.should.not.have.property('emailVerified');
                    res.body.should.not.have.property('userId');
                    res.body.should.not.have.property('karma');
                    res.body.should.not.have.property('settings');
                    res.body.should.not.have.property('updated');
                    res.body.should.not.have.property('password');
                    cb();
                });
        });
    });

    describe('unlink social', function() {
        it('should respond with 403 for no user', function(cb) {
            request(app)
                .get('/auth/unlink/facebook')
                .expect(403, cb);
        });
    });

    describe('/auth/me', function() {
        var userId;
        var auth;

        before(function(cb) {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });

        it('should return own data', function(cb) {
            request(app)
                .get('/me')
                .set('Authorization', auth)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id', userId);
                    res.body.should.have.property('name');
                    res.body.should.have.property('email');
                    cb();
                });
        });
    });

    describe('/auth/logout', function() {
        var userId;
        var auth;

        before(function(cb) {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });

        it('logout and redirect', function(cb) {
            request(app)
                .get('/auth/logout')
                .set('Authorization', auth)
                .expect(302, cb);
        });
    });

    describe('/auth/first-run', function() {
        var userId;
        var auth;

        before(function(cb) {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });

        it('should return 200 for no user', function(cb) {
            request(app)
                .post('/auth/first-run')
                .expect(200, cb);
        });

        it('should return 200 and update user.settings', function(cb) {

            app.models.user.updateAll({
                id: userId
            }, {
                settings: {firstRun: true}
            }, function(err) {
                if (err) return cb(err);

                request(app)
                    .post('/auth/first-run')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        app.models.user.findById(userId, function(err2, user) {
                            if (err2) return cb(err2);

                            user.settings.firstRun.should.equal(false);

                            cb();
                        });
                    });
            });

        });
    });

});

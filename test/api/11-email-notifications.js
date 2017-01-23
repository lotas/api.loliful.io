/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var shared = require('../shared-data');

describe('API: Email Notifications', function() {
    var app;

    before(() => {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });


    describe(' no email ', function() {
        var auth;
        var userId;
        var user;

        before(function(cb) {
            app.models.user.create(shared.noEmailUser, function(err, newUser) {
                if (err) return cb(err);

                user = newUser;

                request(app)
                    .post('/Users/login')
                    .send(shared.noEmailUser)
                    .expect(200, (err, res) => {
                        res.body.should.have.property('id');
                        auth = res.body.id;
                        userId = res.body.userId;
                        cb();
                    });
            });
        });

        it('should return no email when it was not fetched from social', function(cb) {
            request(app)
                .get(`/users/${userId}`)
                .set('Authorization', auth)
                .expect(200, (err, res) => {
                    res.body.should.have.property('email', '');
                    cb();
                });
        });
        it('should return 412 for setting invalid email', function(cb) {
            request(app)
                .put(`/users/${userId}/email`)
                .set('Authorization', auth)
                .send({email: 'invalid#email'})
                .expect(412, cb);
        });
        it('should return 412 for duplicate email', function(cb) {
            app.models.user.create(shared.noEmailDuplicateUser, function(err, newUser) {
                if (err) return cb(err);

                request(app)
                    .put(`/users/${userId}/email`)
                    .set('Authorization', auth)
                    .send({email: newUser.email})
                    .expect(412, cb);
            });
        });
    });

    describe(' set new email ', function() {
        var auth;
        var userId;
        var user;
        var newEmail = 'new@email.com';
        var token;

        before(function(cb) {
            request(app)
                .post('/Users/login')
                .send(shared.noEmailUser)
                .expect(200, (err, res) => {
                    res.body.should.have.property('id');
                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });
        it('should set new email and send token', function(cb) {
            request(app)
                .put(`/users/${userId}/email`)
                .set('Authorization', auth)
                .send({email: newEmail})
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    app.models.user.findById(userId, function(err, user) {
                        user.emailUnverified.should.equal(newEmail);
                        user.emailVerified.should.equal(false);
                        user.verificationToken.should.match(/.+size.+doesnt.+matter.+/);

                        token = user.verificationToken;
                        cb();
                    });
                });
        });
        it('should confirm email and redirect', function(cb) {
            request(app)
                .get(`/users/confirm/?uid=${userId}&token=${token}`)
                .expect(302, function(err, res) {
                    if (err) return cb(err);

                    app.models.user.findById(userId, function(err, user) {
                        user.emailUnverified.should.equal('');
                        user.emailVerified.should.equal(true);
                        user.verificationToken.should.equal('');

                        cb();
                    });
                });
        });
        it('should send 404 for unknown user', function(cb) {
            request(app)
                .get(`/users/confirm/?uid=321323123&token=${token}`)
                .expect(404, cb);
        });
        it('should send 400 for invalid token', function(cb) {
            request(app)
                .get(`/users/confirm/?uid=${userId}&token=wrong-token`)
                .expect(400, cb);
        });
    });
});

/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Moderator ', function () {
    var app;

    before(() => {
        app = require('../../server/server.js');
    });

    describe('Role', function() {
        it('should have role moderator', function (cb) {
            app.models.Role.findOne({where: {name: 'moderator'}}, (err, role) => {
                if (err) return cb(err);

                role.should.have.property('name', 'moderator');
                cb();
            });
        });
    });

    describe('User', function () {
        var admin;
        var moderAuth;

        function getAdminUser(admin) {
            return new Promise(resolve => {
                app.models.user.find({where: {email: admin.email}}, function(err, user) {
                    if (err || !user.length) {
                        app.models.user.create(admin, function(err, user) {
                            resolve(user);
                        });
                    } else {
                        resolve(user[0]);
                    }
                });
            });
        }

        before(function(cb) {
            getAdminUser(shared.testModerator).then(user => {
                admin = user;

                app.models.Role.findOne({where: {name: 'moderator'}}, (err, role) => {
                    role.principals.create({
                        principalType: app.models.RoleMapping.USER,
                        principalId: user.id
                    }, (err, res) => {
                        app.models.User.login(shared.testModerator, function(err, res) {
                            moderAuth = res.id;
                            cb();
                        });
                    });
                });
            });
        });

        it('can delete nails', function (cb) {
            app.models.nail.create({userId: 3, text: 'to be deleted by moderator'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .delete('/nails/' + res.id)
                    .set('Authorization', moderAuth)
                    .expect(200, cb);
            });
        });

        it('can edit nails', function (cb) {
            app.models.nail.create({userId: admin.id, text: 'to be edited by moderator'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .put('/nails/' + res.id)
                    .send({
                        countVotes: 99999,
                        rating: 123,
                        text: 'UpdatedX',
                        userId: 999
                    })
                    .set('Authorization', moderAuth)
                    .expect(200, function(err, res2) {
                        if (err) return cb(err);

                        app.models.nail.findById(res.id, function(err, res3) {
                            if (err) return cb(err);

                            res3.should.have.property('text', 'UpdatedX');
                            res3.should.have.property('userId', res.userId);
                            res3.should.have.property('countVotes', 0);
                            res3.should.have.property('rating', 0);

                            cb();
                        });
                    });
            });
        });

        it('can edit hammers', function (cb) {
            app.models.hammer.create({
                userId: admin.id,
                nailId: 1,
                text: 'to be edited by moderator'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .put('/hammers/' + res.id)
                    .send({
                        countVotes: 99999,
                        rating: 123,
                        text: 'UpdatedX',
                        userId: 999
                    })
                    .set('Authorization', moderAuth)
                    .expect(200, function(err, res2) {
                        if (err) return cb(err);

                        app.models.hammer.findById(res.id, function(err, res3) {
                            if (err) return cb(err);

                            res3.should.have.property('text', 'UpdatedX');
                            res3.should.have.property('userId', res.userId);
                            res3.should.have.property('countVotes', res.countVotes);
                            res3.should.have.property('rating', res.rating);

                            cb();
                        });
                    });
            });
        });

        it('can delete hammers', function (cb) {
            app.models.hammer.create({nailId: 3, text: 'to be deleted by moderator'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .delete('/hammers/' + res.id)
                    .set('Authorization', moderAuth)
                    .expect(200, cb);
            });
        });


        describe('disable user accounts', function() {
            var user;
            before(function(cb) {
                app.models.user.create({
                    username: 'toBeDeleted1',
                    email: 'toBeDeleted1@loliful.io',
                    password: 'nevermind'
                }, function(err, res) {
                    if (err) return cb(err);
                    user = res;
                    cb();
                });
            });

            it('should get permission denied', function(cb) {
                request(app)
                    .post('/Users/disable')
                    .set('Authorization', moderAuth)
                    .send({userId: user.id})
                    .expect(401, cb);
            });
        });
    });
});

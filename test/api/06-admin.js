/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Admin', function () {
    var app;

    before(function () {
        app = require('../../server/server.js');
    });

    describe('Role', function() {
        it('should have role admin', function (cb) {
            app.models.Role.findOne({where: {name: 'admin'}}, (err, role) => {
                if (err) return cb(err);
                role.should.have.property('name', 'admin');
                cb();
            });
        });
    });

    describe('User', function () {
        var admin;
        var adminAuth;

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
            getAdminUser(shared.testAdmin).then(user => {
                admin = user;

                app.models.Role.findOne({where: {name: 'admin'}}, (err, role) => {
                    if (err) return cb(err);

                    role.principals.create({
                        principalType: app.models.RoleMapping.USER,
                        principalId: user.id
                    }, (err, res) => {
                        if (err) return cb(err);
                        app.models.User.login(shared.testAdmin, function(err, res) {
                            if (err) return cb(err);
                            adminAuth = res.id;
                            cb();
                        });
                    });
                });
            });
        });

        it('can delete nails', function (cb) {
            app.models.nail.create({userId: 3, text: 'to be deleted by admin'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .delete('/nails/' + res.id)
                    .set('Authorization', adminAuth)
                    .expect(200, cb);
            });
        });

        it('can delete hammers', function (cb) {
            app.models.hammer.create({nailId: 3, text: 'to be deleted by admin'}, function(err, res) {
                if (err) return cb(err);

                request(app)
                    .delete('/hammers/' + res.id)
                    .set('Authorization', adminAuth)
                    .expect(200, cb);
            });
        });

        describe('disable user accounts', function() {
            var user;
            before((cb) => {
                app.models.user.create({
                    username: 'toBeDeleted',
                    email: 'toBeDeleted@loliful.io',
                    password: 'nevermind'
                }, (err, res) => {
                    if (err) return cb(err);
                    user = res;
                    cb();
                });
            });

            it('should send userId', function(cb) {
                request(app)
                    .post('/Users/disable')
                    .set('Authorization', adminAuth)
                    .send()
                    .expect(400, function(err, res){
                        if (err) return cb(err);

                        res.body.error.should.have.property('statusCode', 400);
                        res.body.error.should.have.property('message', 'userId is a required argument');
                        cb();
                    });
            });

            it('should disable user', function(cb) {
                request(app)
                    .post('/Users/disable')
                    .send({userId: user.id})
                    .set('Authorization', adminAuth)
                    .expect(200, (err, res) => {
                        if (err) return cb(err);

                        res.body.should.have.property('isDeleted', true);

                        cb();
                    });
            });

        });

    });
});

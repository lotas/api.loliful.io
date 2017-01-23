/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var shared = require('../shared-data');

describe('API: Users', function() {
    var app;

    before(() => {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    describe('isDeleted should disable login', () => {
        var user;
        var userData = {
            username: 'deleted',
            email: 'deleted@user.com',
            password: 'whatever'
        };

        before((cb) => {
            app.models.user.create(userData, (err, res) => {
                if (err) return cb(err);

                user = res;
                cb();
            });
        });

        it('should login and create token', (cb) => {
            request(app)
                .post('/Users/login')
                .send(userData)
                .expect(200, (err, res) => {
                    if (err) return cb(err);

                    app.models.AccessToken.find({ where: { userId: user.id } }, (err, tokens) => {
                        if (err) return cb(err);

                        tokens.length.should.be.aboveOrEqual(1);
                        cb();
                    });
                });
        });

        it('should disable user and remove Access Tokens', (cb) => {
            app.models.user.disable(user.id, (err, res) => {
                if (err) return cb(err);

                should.equal(res, true);

                app.models.user.findById(user.id, (err, userObj) => {
                    if (err) return cb(err);

                    userObj.should.have.property('isDeleted', true);

                    app.models.AccessToken.find({ where: { userId: user.id } }, (err, tokens) => {
                        if (err) return cb(err);

                        tokens.length.should.be.equal(0);

                        cb();
                    });
                });
            });
        });

        it('should not be able to login', (cb) => {
            request(app)
                .post('/Users/login')
                .send(userData)
                .expect(403, cb);
        });
    });

    describe(' NotificationSettings ', () => {
        var auth;
        var userId;

        beforeEach(cb => {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, (err, res) => {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });

        it('should be impossible to read notification settings of some user', (cb) => {
            request(app)
                .get(`/users/${userId}/notificationSettings`)
                .expect(401, cb);
        });
        //it('should be impossible to read non-existent notification settings', (cb) => {
        //    request(app)
        //        .get(`/users/123123123123123123/notificationSettings`)
        //        .expect(404, cb);
        //});

        it('should be possible to get notification settings', (cb) => {
            request(app)
                .get(`/users/${userId}/notificationSettings`)
                .set('Authorization', auth)
                .expect(200, (err, res) => {
                    res.body.should.have.property('emailReply', 1);
                    res.body.should.have.property('emailLike', 1);
                    cb();
                });
        });
        it('should be not possible to update settings', (cb) => {
            request(app)
                .put(`/users/${userId}/notificationSettings`)
                .set('Authorization', auth)
                .send({
                    emailReply: 0,
                    emailLike: 1
                })
                .expect(200, (err, res) => {
                    res.body.should.have.property('emailReply', 0);
                    res.body.should.have.property('emailLike', 1);
                    cb();
                });
        });
    });

    describe(' for authorized users ', () => {
        var auth;
        var userId;

        beforeEach(cb => {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, (err, res) => {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    auth = res.body.id;
                    userId = res.body.userId;
                    cb();
                });
        });

        it('should be possible to setName()', (cb) => {
            request(app)
                .post(`/users/${userId}/name`)
                .set('Authorization', auth)
                .send({
                    name: 'ValidNameButNew'
                })
                .expect(200, cb);
        });
        it('should be not possible to setName too short', (cb) => {
            request(app)
                .post(`/users/${userId}/name`)
                .set('Authorization', auth)
                .send({
                    name: ''
                })
                .expect(400, (err, res) => {
                    res.body.name.error.should.match(/use 32 char/);
                    cb();
                });
        });
        it('should be not possible to setName too long', (cb) => {
            request(app)
                .post(`/users/${userId}/name`)
                .set('Authorization', auth)
                .send({
                    name: (new Array(50)).join(' ')
                })
                .expect(400, (err, res) => {
                    res.body.name.error.should.match(/use 32 char/);
                    cb();
                });
        });
        it('should be not possible to setName with invalid characters', (cb) => {
            request(app)
                .post(`/users/${userId}/name`)
                .set('Authorization', auth)
                .send({
                    name: 'i-use^invalid!text>,<'
                })
                .expect(400, (err, res) => {
                    res.body.name.error.should.match(/use some regular/);
                    cb();
                });
        });

        it('should be possible to setAbout()', (cb) => {
            request(app)
                .post(`/users/${userId}/about`)
                .set('Authorization', auth)
                .send({
                    about: 'Valid about who cares'
                })
                .expect(200, cb);
        });
        it('should be not possible to setAbout too long', (cb) => {
            request(app)
                .post(`/users/${userId}/about`)
                .set('Authorization', auth)
                .send({
                    about: (new Array(512)).join('-')
                })
                .expect(400, (err, res) => {
                    res.body.about.error.should.match(/500 letters/);
                    cb();
                });
        });

    });
});

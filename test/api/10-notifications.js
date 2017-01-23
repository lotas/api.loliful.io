/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Notification', function () {
    var app;

    beforeEach(function () {
        app = require('../../server/server.js');
    });

    describe('Non Authorized Users', () => {
        it('Should respond with 401 for list request', function (cb) {
            request(app)
                .get('/notifications/')
                .send()
                .expect(401, cb);
        });
        it('Should respond with 401 for count request', function (cb) {
            request(app)
                .get('/notifications/count')
                .send()
                .expect(401, cb);
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

        describe('Query and read', () => {
            var notificationId;
            it('should fetch latest notifications', cb => {
                app.models.notification.create({
                    userId: userId,
                    date: Date.now(),
                    type: 'like',
                    actorId: '999',
                    data: {},
                    isRead: 0
                }, (err, res) => {
                    notificationId = res.id;
                    request(app)
                        .get('/notifications')
                        .set('Authorization', auth)
                        .expect(200, function (err, res) {
                            if (err) return cb(err);

                            res.body.should.be.instanceOf(Array);
                            res.body.length.should.be.aboveOrEqual(1);

                            cb();
                        });
                });
            });
            it('should fetch count', cb => {
                request(app)
                    .get('/notifications/count')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('count');
                        res.body.should.have.property('unread');

                        cb();
                    });
            });
            it('should mark read', cb => {
                request(app)
                    .post('/notifications/markRead')
                    .set('Authorization', auth)
                    .send()
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.date.should.be.instanceOf(Number);
                        cb();
                    });
            });
            it('should return zero unread', cb => {
                request(app)
                    .get('/notifications/count')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('count');
                        res.body.should.have.property('unread', 0);

                        cb();
                    });
            });
        });


    });

});

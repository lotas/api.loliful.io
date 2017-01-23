/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Hammers', function() {
    var app;

    beforeEach(function() {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    it('should respond with 401 for unauthorized request', function(cb) {
        request(app)
            .get('/hammers')
            .send()
            .expect(401, function(err, res) {
                if (err) return cb(err);

                res.body.should.have.property('error');
                res.body.error.message.should.be.exactly('Authorization Required');
                cb();
            });
    });


    describe(' for authorized users ', function() {
        var auth;
        var authOtherUser;
        var nailId;
        var userId;
        var anotherUserId;
        var hammerId;

        beforeEach(function(cb) {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    auth = res.body.id;
                    userId = res.body.userId;

                    request(app)
                        .post('/Users/login')
                        .send(shared.anotherUser)
                        .expect(200, function(err, res) {
                            if (err) return cb(err);
                            authOtherUser = res.body.id;
                            anotherUserId = res.body.userId;

                            request(app)
                                .get('/nails')
                                .set('Authorization', auth)
                                .expect(200, function(err, res) {
                                    if (err) return cb(err);

                                    nailId = res.body[0].id;
                                    cb();
                                });
                        });
                });
        });

        it('should be possible to add hammer', function(cb) {
            request(app)
                .post('/nails/' + nailId + '/hammers')
                .set('Authorization', auth)
                .send(shared.testHammer)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    res.body.should.have.property('userId');
                    res.body.should.have.property('nailId');
                    res.body.should.have.property('text', shared.testHammer.text);

                    // hidden
                    res.body.should.not.have.property('group');

                    hammerId = res.body.id;

                    cb();
                });
        });

        it('should update nail countAnswers after adding hammer', function(cb) {
            request(app)
                .post('/nails/' + nailId + '/hammers')
                .set('Authorization', auth)
                .send(shared.testHammer)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    app.models.nail.findById(nailId, function(err, nail) {
                        if (err) return cb(err);

                        String(nail.countAnswers).should.be.above(0);

                        cb();
                    });
                });
        });

        it('should fail when nailId does not exist', function(cb) {
            request(app)
                .post('/nails/999aaaa9999aaaa9999/hammers')
                .set('Authorization', auth)
                .expect(404, cb);
        });

        describe('vote', function() {
            it('should be votable', function(cb) {
                request(app)
                    .post('/hammers/' + hammerId + '/vote')
                    .set('Authorization', authOtherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('countVotes').and.be.exactly(1);
                        cb();
                    });
            });
            it('should be unvotable', function(cb) {
                request(app)
                    .delete('/hammers/' + hammerId + '/vote')
                    .set('Authorization', authOtherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('countVotes').and.be.exactly(0);
                        cb();
                    });
            });
        });

        describe('favorite', function() {
            it('should be addable to favorites', function(cb) {
                request(app)
                    .post('/hammers/' + hammerId + '/favorite')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('success').and.be.exactly(true);
                        cb();
                    });
            });

            it('should remove nail from favorites', function(cb) {
                request(app)
                    .delete('/hammers/' + hammerId + '/favorite')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('success').and.be.exactly(true);
                        cb();
                    });
            });
        });

        describe('delete', function() {
            it('should be possible to remove own hammer', function(cb) {
                request(app)
                    .post('/nails/' + nailId + '/hammers')
                    .set('Authorization', auth)
                    .send({
                        text: 'hammer1'
                    })
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('id');

                        request(app)
                            .delete('/hammers/' + res.body.id)
                            .set('Authorization', auth)
                            .expect(200, cb);
                    });
            });


            it('should be impossible to remove other users hammer', function(cb) {
                request(app)
                    .post('/Users/login')
                    .send(shared.anotherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('id');
                        var otherAuth = res.body.id;

                        request(app)
                            .delete('/hammers/' + hammerId)
                            .set('Authorization', otherAuth)
                            .expect(401, cb);

                    });
            });
        });


        describe('edit', function() {
            var hammerId;

            before(function(cb){
                request(app)
                    .post('/nails/' + nailId + '/hammers')
                    .set('Authorization', auth)
                    .send({
                        text: 'hammer-shammer'
                    })
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('id');
                        hammerId = res.body.id;

                        cb();
                    });
            });


            it('should be editable by owner', function(cb) {
                request(app)
                    .put('/hammers/' + hammerId)
                    .set('Authorization', auth)
                    .send({text: 'SomethingX'})
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        app.models.hammer.findById(hammerId, function(err, hammer) {
                            if (err) return cb(err);

                            hammer.should.have.property('text', 'SomethingX');
                            cb();
                        });
                    });
            });
            it('should not be editable by others', function(cb) {
                request(app)
                    .put('/hammers/' + hammerId)
                    .set('Authorization', authOtherUser)
                    .send({text: 'Something Different'})
                    .expect(401, cb);
            });

            it('can not save empty text', function (cb) {
                request(app)
                    .put('/hammers/' + hammerId)
                    .send({text: ''})
                    .set('Authorization', auth)
                    .expect(422, cb);
            });

            it('only text', function(cb) {
                app.models.hammer.findById(hammerId, function(err, hammerObj) {
                    if (err) return cb(err);

                    request(app)
                        .put('/hammers/' + hammerId)
                        .set('Authorization', auth)
                        .send({
                            countVotes: 999,
                            rating: 999,
                            userId: 999,
                            reported: 999,
                            nailId: 999,
                            text: 'XupdX'
                        })
                        .expect(200, function(err, res) {
                            if (err) return cb(err);

                            app.models.hammer.findById(hammerId, function(err, newHammer) {
                                if (err) return cb(err);

                                newHammer.should.have.property('text', 'XupdX');
                                newHammer.should.have.property('countVotes', hammerObj.countVotes);
                                newHammer.should.have.property('rating', hammerObj.rating);
                                newHammer.should.have.property('userId', hammerObj.userId);
                                newHammer.should.have.property('reported', hammerObj.reported);
                                newHammer.should.have.property('nailId', hammerObj.nailId);

                                cb();
                            });
                        });
                });
            });
        });

    });
});

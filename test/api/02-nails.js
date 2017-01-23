/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Nails', function() {
    var app;

    beforeEach(function() {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    it('should respond with 401 for unauthorized request', function(cb) {
        request(app)
            .get('/nails')
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

                            cb();
                        });
                });
        });

        it('should create nail', function(cb) {
            request(app)
                .post('/nails')
                .set('Authorization', auth)
                .send(shared.testNail)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    res.body.should.have.property('text');
                    res.body.text.should.be.exactly(shared.testNail.text);

                    //hidden properties
                    res.body.should.not.have.property('isPublic');
                    res.body.should.not.have.property('group');
                    res.body.should.not.have.property('countReported');

                    nailId = res.body.id;

                    // check db
                    app.models.nail.findById(nailId, function(err, nail) {
                        if (err) return cb(err);

                        nail.id.should.be.exactly(nailId);
                        nail.text.should.be.exactly(shared.testNail.text);

                        cb();
                    });
                });
        });
        it('should exist in database', function(cb) {
            request(app)
                .get('/nails/' + nailId + '/exists')
                .set('Authorization', auth)
                .expect(200, cb);
        });

        it('should be possible to create duplicate questions', function(cb) {
            request(app)
                .post('/nails')
                .set('Authorization', auth)
                .send(shared.testNail)
                .expect(200, cb);
        });

        it('should not be created with extra fields', function(cb) {
            request(app)
                .post('/nails')
                .set('Authorization', auth)
                .send(shared.invalidNail)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('text').and.be.exactly('test');
                    res.body.should.have.property('rating').and.be.exactly(0);
                    res.body.should.have.property('countAnswers').and.be.exactly(0);
                    cb();
                });
        });

        it('should return list of nails', function(cb) {
            request(app)
                .get('/nails')
                .set('Authorization', auth)
                .send()
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.be.instanceOf(Array);
                    res.body.length.should.be.greaterThan(0);
                    cb();
                });
        });

        it('should return a single nail', function(cb) {
            request(app)
                .get('/nails/' + nailId)
                .set('Authorization', auth)
                .send()
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('text', shared.testNail.text);
                    res.body.should.not.have.property(['countVotes', 'countAnswers']);

                    cb();
                });
        });

        describe('vote', function() {
            it('should vote for nail', function(cb) {
                request(app)
                    .post('/nails/' + nailId + '/vote')
                    .set('Authorization', authOtherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('countVotes');

                        app.models.Votes.findOne({where: {nailId: nailId}}, function(err, vote) {
                            if (err) return cb(err);

                            String(vote.nailId).should.be.exactly(String(nailId));
                            String(vote.userId).should.be.exactly(String(anotherUserId));

                            cb();
                        });
                    });
            });

            it('should not vote for self nail', function(cb) {
                request(app)
                    .post('/nails/' + nailId + '/vote')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('countVotes');
                        res.body['countVotes'].should.match(/Probably you shouldn/);
                        cb();
                    });
            });

            it('should remove vote for nail', function(cb) {
                request(app)
                    .delete('/nails/' + nailId + '/vote')
                    .set('Authorization', authOtherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('countVotes');
                        cb();
                    });
            });


            it('should return count', function(cb) {
                request(app)
                    .get('/nails/count')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('count').and.be.greaterThan(0);

                        cb();
                    });
            });
        });

        describe('favorite', function() {
            it('should be addable to favorites', function(cb) {
                request(app)
                    .post('/nails/' + nailId + '/favorite')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('success').and.be.exactly(true);
                        cb();
                    });
            });

            it('should remove nail from favorites', function(cb) {
                request(app)
                    .delete('/nails/' + nailId + '/favorite')
                    .set('Authorization', auth)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('success').and.be.exactly(true);
                        cb();
                    });
            });
        });

        describe('delete', function() {
            it('should be possible to delete own nail', function(cb) {
                request(app)
                    .post('/nails')
                    .set('Authorization', auth)
                    .send({
                        text: 'test2222'
                    })
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('id');

                        var newNailId = res.body.id;

                        request(app)
                            .delete('/nails/' + newNailId)
                            .set('Authorization', auth)
                            .expect(200, cb);
                    });
            });

            it('should be impossible to remove other users nails', function(cb) {
                request(app)
                    .post('/Users/login')
                    .send(shared.anotherUser)
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('id');
                        var otherAuth = res.body.id;

                        request(app)
                            .delete('/nails/' + nailId)
                            .set('Authorization', otherAuth)
                            .expect(401, cb);

                    });
            });


            it('should not delete hammers ', function(cb) {
                request(app)
                    .delete('/nails/' + nailId + '/hammers')
                    .set('Authorization', auth)
                    .expect(404, cb);
            });

        });


        describe('edit', function() {

            it('should be editable by owner', function(cb) {
                request(app)
                    .put('/nails/' + nailId)
                    .set('Authorization', auth)
                    .send({text: 'SomethingX'})
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        app.models.nail.findById(nailId, function(err, nail) {
                            if (err) return cb(err);

                            nail.should.have.property('text', 'SomethingX');
                            cb();
                        });
                    });
            });
            it('should not be editable by others', function(cb) {
                request(app)
                    .put('/nails/' + nailId)
                    .set('Authorization', authOtherUser)
                    .send({text: 'Something Different'})
                    .expect(401, cb);
            });

            it('can not save empty text', function (cb) {
                request(app)
                    .put('/nails/' + nailId)
                    .send({text: ''})
                    .set('Authorization', auth)
                    .expect(422, cb);
            });

            it('should only edit allowed fields', function(cb) {
                app.models.nail.findById(nailId, function(err, nailObj) {
                    if (err) return cb(err);

                    request(app)
                        .put('/nails/' + nailId)
                        .set('Authorization', auth)
                        .send({
                            countVotes: 999,
                            rating: 999,
                            userId: 999,
                            reported: 999,
                            created: 999,
                            text: 'XupdX'
                        })
                        .expect(200, function(err, res) {
                            if (err) return cb(err);

                            app.models.nail.findById(nailId, function(err, newNailObj) {
                                if (err) return cb(err);

                                newNailObj.should.have.property('text', 'XupdX');
                                newNailObj.should.have.property('countVotes', nailObj.countVotes);
                                newNailObj.should.have.property('rating', nailObj.rating);
                                newNailObj.should.have.property('userId', nailObj.userId);
                                newNailObj.should.have.property('reported', nailObj.reported);
                                newNailObj.should.have.property('created', nailObj.created);

                                cb();
                            });
                        });
                });
            });
        });

    });

});

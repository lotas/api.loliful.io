/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Main', function () {
    var app;

    beforeEach(function () {
        app = require('../../server/server.js');
    });

    function createNailPromise(nail) {
        return new Promise((resolve, reject) => {
            app.models.nail.create(nail, (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        });
    }
    function createHammerPromise(nail) {
        return new Promise((resolve, reject) => {
            app.models.hammer.create(nail, (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        });
    }


    describe('Non Authorized Users', () => {
        it('Activity:Nails should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/activity/nails')
                .send()
                .expect(401, cb);
        });
        it('Activity:Hammers should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/activity/hammers')
                .send()
                .expect(401, cb);
        });
        it('Activity:Likes should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/activity/likes')
                .send()
                .expect(401, cb);
        });
        it('Activity:Saves should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/activity/saves')
                .send()
                .expect(401, cb);
        });

        it('Fresh should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/fresh')
                .send()
                .expect(401, cb);
        });
        it('Top should be publically available', function (cb) {
            request(app)
                .get('/top')
                .send()
                .expect(200, cb);
        });
        it('Nail view should respond with 401 for unauthorized request', function (cb) {
            request(app)
                .get('/nail/123')
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

        function checkPager(res) {
            res.body.should.have.property('pager');
            res.body.pager.should.have.property('page');
            res.body.pager.should.have.property('pages');
            res.body.pager.should.have.property('total');
            res.body.pager.should.have.property('first');
            res.body.pager.should.have.property('last');
            res.body.pager.should.have.property('next');
            res.body.pager.should.have.property('prev');
        }

        describe('Activity', () => {
            it('should fetch latest hammers', cb => {
                request(app)
                    .get('/activity/hammers')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('hammers');
                        res.body.hammers.should.be.instanceOf(Array);
                        checkPager(res);

                        cb();
                    });
            });
            it('should fetch latest nails', cb => {
                request(app)
                    .get('/activity/nails')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('nails');
                        res.body.nails.should.be.instanceOf(Array);
                        checkPager(res);

                        cb();
                    });
            });
            it('should fetch latest likes', cb => {
                request(app)
                    .get('/activity/likes')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('likes');
                        res.body.likes.should.be.instanceOf(Array);
                        checkPager(res);

                        cb();
                    });
            });
            it('should fetch latest saves', cb => {
                request(app)
                    .get('/activity/saves')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('saves');
                        res.body.saves.should.be.instanceOf(Array);
                        checkPager(res);

                        cb();
                    });
            });
        });

        describe('Top', () => {
            before(cb => {
                var nail1 = { text: 'joke1' + Date.now(), userId: 3, created: new Date() };
                var nail2 = { text: 'joke2' + Date.now(), userId: 2, created: new Date() };

                createNailPromise(nail1)
                    .then(nail => {
                        return createHammerPromise({
                            text: 'hammer1',
                            nailId: nail.id
                        });
                    })
                    .then(() => {
                        return createNailPromise(nail2);
                    })
                    .then(nail => {
                        return createHammerPromise({
                            text: 'hammer2',
                            nailId: nail.id
                        }).then(hammer => {
                            app.models.votes.addVote('hammer', hammer.id, 1, cb);
                        });
                    })
                    .catch(cb);
            });

            it('should fetch top', cb => {
                request(app)
                    .get('/top')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('jokes');
                        res.body.jokes.should.be.instanceOf(Array);
                        res.body.jokes.length.should.be.aboveOrEqual(0);
                        checkPager(res);

                        if (res.body.jokes.length > 1) {
                            res.body.jokes[0].countVotes.should.be.aboveOrEqual(
                                res.body.jokes[1].countVotes || 0
                            );
                        }

                        cb();
                    });
            });
        });

        describe('Fresh', () => {
            before(cb => {
                var nail1 = { text: 'joke1' + Date.now(), userId: 3, created: new Date() };
                var nail2 = { text: 'joke2' + Date.now(), userId: 2, created: new Date() };

                createNailPromise(nail1)
                    .then(nail => {
                        return createNailPromise(nail2);
                    })
                    .then((res) => {
                        app.models.votes.addVote('nail', res.id, 1, cb);
                    })
                    .catch(cb);
            });
            it('should fetch fresh', cb => {
                request(app)
                    .get('/fresh')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('nails');
                        res.body.nails.should.be.instanceOf(Array);
                        res.body.nails.length.should.be.greaterThan(0);
                        checkPager(res);

                        res.body.nails[0].created.should.be.aboveOrEqual(
                            res.body.nails[1].created
                            );

                        cb();
                    });
            });
            it('should fetch fresh popular', cb => {
                request(app)
                    .get('/fresh?type=popular')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('nails');
                        res.body.nails.should.be.instanceOf(Array);
                        res.body.nails.length.should.be.greaterThan(0);
                        checkPager(res);

                        res.body.nails[0].countVotes.should.be.aboveOrEqual(
                            res.body.nails[1].countVotes
                        );

                        res.body.nails[0].countAnswers.should.be.aboveOrEqual(
                            res.body.nails[1].countAnswers
                        );

                        cb();
                    });
            });
            it('should fetch fresh recent', cb => {
                request(app)
                    .get('/fresh?type=recent')
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('nails');
                        res.body.nails.should.be.instanceOf(Array);
                        res.body.nails.length.should.be.greaterThan(0);
                        checkPager(res);

                        res.body.nails[0].created.should.be.aboveOrEqual(
                            res.body.nails[1].created
                            );

                        cb();
                    });
            });
        });

        describe('Nail View', () => {
            var nail;

            before(cb => {
                var nail1 = { text: 'joke1' + Date.now(), userId: userId, created: new Date() };

                createNailPromise(nail1)
                    .then(_nail => {
                        nail = _nail;
                        return createHammerPromise({
                            text: 'hammer1',
                            nailId: _nail.id
                        });
                    })
                    .then((items) => {
                        cb();
                    })
                    .catch(cb);
            });
            it('should return 404', cb => {
                request(app)
                    .get('/nail/no-such-id')
                    .set('Authorization', auth)
                    .expect(404, cb);
            });
            it('should fetch view nail', cb => {
                request(app)
                    .get('/nail/' + nail.id)
                    .set('Authorization', auth)
                    .expect(200, function (err, res) {
                        if (err) return cb(err);

                        res.body.should.have.property('nail');

                        res.body.nail.should.have.property('$hammers');
                        res.body.nail.$hammers.length.should.be.aboveOrEqual(1);
                        res.body.nail.$hammers[0].should.have.property('text', 'hammer1');

                        cb();
                    });
            });
        });

    });

});

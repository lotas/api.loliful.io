/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var shared = require('../shared-data');

describe('API: Share: ', function() {
    var app;

    before(function() {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    // for separately testing this suit
    // before(function(cb) {
    //     app.models.user.create(shared.testUser, cb);
    // });

    describe('Nail:', function() {
        var auth;
        var userId;
        var nail;

        before(function(cb) {
            app.models.user.login(shared.testUser, function(err, token) {
                if (err) return cb(err);

                auth = token.id;
                userId = token.userId;

                request(app)
                    .post('/nails')
                    .set('Authorization', auth)
                    .send({text: `haha ${Date.now()}`})
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        nail = res.body;
                        cb();
                    });
            });
        });

        it('should generate new share card for just nail', function(cb) {
            this.timeout(15000);

            request(app)
                .get(`/share/${nail.id}`)
                .set('Authorization', auth)
                .expect(200, function(err, res) {
                    res.body.should.have.property('id');
                    res.body.should.have.property('img');
                    res.body.should.have.property('url');

                    app.models.share.findOne({
                        where: {
                            nailId: nail.id,
                            hammerId: null
                        }
                    }, function(err2, shareItem) {
                        if (err2) return cb(err2);

                        should.equal(shareItem.img, res.body.img);
                        should.equal(shareItem.data.nailText, nail.text);
                        should.equal(shareItem.nailAuthorId, userId);
                        should.equal(shareItem.data.hammerText, '');
                        should.equal(shareItem.hammerAuthorId, null);
                        should.equal(shareItem.sharedCount, 1);

                        cb();
                    });
                });
        });
        it('should return 404 for unknown nail', function(cb) {
            this.timeout(15000);

            request(app)
                .get(`/share/123321123`)
                .set('Authorization', auth)
                .expect(404, cb);
        });
    });

    describe('Nail + Hammer:', function() {
        var auth;
        var userId;
        var nail;
        var hammer;

        before(function(cb) {
            this.timeout(500000);
            app.models.user.login(shared.testUser, function(err, token) {
                if (err) return cb(err);

                auth = token.id;
                userId = token.userId;

                request(app)
                    .post('/nails')
                    .set('Authorization', auth)
                    .send({text: `haha ${Date.now()}`})
                    .expect(200, function(err, res) {
                        if (err) return cb(err);

                        nail = res.body;

                        request(app)
                            .post('/nails/' + nail.id + '/hammers')
                            .set('Authorization', auth)
                            .send({text: `haha ${Date.now()}`})
                            .expect(200, function(err, res) {
                                if (err) return cb(err);

                                hammer = res.body;
                                cb();
                            });
                    });
            });
        });

        it('should generate new share card for nail and hammer', function(cb) {
            this.timeout(15000);

            request(app)
                .get(`/share/${nail.id}/${hammer.id}`)
                .set('Authorization', auth)
                .expect(200, function(err, res) {
                    res.body.should.have.property('id');
                    res.body.should.have.property('img');
                    res.body.should.have.property('url');

                    app.models.share.findOne({
                        where: {
                            nailId: nail.id,
                            hammerId: hammer.id
                        }
                    }, function(err2, shareItem) {
                        if (err2) return cb(err2);

                        should.equal(shareItem.img, res.body.img);
                        should.equal(shareItem.data.nailText, nail.text);
                        should.equal(shareItem.nailAuthorId, userId);
                        should.equal(shareItem.data.hammerText, hammer.text);
                        should.equal(shareItem.hammerAuthorId, userId);
                        should.equal(shareItem.sharedCount, 1);

                        cb();
                    });
                });
        });
        it('should return 404 for unknown nail and hammer', function(cb) {
            this.timeout(15000);

            request(app)
                .get(`/share/999999999/888888888`)
                .set('Authorization', auth)
                .expect(404, cb);
        });
    });


    describe('ShareClick', function() {
        var shareItem;

        before(function(cb) {
            app.models.share.create({
                nailId: 1,
                hammerId: 1,
                img: 'url'
            }, function(err, obj) {
                if (err) return cb(err);

                shareItem = obj;
                cb();
            });
        });

        it('should count clicks', function(cb) {
            request(app)
                .post(`/share/${shareItem.id}/somethingUnique`)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    app.models.shareClick.findOne({
                        where: {
                            shareId: shareItem.id,
                            network: 'somethingUnique'
                        }
                    }, function(err, item) {
                        if (err) return cb(err);

                        should.equal(item.userId, null);

                        app.models.share.findById(shareItem.id, function(err, obj2) {
                            if (err) return cb(err);

                            should.equal(obj2.sharedClicks, shareItem.sharedClicks + 1);

                            cb();
                        });
                    });
                });
        });

        it('should increase sharedCount with each request', function(cb){
             request(app)
                .get(`/share/${shareItem.nailId}/${shareItem.hammerId}`)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    should.equal(res.body.id, shareItem.id);

                    app.models.share.findById(shareItem.id, function(err, obj2) {
                        if (err) return cb(err);

                        should.equal(obj2.sharedCount, shareItem.sharedCount + 1);

                        cb();
                    });
                });
        });
    });
});

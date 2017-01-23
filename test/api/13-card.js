/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var shared = require('../shared-data');

describe('API: Card: ', function() {
    var app;
    var share;

    before(function() {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    // for separately testing this suit
    before(function(cb) {
        app.models.share.create(shared.testShare, function(err, res) {
            if (err) return cb(err);

            share = res;
            cb();
        });
    });

    it('should render share card', function(cb) {
        request(app)
            .get(`/card/${share.id}`)
            .expect(200, function(err, res) {

                res.text.should.containEql(share.data.nailText);
                res.text.should.containEql(share.data.hammerText);
                res.text.should.containEql(share.data.nailAuthor);
                res.text.should.containEql(share.data.hammerAuthor);

                res.text.should.containEql('app.loliful.io');

                cb();
            });
    });

    it('should escape nailText', function(cb) {
        var newShare = JSON.parse(JSON.stringify(shared.testShare));
        newShare.data.nailText = '<h1>haha</h1>';
        newShare.data.hammerText = '<h2>haha</h2>';

        app.models.share.create(newShare, function(err, newShareObj) {
            if (err) return cb(err);

            request(app)
                .get(`/card/${newShareObj.id}`)
                .expect(200, function(err, res) {

                    res.text.should.containEql('&lt;h1>haha&lt;/h1>');
                    res.text.should.containEql('&lt;h2>haha&lt;/h2>');

                    cb();
            });
        });
    });

    it('should return 404 for unknown card', function(cb) {
        request(app)
            .get(`/card/999999999`)
            .expect(404, cb);
    });
});

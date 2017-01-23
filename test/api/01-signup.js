/* global beforeEach */
/* global it */
/* global describe */
var should = require('should');
var request = require('supertest');
var shared = require('../shared-data');
function xit(){}

describe('User signup & login', function() {
	var app;

	beforeEach(function() {
		app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

	xit('should fail with 422 for invalid signup data', function(cb) {
		request(app)
			.post('/Users')
			.send({incomplete: true})
			.expect(422)
			.end(cb);
	});

	it('should be impossible to create new user', function(cb) {
		request(app)
			.post('/Users')
			.send(shared.testUser)
			.expect(401, cb);
	});

	xit('should be possible to create another user', function(cb) {
		request(app)
			.post('/Users')
			.send(shared.anotherUser)
			.expect(200, function(err, res) {
				if (err) return cb(err);

				res.body.should.have.property('id');
				cb();
			});
	});

	xit('should be impossible to create user twice', function(cb) {
		request(app)
			.post('/Users')
			.send(shared.testUser)
			.expect(200);

		request(app)
			.post('/Users')
			.send(shared.testUser)
			.expect(422, function(err, res) {
				if (err) return cb(err);

				res.body.should.have.property('error');
				res.body.error.should.have.property('name');
				res.body.error.name.should.be.exactly('ValidationError');

				cb();
			});
	});

	it('should be possible to login', function(cb) {
        app.models.user.create(shared.testUser, (err, res) => {
            request(app)
                .post('/Users/login')
                .send(shared.testUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    res.body.should.have.property('ttl');
                    res.body.should.have.property('userId');

                    cb();
                });
        });
	});
	it('should be possible to login with another user', function(cb) {
        app.models.user.create(shared.anotherUser, (err, res) => {
            request(app)
                .post('/Users/login')
                .send(shared.anotherUser)
                .expect(200, function(err, res) {
                    if (err) return cb(err);

                    res.body.should.have.property('id');
                    res.body.should.have.property('ttl');
                    res.body.should.have.property('userId');

                    cb();
                });
        });
	});
});

describe('Social networks', function() {
    var app;

    beforeEach(function() {
        app = require('../../server/server.js');
        app.use(app.loopback.rest());
    });

    it('should be possible to authorize with facebook', function(cb) {
        this.timeout(15000);
        request(app)
            .get('/auth/facebook')
            .expect(301, function(err, res) {
                res.headers.location.should.match(/www.facebook.com.+client_id/);

                request(app)
                    .get('/auth/facebook/callback')
                    .expect(302, cb);
            });
    });
    // twitter is an asshole for some reason, not playing well in passport oauth
    // twitter is making http call, needs to be mocked?
    // it('should be possible to authorize with twitter', function(cb) {
    //    this.timeout(20000);
    //    request(app)
    //        .get('/auth/twitter')
    //        .expect(302, function(err, res) {
    //            res.headers.location.should.match(/api.twitter.com.+oauth_token/);

    //            request(app)
    //                .get('/auth/twitter/callback')
    //                .expect(302, cb);
    //        });
    // });
    it('should be possible to authorize with google', function(cb) {
        this.timeout(15000);
        request(app)
            .get('/auth/google')
            .expect(301, function(err, res) {
                res.headers.location.should.match(/google.com.+client_id/);

                request(app)
                    .get('/auth/google/callback')
                    .expect(302, cb);
            });
    });
});


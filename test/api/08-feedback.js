/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var request = require('supertest');
var loopback = require('loopback');

var shared = require('../shared-data');

describe('API: Feedback', function() {
    var app;
    var emailData;
    var auth;

    beforeEach(function(cb) {
        app = require('../../server/server.js');

        // overwrite method
        app.models.Email.send = function(data) {
            emailData = data;
        };

        request(app)
            .post('/Users/login')
            .send(shared.testUser)
            .expect(200, function(err, res) {
                auth = res.body.id;
                cb();
            });
    });

    it('should get 401 for unauthorized users', cb => {
        request(app)
            .post('/feedback')
            .send({
                feedback: 'You rock'
            })
            .expect(401, cb);
    });

    it('should send email', cb => {
        request(app)
            .post('/feedback')
            .set('Authorization', auth)
            .send({
                feedback: 'You rock'
            })
            .expect(200, function(err, res) {
                if (err) return cb(err);

                res.body.should.have.property('sent');

                emailData.should.have.property('to', 'feedback@loliful.io');
                emailData.should.have.property('from', 'no-reply@loliful.io');
                emailData.should.have.property('text');

                emailData.text.should.match(new RegExp(shared.testUser.email));
                emailData.text.should.match(/You rock/);

                cb();
            });
    });

});

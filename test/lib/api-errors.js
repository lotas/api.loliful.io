/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var apiErrors = require('../../server/lib/api-errors');
var loopback = require('loopback');

describe('Api Errors', function() {

    it('should export methods', function(cb) {
        apiErrors.authRequired.should.be.instanceOf(Function);
        apiErrors.permissionDenied.should.be.instanceOf(Function);
        apiErrors.exception.should.be.instanceOf(Function);
        apiErrors.validation.should.be.instanceOf(Function);
        cb();
    });

    it('should return ApiError for auth required', function(cb) {
        var error = apiErrors.authRequired();
        error.message.should.equal('Not authorized');
        error.should.have.property('statusCode', 401);

        error = apiErrors.authRequired('custom');
        error.message.should.equal('custom');
        error.should.have.property('statusCode', 401);
        cb();
    });

    it('should return ApiError for permission denied', function(cb) {
        var error = apiErrors.permissionDenied();
        error.message.should.equal('Permission denied');
        error.should.have.property('statusCode', 403);

        error = apiErrors.permissionDenied('custom');
        error.message.should.equal('custom');
        error.should.have.property('statusCode', 403);

        cb();
    });

    it('should return ApiError for exception', function(cb) {
        var error = apiErrors.exception();

        error.message.should.equal('Something bad happened');
        error.should.have.property('statusCode', 500);

        error = apiErrors.exception('custom', 555);
        error.message.should.equal('custom');
        error.should.have.property('statusCode', 555);

        cb();
    });

    it('should return ApiError for validationError', function(cb) {
        var error = apiErrors.validation();

        error.message.should.equal('Precondition failed');
        error.should.have.property('statusCode', 412);

        error = apiErrors.validation('custom', 555);
        error.message.should.equal('custom');
        error.should.have.property('statusCode', 555);

        cb();
    });

});

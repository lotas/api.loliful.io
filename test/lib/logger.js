/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var logger = require('../../server/lib/logger');
var loopback = require('loopback');

describe('Logger', function() {

    it('should export logger', function(cb) {
        logger.should.be.instanceOf(Function);
        cb();
    });

    // it('should attach logger', function(cb) {
    //     var app = {
    //         use: function(morganLogger) {
    //             morganLogger.should.be.instanceOf(Function);
    //             cb();
    //         }
    //     };

    //     logger(app);
    // });
});

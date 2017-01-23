/* global beforeEach */
/* global it */
/* global describe */
/* global before */
var should = require('should');
var live = require('../../server/lib/live');
var loopback = require('loopback');

describe('Live socket.io', function() {

    it('should export publish functions', function(cb) {
        live.publish.should.be.instanceOf(Function);
        live.publishPrivate.should.be.instanceOf(Function);
        cb();
    });

    it('should emit event', function(cb) {
        var evt, data;
        var socketSpy = {
            emit: function() {
                evt = arguments[0];
                data = arguments[1];
            }
        };
        live.publish(socketSpy, 'evt', 'data');

        should.equal(evt, 'evt');
        should.equal(data, 'data');

        cb();
    });

    it('should emit private event', function(cb) {
        var room, evt, data;
        var socketSpy = {
            sockets: {
                in: function() {
                    room = arguments[0];
                    return {
                        emit: function() {
                            evt = arguments[0];
                            data = arguments[1];
                        }
                    };
                }
            }
        };

        live.publishPrivate(socketSpy, '1', 'evt', 'data');

        should.equal(room, 'user:1');
        should.equal(evt, 'p:evt');
        should.equal(data, 'data');

        cb();
    });
});

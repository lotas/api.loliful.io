'use strict';

const LoopBackContext = require('loopback-context');

module.exports = function getCurrentUserId() {
    var ctx = LoopBackContext.getCurrentContext();
    return ctx && ctx.get('currentUser') ? ctx.get('currentUser').id : '0';
};

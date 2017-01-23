'use strict';

var getCurrentUserId = require('./get-current-user-id');

module.exports = function ensureLoggedIn(req, res, next) {

    if (!getCurrentUserId() || getCurrentUserId() === '0') {
        return res.status(401).send('Not Authorized');
    }

    next();

};

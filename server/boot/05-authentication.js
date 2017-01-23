const loopback = require('loopback');
const debug = require('debug')('kontra:auth');
const _ = require('lodash');
const LoopBackContext = require('loopback-context');

module.exports = function enableAuthentication(server) {
    // enable authentication
    server.enableAuth();

    server.use(function setCurrentUser(req, res, next) {
        if (!req.accessToken || !req.accessToken.userId) {
            return next();
        }

        server.models.User.findById(String(req.accessToken.userId), function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                debug('No user found for a token', req.accessToken);
                return next();
            }

            req.user = _.pick(user, ['email', 'id', 'name', 'username', 'avatar', 'about']);

            var loopbackContext = LoopBackContext.getCurrentContext();
            if (loopbackContext) {
                loopbackContext.set('currentUser', req.user);
            } else {
                debug('setCurrentUser: Missing current context!');
            }

            next();
        });
    });

};

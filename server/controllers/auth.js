var debug = require('debug')('kontra:auth');
var config = require('../config');
var crypto = require('crypto');
var _ = require('lodash');

var EmailListSync = require('../lib/email-list-sync');


module.exports = function(app) {

    var router = app.loopback.Router();

    app.use('/', router);

    router.get('/auth/success', (req, res) => {
        if (req.accessToken && req.accessToken.id && req.accessToken.userId) {
            respondWithTokenAndUser(req.accessToken.id, req.accessToken.userId);
        } else if (req.signedCookies && req.signedCookies['access_token']) {
            respondWithTokenAndUser(req.signedCookies['access_token'], req.signedCookies.userId);
        } else {
            res.redirect(config.frontendUrl + '/login');
        }

        function respondWithTokenAndUser(tokenId, userId) {
            app.models.user.findById(userId, (err, user) => {
                if (err || !user) {
                    return res.sendStatus(401);
                }

                if (user.isDeleted) {
                    req.logout();
                    return res.redirect(config.frontendUrl + '/login?msg=Account+disabled');
                }

                crypto.randomBytes(24, function(ex, buf) {
                    var token = buf.toString('hex');

                    app.models.shortToken.create({
                        token: token,
                        expires: Date.now() + 1000 * 60 * 10,
                        data: {
                            accessToken: {
                                id: tokenId,
                                userId: userId
                            },
                            user: {
                                email: user.email,
                                username: user.username,
                                name: user.name,
                                id: user.id,
                                settings: user.settings
                            }
                        }
                    }, (err, shortToken) => {
                        if (err) {
                            debug('Error creating short token', err);
                        }
                        res.redirect(config.frontendUrl + '/auth?token=' + token);
                    });
                });
            });
        }
    });
    router.get('/auth/token/:token', (req, res) => {
        var token = req.params.token;
        app.models.shortToken.findById(token, (err, shortToken) => {
            if (err || !shortToken || shortToken.expires < Date.now()) {
                if (shortToken) {
                    shortToken.remove();
                }
                debug(err);
                return res.sendStatus(404);
            }

            shortToken.remove();
            res.json(shortToken.data);
        });
    });

    router.get('/auth/unlink/:provider', (req, res) => {
        if (req.user) {
            // TODO: check if this is the last one and don't disconnect
            app.models.userIdentity.findOne({
                where: {
                    userId: req.user.id,
                    provider: req.params.provider
                }
            }, (err, identity) => {
                if (err || !identity) {
                    debug(err);
                    return res.sendStatus(404);
                }
                identity.remove(function() {
                    app.models.userIdentity.updateUserSocialAccounts(req.user.id);
                });
                res.json({removed: true});
            });
        } else {
            res.sendStatus(403);
        }
    });

    router.post('/auth/first-run', (req, res) => {
        if (req.user) {
            app.models.user.findById(req.user.id, (err, user) => {
                if (err || !user) {
                    return debug(err);
                }
                if (user.settings) {
                    user.settings.firstRun = false;
                    user.updateAttribute('settings', user.settings);
                }
                // subscribe to digest
                EmailListSync.subscribe(user.email);
            });
        }
        res.sendStatus(200);
    });

    router.get('/me', (req, res) => {
        res.json(req.user);
    });

    router.get('/avatar/:userId', (req, res) => {
        app.models.avatars.findOne({
            where: {
                userId: req.params.userId
            }
        }, (err, avatar) => {
            if (err) {
                debug(err);
                return res.sendStatus(501);
            }

            if (avatar) {
                return res.json(avatar);
            }

            app.models.avatars.createUserAvatar(req.params.userId)
                .then(avatars => {
                    return res.json(avatars);
                })
                .catch(err => {
                    debug(err);
                    return res.sendStatus(501);
                });
        });
    });

    router.post('/avatar/:userId', (req, res) => {
        app.models.user.findById(req.params.userId, (err, user) => {
            if (err || !user) {
                debug(err);
                return res.sendStatus(404);
            }

            app.models.avatars.createUserAvatar(user.id)
                .then(avatars => {
                    if (avatars.length > 0) {
                        if (user.avatar !== avatars[0].url) {
                            user.updateAttribute('avatar', avatars[0].url, debug.bind(debug));
                        }
                    }
                    return res.json(avatars);
                })
                .catch(err => {
                    debug(err);
                    return res.sendStatus(501);
                });
        });
    });

    router.get('/profile/:userId', (req, res) => {
        app.models.user.findById(req.params.userId, (err, user) => {
            if (err) {
                debug(err);
                return res.sendStatus(404);
            }

            // get linked social accounts
            // TODO : check privacy settings
            let exposedProps = ['about', 'accounts', 'avatar', 'id', 'name', 'username', 'badges'];

            let strippedUser = _.pick(user, exposedProps);

            res.json(strippedUser);
        });
    });

    /**
     * Should be probably removed at some point...
     *
     * @param {Function} cb
     */
    router.post('/signup', function(req, res, next) {

        if (!config.flags.signupEnabled) {
            return res.sendStatus(404);
        }

        var User = app.models.User;

        var newUser = {};
        newUser.email = req.body.email.toLowerCase();
        newUser.username = req.body.username.trim();
        newUser.password = req.body.password;

        User.create(newUser, function(err, user) {
            if (err) {
                req.flash('error', err.message);
                debug('Error creating user: ', err);
                return res.redirect('back');
            } else {
                // Passport exposes a login() function on req (also aliased as logIn())
                // that can be used to establish a login session. This function is
                // primarily used when users sign up, during which req.login() can
                // be invoked to log in the newly registered user.
                req.login(user, function(err) {
                    if (err) {
                        debug('Error logging in user: ', err);
                        req.flash('error', err.message);
                        return res.redirect('back');
                    }
                    return res.redirect('/auth/account');
                });
            }
        });
    });

    router.get('/auth/logout', function(req, res, next) {
        req.logout();
        res.redirect('/');
    });

};

var async = require('async');
var _ = require('lodash');
var debug = require('debug')('kontra:model:user');

var config = require('../../server/config.js');
var apiErrors = require('../../server/lib/api-errors');
var appEvents = require('../../server/lib/app-events');
var MailService = require('../../server/lib/mail-service');
var EmailListSync = require('../../server/lib/email-list-sync');

module.exports = function(User) {

    if (false === config.flags.signupEnabled) {
        User.beforeRemote('create', function(ctx, user, next) {
            ctx.res.sendStatus(404);
        });

        User.beforeRemote('resetPassword', function(ctx, user, next) {
            ctx.res.sendStatus(404);
        });
    }

    User.disableRemoteMethod('__updateById__nails', false);
    User.disableRemoteMethod('__destroyById__nails', false);
    User.disableRemoteMethod('__delete__nails', false);
    User.disableRemoteMethod('__create__nails', false);

    User.disableRemoteMethod('__create__accessTokens', false);
    User.disableRemoteMethod('__delete__accessTokens', false);
    User.disableRemoteMethod('__findById__accessTokens', false);
    User.disableRemoteMethod('__create__notificationSettings', false);


    User.increaseKarma = increaseKarma;
    User.decreaseKarma = decreaseKarma;
    User.updateCounts = updateCounts;


    /**
     Overriding default login to be able to block user if isDeleted === 1
     **/
    User.__origLogin = User.login;
    User.login = function(params, include, cb) {
        var loginArguments = arguments;
        var self = this;

        if (typeof include === 'function') {
            cb = include;
        }

        var filter = _.omit(params, ['password']);

        User.find({where: filter}, function(err, user) {
            if (err) return cb(err);

            if (user.length && user[0].isDeleted) {
                return cb(apiErrors.permissionDenied('Account deleted'));
            }

            User.__origLogin.apply(self, loginArguments);
        });
    };

    User.remoteMethod('disable', {
        description: 'Disable user account',
        accepts: [
            {arg: 'userId', type: 'String', required: true}
        ],
        returns: {arg: 'isDeleted', type: 'Boolean'},
        http: {path: '/disable', verb: 'POST'}
    });

    User.disable = function(userId, cb) {
        User.findById(userId, (err, user) => {
            if (err) return cb(err);

            user.isDeleted = true;
            user.save((err, success) => {
                if (err) return cb(err);

                debug(`Removed user ${userId}: isDeleted = true`);

                // disable/remove auth tokens
                User.app.models.AccessToken.destroyAll({userId: userId}, (err, res) => {
                    if (err) {
                        debug('Error removing user tokens: ', err);
                    } else {
                        debug(`Removed all user AccessTokens ${userId}`);
                    }

                    cb(null, user.isDeleted);
                });
            });
        });
    };


    User.afterRemote('*.__get__notificationSettings', function(ctx, settings, next) {
        // Create settings if there were no settings
        if (settings === null && ctx.instance && ctx.instance.id) {
            ctx.instance.notificationSettings.create({
                // default values to be used
            }, (err, createdSettings) => {
                if (err) {
                    debug('Error creating user notification settings', err);
                    return next();
                }
                debug('Creating default user notificaiton settings [uid=%s]', ctx.instance.id);
                settings = createdSettings;
                ctx.result = settings;
                next(null, settings);
            });
        } else {
            next();
        }
    });

    User.afterRemote('*.__update__notificationSettings', function(ctx, settings, next) {
        next();

        let userEmail = ctx.instance.email;

        process.nextTick(() => {
            if (parseInt(settings.emailDigest, 10) === 1) {
                EmailListSync.subscribe(userEmail);
            } else {
                EmailListSync.unsubscribe(userEmail);
            }
        });
    });


    User.stats = function(userId, cb) {
        if (!userId) {
            cb(null, {});
        }

        var userPromise = new Promise((resolve, reject) => {
            User.findById(userId, (err, user) => {
                if (err) {
                    return reject(err);
                }
                resolve(user);
            });
        });
        var totalCountPromise = new Promise((resolve, reject) => {
            User.count((err, cnt) => {
                if (err) {
                    return reject(err);
                }
                resolve(cnt);
            });
        });

        User.app.models.rating.findById(userId, (err, res) => {
            Promise.all([userPromise, totalCountPromise]).then(values => {
                var user = values[0];
                var totalCnt = values[1];

                var response = {
                    nailCount: user.nailCount,
                    hammerCount: user.hammerCount,
                    nailKarma: user.nailKarma,
                    hammerKarma: user.hammerKarma,
                    rating: res || {},
                    total: totalCnt
                };
                cb(null, response);
            })
            .catch(err => {
                debug(`Error fetching user for stats ${err}`);
                cb(null, {});
            });
        });

    };

    /**
     *
     * @param {String} userId
     * @param {String} model
     */
    function countByType(userId, model, cb) {
        User.app.models[model].count({
            userId: userId
        }, cb);
    }

    User.remoteMethod('stats', {
        description: 'User stats',
        accepts: [
            {arg: 'userId', type: 'String'}
        ],
        returns: {arg: 'stats', type: 'object'},
        http: {path: '/stats', verb: 'GET'}
    });

    User.remoteMethod('setName', {
        isStatic: false,
        description: 'Set user name',
        accepts: [
            {arg: 'name', type: 'String', required: true}
        ],
        returns: {arg: 'name', type: 'string'},
        http: {path: '/name', verb: 'POST'}
    });

    User.prototype.setName = function(name, cb) {
        var user = this;
        if (name.length < 1 || name.length > 32) {
            return cb(null, {error: 'Short names are up to 15% funnier! Please use 32 chars max.'});
        }
        if (name.match(/[^a-z0-9-_. ]+/i)) {
            return cb(null, {error: 'Please use some regular characters.'});
        }

        var oldName = user.name;
        user.name = name;
        user.updateAttribute('name', user.name, (err, res) => {
            if (err) {
                debug(err);
                return cb(null, {name: oldName, dup: true});
            }

            cb(null, {name: user.name});

            appEvents.emit(appEvents.EVENTS.NAME_CHANGE, {
                'from': oldName,
                'to': user.name,
                'userId': user.id
            });
        });
    };

    User.remoteMethod('setAbout', {
        isStatic: false,
        description: 'Set about',
        accepts: [
            {arg: 'about', type: 'String', required: true}
        ],
        returns: {arg: 'about', type: 'string'},
        http: {path: '/about', verb: 'POST'}
    });

    User.prototype.setAbout = function(about, cb) {
        var user = this;
        if (about.length > 500) {
            return cb(null, {error: 'Scientists believe, that an average text ' +
                'that person can read is limited to 500 letters. Keep it short ;)'});
        }

        user.about = about;
        user.updateAttribute('about', user.about, (err, res) => {
            if (err) {
                debug(err);
                return cb(null, {});
            }
            cb(null, {about: user.about});
        });
    };


    User.updateAvatarFromSocial = function(user) {
        if (user.avatar) {
            return false;
        }

        User.app.models.avatars.createUserAvatar(user.id)
            .then(avatars => {
                if (avatars && avatars.length) {
                    user.avatar = _.first(_.map(avatars, 'url'));
                    user.updateAttribute('avatar', user.avatar);
                }
            })
            .catch(err => {
                debug(err);
            });
    };


    /**
     *
     * @param userId
     * @param modelName nail|hammer
     */
    function increaseKarma(userId, modelName) {
        User.findById(userId, (err, user) => {
            if (err || !user) {
                return debug(`increaseKarma: User not found ${userId}`);
            }

            var field = `${modelName}Karma`;
            if (!user[field]) {
                user[field] = 0;
            }

            user[field]++;
            user.updateAttribute(field, user[field], (err) => {
                if (err) debug(err);
            });
        });
    }
    /**
     *
     * @param userId
     * @param modelName nail|hammer
     */
    function decreaseKarma(userId, modelName) {
        User.findById(userId, (err, user) => {
            if (err || !user) {
                return debug(`dereaseKarma: User not found ${userId}`);
            }

            var field = `${modelName}Karma`;
            if (!user[field]) {
                user[field] = 0;
            }

            user[field]--;
            user.updateAttribute(field, user[field], (err) => {
                if (err) debug(err);
            });
        });
    }

    /**
     * Update nailCount, hammerCount
     * @param userId
     * @param modelName nail|hammer
     * @param int inc +1/-1
     */
    function updateCounts(userId, modelName, inc) {
        User.findById(userId, (err, user) => {
            if (err || !user) {
                return debug(`updateCounts: User not found ${userId}, ${modelName}, ${inc}`);
            }

            var field = `${modelName}Count`;
            if (!user[field]) {
                user[field] = 0;
            }

            user[field] += inc;
            user.updateAttribute(field, user[field], (err) => {
                if (err) debug(err);
            });
        });
    }


    /* *****  EMAILS ***** */
    User.afterRemote('*', function(ctx, instance, next) {
        // Mask no email
        if (instance && instance.email && instance.email.match(/noemail.loliful.io/)) {
            instance.email = '';
        }
        if (ctx.instance && ctx.instance.email && ctx.instance.email.match(/noemail.loliful.io/)) {
            ctx.instance.email = '';
        }
        next();
    });

    // email
    User.remoteMethod('setEmail', {
        isStatic: false,
        description: 'Set user email',
        accepts: [
            {arg: 'email', type: 'String', required: true}
        ],
        returns: {arg: 'email', type: 'string'},
        http: {path: '/email', verb: 'PUT'}
    });

    User.prototype.setEmail = function(email, cb) {
        var user = this;

        /* jshint maxlen: 500 */
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        if (email.length < 4 || email.length > 512 || !re.test(email)) {
            return cb(apiErrors.validation('Invalid email'));
        }

        // TODO: check uniqueness
        User.count({
            email: email
        }, (err, cnt) => {
            if (err) {
                debug(err);
                return cb(apiErrors.exception('Unknown error'));
            }

            if (cnt > 0) {
                return cb(apiErrors.validation('Email already in use'));
            }

            user.emailVerified = 0;
            user.emailUnverified = email;
            User.generateVerificationToken(user, (err, token) => {
                if (err) {
                    debug(`Error generating token ${err}`);
                    return cb(apiErrors.exception('Cannot generate token'));
                }

                token = token.substr(0, 8) + 'size' + token.substr(8, 16) + 'doesnt' + token.substr(16, 20) +
                    'matter' + token.substr(20, 30);

                user.verificationToken = token;
                user.save((err, res) => {
                    if (err) {
                        debug(err);
                        return cb(apiErrors.exception('Cannot save data'));
                    }

                    var ms = new MailService(User.app.models.Email);
                    ms.sendConfirmationEmail(user);

                    cb(null, user.emailUnverified);

                    appEvents.emit(appEvents.EVENTS.EMAIL_CHANGE, {
                        'from': user.email,
                        'to': user.emailUnverified,
                        'userId': user.id
                    });
                });
            });
        });
    };


    // Overriding default one, because it is not working properly for us
    User.confirm = function(uid, token, redirect, fn) {
        this.findById(uid, function(err, user) {
            if (err) {
                return fn(apiErrors.exception(err));
            } else {
                if (user && user.verificationToken === token) {
                    user.verificationToken = '';
                    user.emailVerified = true;
                    user.email = user.emailUnverified;
                    user.emailUnverified = '';
                    user.save(function(err) {
                        if (err) {
                            return fn(apiErrors.exception('Cannot save data'));
                        } else {
                            fn();

                            process.nextTick(() => {
                                EmailListSync.subscribe(user.email);
                            });
                        }
                    });
                } else {
                    if (user) {
                        err = new Error('Invalid token: ' + token);
                        err.statusCode = 400;
                        err.code = 'INVALID_TOKEN';
                    } else {
                        err = new Error('User not found: ' + uid);
                        err.statusCode = 404;
                        err.code = 'USER_NOT_FOUND';
                    }
                    fn(err);
                }
            }
        });
    };
    User.afterRemote('confirm', function(ctx, instance, next) {
        ctx.res.status(302);
        ctx.res.location('http://app.loliful.io');
        next();
    });
};

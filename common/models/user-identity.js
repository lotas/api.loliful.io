'use strict';

var debug = require('debug')('kontra:model:user-identity');
var _ = require('lodash');
var appEvents = require('../../server/lib/app-events');

module.exports = function(UserIdentity) {

    /*
     * Keep user credentials in sync after saving a user-identity
     * It checks if a UserCredentialModel with the same provider and external ID exists for that user
     * It assumes that the providername of userIdentity has suffix `-login`and of userCredentials has suffix `-link`
     *
     * @param Loopback context object
     * @param next middleware function
     * */
    UserIdentity.observe('after save', function checkuserCredentials(ctx, next) {
        if (ctx.options && ctx.options.skipAfterSave) return next();

        var data = JSON.parse(JSON.stringify(ctx.instance));

        delete data.id; // has to be auto-increment

        var userCredential = UserIdentity.app.models.userCredential;
        var filter = {where: {userId: data.userId, provider: data.provider, externalId: data.externalId}};

        userCredential.findOrCreate(filter, data, {skipAfterSave: true}, function(err, res) {
            if (err) {
                return next(err);
            }

            process.nextTick(function() {
                UserIdentity.updateUserSocialAccounts(data.userId);
            });

            next();
        });
    });


    UserIdentity.updateUserSocialAccounts = updateUserSocialAccounts;

    function updateUserSocialAccounts(userId, cb) {
        UserIdentity.find({
            where: {
                userId: userId
            }
        }, (err, res) => {
            if (err) {
                return debug('Error fetching identities', err);
            }

            var parsed = parseIdentities(res || []);

            UserIdentity.app.models.user.findById(userId, function(err, user) {
                if (err) {
                    return debug(err);
                }

                user.accounts = parsed.accounts;

                if (parsed.name && (user.settings.firstRun || !user.name)) {
                    user.name = parsed.name;
                }

                if (user.email.match(/@loopback\./)) {
                    if (parsed.emails.length > 0) {
                        user.email = parsed.emails[0];
                    } else {
                        user.email = `${user.username}@noemail.loliful.io`;
                    }
                }

                user.save(function(err, res) {
                    if (err) {
                        debug(err);
                        console.error(err);

                        user.name += '-' + Math.floor((Math.random() * 9999999));
                        user.updateAttribute('name', user.name);
                    }
                    if (cb) {
                        cb();
                    }
                });

                // Optionally update avatar
                UserIdentity.app.models.user.updateAvatarFromSocial(user);

                if (user.settings.firstRun) {
                    appEvents.emit(appEvents.EVENTS.NEW_USER, {
                        'name': user.name,
                        'accounts': user.accounts
                    });
                }
            });
        });

        function parseIdentities(identities) {
            var res = {
                accounts: [],
                name: '',
                emails: false
            };

            res.accounts = identities.map(identityToAcc);
            res.name = res.accounts.length ? res.accounts[0].n : false;
            res.emails = identities.map(fetchEmail).filter(a => a);

            return res;
        }

        function fetchEmail(identity) {
            if (identity && identity.profile && identity.profile.emails) {
                return _.first(identity.profile.emails).value;
            }
            return false;
        }

        function identityToAcc(identity) {
            switch (identity.provider) {
                case 'twitter-login':
                case 'twitter-link':
                case 'twitter':
                    return {
                        p: 'twitter',
                        u: identity.profile.username || identity.externalId,
                        n: identity.profile.displayName || identity.externalId,
                        l: `https://twitter.com/${identity.profile.username}`
                    };

                case 'facebook-login':
                case 'facebook-link':
                case 'facebook':
                    return {
                        p: 'facebook',
                        u: identity.profile.id || identity.externalId,
                        n: identity.profile.displayName || identity.externalId,
                        l: identity.profile.profileUrl || `https://facebook.com/${identity.externalId}`
                    };

                case 'google-login':
                case 'google-link':
                case 'google':
                    return {
                        p: 'google',
                        u: identity.profile.id || identity.externalId,
                        n: identity.profile.displayName || identity.externalId,
                        l: identity.profile._json ? identity.profile._json.url :
                            `https://plus.google.com/${identity.profile.id}`
                    };
            }
            return false;
        }
    }
};

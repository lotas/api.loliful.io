var _ = require('lodash');
var debug = require('debug')('kontra:model:avatars');
var request = require('request');


module.exports = function(Avatars) {

    Avatars.createUserAvatar = createUserAvatar;
    Avatars.fetchAvatarFromSocialProfile = fetchAvatarFromSocialProfile;
    // @TODO: move to UserIdentity instance
    Avatars.createEntryForIdentity = createEntryForIdentity;

    // for mocking
    Avatars.request = request;


    /**
     * For every identity fetch photo
     *
     * @param {String} userId
     * @returns {Promise}
     */
    function createUserAvatar(userId) {
        return new Promise((resolve, reject) => {
            Avatars.app.models.userIdentity.find({
                 where: {
                     userId: userId
                 }
             }, (err, res) => {
                 if (err) {
                     debug(err);
                     return reject(err);
                 }

                 var actions = res.map(createEntryForIdentity);
                 var results = Promise.all(actions);

                 results.then(data => {
                     resolve(data);
                 }).catch(err => {
                     reject(err);
                 });
             });
        });
    }

    /**
     *
     * @param identity
     * @returns {Promise}
     */
    function createEntryForIdentity(identity) {
        return new Promise((resolve, reject) => {
            if (!identity || !identity.profile) {
                return resolve(false);
            }

            var avatarData = fetchAvatarFromSocialProfile(identity);

            if (avatarData && avatarData.direct === true) {
               return  _createOne(identity.userId, avatarData.source, avatarData.link);

            } else if (avatarData && avatarData.direct === false) {
                Avatars.request(avatarData.link, (error, response, body) => {
                    if (!error) {
                        var json = JSON.parse(body);
                        if (json && json.data && json.data.url) {
                            return _createOne(identity.userId, avatarData.source, json.data.url);
                        }
                    }
                    resolve(false);
                });
            } else {
                resolve(false);
            }

            function _createOne(userId, source, url) {
                Avatars.findOrCreate({
                    userId: userId,
                    source: source,
                    url: url
                }, (err, avatar) => {
                    if (err) {
                        debug(err);
                    }
                    resolve(avatar);
                });
            }

        });
    }

    /**
     *
     * @param {Object} identity
     * @param {String} identity.provider
     * @param {Object} identity.profile
     * @returns {*}
     */
    function fetchAvatarFromSocialProfile(identity) {

        switch (identity.provider) {
            case 'twitter-login':
            case 'twitter-link':
            case 'twitter':

                if (identity.profile.photos) {
                    return {
                        direct: true,
                        source: 'twitter',
                        link: _.first(
                            _.map(identity.profile.photos, 'value')
                        )
                    };
                }

                break;

            case 'facebook-login':
            case 'facebook-link':
            case 'facebook':

                if (identity.profile.id) {
                    return {
                        direct: false,
                        source: 'facebook',
                        link: `https://graph.facebook.com/${identity.profile.id}/picture?redirect=false&type=large`
                    };
                }

                break;

            case 'google-login':
            case 'google-link':
            case 'google':

                if (identity.profile.photos) {
                    return {
                        direct: true,
                        source: 'google',
                        link: _.first(
                            _.map(identity.profile.photos, 'value')
                        )
                    };
                }

                break;
        }

        return false;
    }
};

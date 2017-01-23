var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var avatarsExtend = require('../../common/models/avatars');

describe('Model: Avatar', function() {
    var dataSource;
    var Avatars;
    var UserIdentity;
    var createSpy = function(data, cb) {
        cb(null, data);
    };
    var twitterIdentity = {
        provider: 'twitter',
        userId: '999twitter999',
        profile: {
            photos: [{
                value: 'TWITTER_IMAGE'
            }]
        }
    };
    var facebookIdentity = {
        provider: 'facebook',
        userId: '999facebook999',
        externalId: 'FB_USER_ID',
        profile: {
            id: 'FB_USER_ID'
        }
    };
    var googleIdentity = {
        provider: 'google',
        userId: '999google999',
        profile: {
            photos: [{
                value: 'GOOGLE_IMAGE'
            }]
        }
    };

    beforeEach(function() {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
                connector: loopback.Memory
            });

        Avatars = loopback.createModel('avatars', {name: String, userId: String, source: String, url: String});
        Avatars.attachTo(dataSource);

        UserIdentity = loopback.createModel('userIdentity', {
            provider: String,
            userId: String,
            externalId: String,
            profile: Object,
            credentials: Object
        });
        UserIdentity.attachTo(dataSource);
        avatarsExtend(Avatars);

        Avatars.app = {
            models: {
                userIdentity: UserIdentity
            }
        };
    });

    describe('Social identity parsing', function() {
        it('should fetch avatar for twitter identity', function(cb) {
            Avatars.fetchAvatarFromSocialProfile.should.be.instanceOf(Function);

            var avatarData = Avatars.fetchAvatarFromSocialProfile(twitterIdentity);

            avatarData.should.have.property('direct', true);
            avatarData.should.have.property('source', 'twitter');
            avatarData.should.have.property('link', 'TWITTER_IMAGE');

            cb();
        });

        it('should fetch avatar for facebook identity', function(cb) {

            var avatarData = Avatars.fetchAvatarFromSocialProfile(facebookIdentity);

            avatarData.should.have.property('direct', false);
            avatarData.should.have.property('source', 'facebook');
            avatarData.should.have.property('link',
                'https://graph.facebook.com/FB_USER_ID/picture?redirect=false&type=large');

            cb();
        });

        it('should fetch avatar for google identity', function(cb) {

            var avatarData = Avatars.fetchAvatarFromSocialProfile(googleIdentity);

            avatarData.should.have.property('direct', true);
            avatarData.should.have.property('source', 'google');
            avatarData.should.have.property('link', 'GOOGLE_IMAGE');

            cb();
        });
    });

    describe('Avatar entry creation', function() {
        it('should create entry for twitter identity', function(cb) {
            Avatars.createEntryForIdentity.should.be.instanceOf(Function);

            Avatars.createEntryForIdentity(twitterIdentity)
                .then(function(data) {
                    data.should.have.property('userId', twitterIdentity.userId);
                    Avatars.find({
                        where: {
                            userId: twitterIdentity.userId
                        }
                    }, function(err, ava) {
                        ava[0].should.have.property('source', 'twitter');
                        ava[0].should.have.property('url', 'TWITTER_IMAGE');
                        cb();
                    });
                })
                .catch(cb);
        });

        it('should create entry for facebook identity', function(cb) {
            Avatars.createEntryForIdentity.should.be.instanceOf(Function);

            //mock
            Avatars.request = function(link, callback) {
                callback(null, {statusCode: 200}, '{"data": {"url": "returned_url"}}');
            };

            Avatars.createEntryForIdentity(facebookIdentity)
                .then(function(data) {
                    data.should.have.property('userId', facebookIdentity.userId);

                    Avatars.find({
                        where: {
                            userId: facebookIdentity.userId
                        }
                    }, function(err, ava) {
                        ava[0].should.have.property('source', 'facebook');
                        ava[0].should.have.property('url', 'returned_url');
                        cb();
                    });
                })
                .catch(cb);
        });

        it('should create entry for google identity', function(cb) {
            Avatars.createEntryForIdentity(googleIdentity)
                .then(function(data) {
                    data.should.have.property('userId', googleIdentity.userId);

                    Avatars.find({
                        where: {
                            userId: googleIdentity.userId
                        }
                    }, function(err, ava) {
                        ava[0].should.have.property('source', 'google');
                        ava[0].should.have.property('url', 'GOOGLE_IMAGE');
                        cb();
                    });
                })
                .catch(cb);
        });

        it('should not create entry for bad identity', function(cb) {
            Avatars.createEntryForIdentity({unknown: true})
                .then(function(data) {
                    data.should.equal(false);
                    cb();
                })
                .catch(cb);
        });
    });

    describe('Parsing all identities and creating avatars', function() {

        it('should create entry for user with twitter identity', function(cb) {
            UserIdentity.create(twitterIdentity, function(err, identity) {
                identity.should.have.property('userId', twitterIdentity.userId);


                Avatars.createUserAvatar(twitterIdentity.userId)
                    .then(function(avatars) {
                        avatars[0].should.have.property('source', 'twitter');
                        avatars[0].should.have.property('url', 'TWITTER_IMAGE');
                        cb();
                    })
                    .catch(cb);
            });
        });

    });

});

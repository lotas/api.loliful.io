var should = require('should');
var loopback = require('loopback');
var _ = require('lodash');
var notificationExtend = require('../../common/models/notification');
var LoopBackContext = require('loopback-context');


describe('Model: Notification', function () {
    var dataSource;
    var Notification;
    var createSpy = function (data, cb) {
        cb(null, data);
    };

    beforeEach(function () {
        // setup a model / datasource
        dataSource = this.dataSource || loopback.createDataSource({
            connector: loopback.Memory
        });

        Notification = loopback.createModel('notification', {
            name: String,
            userId: String,
            date: String,
            type: String,
            actorId: String,
            entity: String,
            entityId: String,
            nailId: String,
            hammerId: String,
            text: String
        });
        Notification.attachTo(dataSource);
        notificationExtend(Notification);

        LoopBackContext.getCurrentContext = function() {
            return {
                "get": function(key) {
                    return {
                        id: 'u1'  // userid
                    };
                }
            };
        };
    });

    it('should export shortcut functions', function (cb) {

        Notification.addLike.should.be.instanceOf(Function);
        Notification.addUnlike.should.be.instanceOf(Function);
        Notification.addSave.should.be.instanceOf(Function);
        Notification.addShare.should.be.instanceOf(Function);
        Notification.addReply.should.be.instanceOf(Function);
        Notification.addNotificationForUser.should.be.instanceOf(Function);

        cb();
    });

    describe('Likes', function () {
        it('should add like for nail', (cb) => {
            var entity = {
                id: 'n1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addLike(entity, 'nail', 'u2')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u2');
                        data.should.have.property('type', 'like');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'nail');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                })
                .catch(err => {
                    cb(err);
                });
        });

        it('should add like for hammer', (cb) => {
            var entity = {
                id: 'h1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addLike(entity, 'hammer', 'u20')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u20');
                        data.should.have.property('type', 'like');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'hammer');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                });
        });
    });

    describe('Unlikes', function () {
        it('should add unlike for nail', (cb) => {
            var entity = {
                id: 'n1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addUnlike(entity, 'nail', 'u2')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u2');
                        data.should.have.property('type', 'unlike');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'nail');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                })
                .catch(err => {
                    cb(err);
                });
        });

        it('should add unlike for hammer', (cb) => {
            var entity = {
                id: 'h1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addUnlike(entity, 'hammer', 'u20')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u20');
                        data.should.have.property('type', 'unlike');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'hammer');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                });
        });
    });

    describe('Saves', function () {
        it('should add save for nail', (cb) => {
            var entity = {
                id: 'n1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addSave(entity, 'nail', 'u2')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u2');
                        data.should.have.property('type', 'save');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'nail');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                });
        });

        it('should add save for hammer', (cb) => {
            var entity = {
                id: 'h1',
                userId: 'u1',
                text: 't1'
            };

            Notification.addSave(entity, 'hammer', 'u20')
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u20');
                        data.should.have.property('type', 'save');
                        data.should.have.property('text');
                        data.should.have.property('entity', 'hammer');
                        data.should.have.property('entityId', entity.id);

                        cb();
                    });
                });
        });
    });

    describe('Reply', function () {
        it('should add reply for nail', (cb) => {
            var nail = {
                id: 'n1',
                userId: 'u1',
                text: 'nt1'
            };
            var hammer = {
                id: 'h1',
                userId: 'u2',
                text: 'ht2'
            };

            Notification.addReply(nail, hammer)
                .then(res => {
                    Notification.findById(res.id, (err, data) => {
                        data.should.have.property('userId', 'u1');
                        data.should.have.property('actorId', 'u2');
                        data.should.have.property('type', 'reply');
                        data.should.have.property('text', nail.text + '...');
                        data.should.have.property('entity', 'nail');
                        data.should.have.property('entityId', nail.id);
                        data.should.have.property('nailId', nail.id);
                        data.should.have.property('hammerId', hammer.id);

                        cb();
                    });
                });
        });
    });

    describe('Share', function () {
        it('should add share', (cb) => {
            cb();
        });
    });

});

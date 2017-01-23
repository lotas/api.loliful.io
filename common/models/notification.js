'use strict';

var debug = require('debug')('kontra:model:notification');
var NotificationType = require('./notification-type');
var getCurrentUserId = require('../../server/lib/get-current-user-id');
var live = require('../../server/lib/live');
var _ = require('lodash');

module.exports = function(Notification) {

    Notification.disableRemoteMethod('create', true);

    Notification.addLike = addLike;
    Notification.addUnlike = addUnlike;
    Notification.addSave = addSave;
    Notification.addShare = addShare;
    Notification.addReply = addReply;
    Notification.addReplySame = addReplySame;
    Notification.addNotificationForUser = addNotificationForUser;

    /**
     * Limit all requests to current user
     */
    if (typeof process.env.KONTRA_LIMIT_TO_ACTOR === 'undefined') {
        Notification.observe('access', limitToUser);
    }
    Notification.afterRemote('count', attachUnreadCount);
    Notification.afterRemote('**', attachMeta);


    Notification.markRead = markAsRead;
    Notification.remoteMethod('markRead', {
        description: 'Mark as read',
        accepts: [
            {arg: 'notificationId', type: 'String', required: false}
        ],
        returns: {arg: 'date', type: 'Number'},
        http: {path: '/markRead', verb: 'POST'}
    });


    /**
     * Attach meta information for entities
     *
     * @param ctx
     * @param modelInstance
     * @param next
     */
    function attachMeta(ctx, modelInstance, next) {
        if (ctx.result) {
            if (Array.isArray(ctx.result)) {
                Notification.attachUserNames(ctx.result, 'actorId')
                    .then(res => {
                        next();
                    });
            } else {
                Notification.attachUserNames([ctx.result], 'actorId')
                    .then(res => {
                        next();
                    });
            }
        }
    }

    /**
     * Attach number of unread notifications for user
     *
     * @param ctx
     * @param out
     * @param next
     */
    function attachUnreadCount(ctx, out, next) {
        if (out.count > 0) {
            countUnreadForUser(getCurrentUserId(), (err, cnt) => {
                if (err) {
                    debug('error counting unread', err);
                } else {
                    out.unread = cnt;
                }
                next();
            });
        } else {
            next();
        }
    }

    /**
     * Absolutely all
     *
     * @param cb
     */
    function markAsRead(notificationId, cb) {
        var query = {
            userId: getCurrentUserId(),
            isRead: {neq: 1}
        };

        if (notificationId) {
            query.id = notificationId;
        }

        Notification.updateAll(query, {
            isRead: 1
        }, (err, data) => {
            if (err) {
                debug('error updating notifications as read', err);
                return cb(err);
            }
            cb(null, Date.now());
        });
    }


    /**
     * Filter all remote requests by current user id
     *
     * @param ctx
     * @param next
     */
    function limitToUser(ctx, next) {
        // avoid when searching
        if (ctx.options && ctx.options.skipLimitToUser === true) {
            return next();
        }
        ctx.query = _.defaultsDeep({
            where: {
                userId: getCurrentUserId()
            }
        }, ctx.query);
        next();
    }

    /**
     * Return unread count
     *
     * @param userId
     * @param cb
     */
    function countUnreadForUser(userId, cb) {
        Notification.count({
            userId: userId,
            isRead: {neq: 1}
        }, cb);
    }

    /**
     * Add like notification for given entity's author
     *
     * @param entity
     * @param modelName
     * @param userId
     * @returns {Promise}
     */
    function addLike(entity, modelName, userId) {
        return addNotificationForUser(
            entity.userId,
            NotificationType.LIKE,
            userId,
            {
                entity: modelName,
                entityId: entity.id,
                nailId: entity.nailId || entity.id,
                text: entity.text.substr(0, 20) + '...'
            }
        );
    }

    /**
     * Add unlike notification for given entity's author
     *
     * @param entity
     * @param modelName
     * @param userId
     * @returns {Promise}
     */
    function addUnlike(entity, modelName, userId) {
        return addNotificationForUser(
            entity.userId,
            NotificationType.UNLIKE,
            userId,
            {
                entity: modelName,
                entityId: entity.id,
                nailId: entity.nailId || entity.id,
                text: entity.text.substr(0, 20) + '...'
            }
        );
    }

    /**
     * When someone saves nail/hammer, notify owner
     *
     * @param entity
     * @param modelName
     * @param userId
     * @returns {Promise}
     */
    function addSave(entity, modelName, userId) {
        return addNotificationForUser(
            entity.userId,
            NotificationType.SAVE,
            userId,
            {
                entity: modelName,
                entityId: entity.id,
                nailId: entity.nailId || entity.id,
                text: entity.text.substr(0, 20) + '...'
            }
        );
    }

    /**
     * Add 'share' notification TODO
     */
    function addShare() {
        debug('to be added ..');
    }

    /**
     * Add 'reply' notification for nail author
     *
     * @param nail
     * @param hammer
     * @returns {Promise}
     */
    function addReply(nail, hammer) {
        return addNotificationForUser(
            nail.userId,
            NotificationType.REPLY,
            hammer.userId,
            {
                entity: 'nail',
                entityId: nail.id,
                nailId: nail.id,
                hammerId: hammer.id,
                text: nail.text.substr(0, 30) + '...'
            }
        );
    }

    /**
     * Add 'reply_same' notification
     * for every users that also replied same question
     *
     * @param nail
     * @param hammer new reply for the nail
     * @param otherUserId user who also answered same question
     * @returns {Promise}
     */
    function addReplySame(nail, hammer, otherUserId) {
        return addNotificationForUser(
            otherUserId,
            NotificationType.REPLY_SAME,
            hammer.userId,
            {
                entity: 'nail',
                entityId: nail.id,
                nailId: nail.id,
                hammerId: hammer.id,
                text: nail.text.substr(0, 30) + '...'
            }
        );
    }

    /**
     * Create new notification record and publish to private user channel
     *
     * @param userId
     * @param type
     * @param actorId
     * @param data
     * @returns {Promise}
     */
    function addNotificationForUser(userId, type, actorId, data) {

        return new Promise((resolve, reject) => {

            // check if not already happened
            if ([NotificationType.LIKE, NotificationType.UNLIKE].includes(type)) {
                Notification.findOne({
                    where: {
                        userId: userId,
                        type: type,
                        actorId: actorId,
                        entity: data.entity,
                        entityId: data.entityId
                    }
                }, {
                    skipLimitToUser: true
                }, function(err, entry) {
                    if (err || !entry) {
                        return createEntry();
                    }

                    entry.date = new Date();
                    entry.updateAttribute('date', entry.date);

                    resolve(entry);
                });
            } else {
                createEntry();
            }

            function createEntry() {
                Notification.create({
                    userId: userId,
                    type: type,
                    actorId: actorId,
                    text: data.text,
                    entity: data.entity || null,
                    entityId: data.entityId || null,
                    nailId: data.nailId || null,
                    hammerId: data.hammerId || null
                }, (err, res) => {
                    if (err) {
                        debug('Error adding notification: ', err);
                        return reject(err);
                    }
                    resolve(res);

                    if (Notification.app && Notification.app.io) {
                        countUnreadForUser(userId, (err, count) => {
                            if (err) {
                                return debug('count err', err);
                            }
                            live.publishPrivate(Notification.app.io, userId, 'unread', count);
                        });
                    }
                });
            }
        });
    }
};

'use strict';

var _ = require('lodash');
var async = require('async');
var debug = require('debug')('kontra:mixin:attach-meta');
var getCurrentUserId = require('../../server/lib/get-current-user-id');

module.exports = function (Model, options) {

    Model.attachMeta = attachMeta;
    Model.attachNails = attachNails;
    Model.attachHammers = attachHammers;
    Model.attachUserNames = attachUserNames;

    /**
     * Attach isVoted, isFavorite to nails/hammers
     *
     * @param {Array} items
     * @param {String} foreignKey "nailId|hammerId"
     */
    function attachMeta(items, fk) {
        return new Promise(resolve => {
            let where = {
                [fk]: {
                    inq: _.map(items, 'id')
                },
                userId: getCurrentUserId()
            };

            async.map(['votes', 'favorite'], (model, callback) => {
                Model.app.models[model].find({
                    where: where
                }, (err, subItems) => {
                    if (err) {
                        debug('Attach votes, favorite error:', err);
                    } else {
                        subItems.forEach(row => {
                            _.find(items, { id: row[fk] })['$' + model] = row.created;
                        });
                    }

                    callback(null, true);
                });
            }, (err) => {
                if (err) {
                    debug('async.map[votes, favorite] error', err);
                }

                resolve(items);
            });
        });
    }

    /**
     * Attach Nail to each entity
     *
     * @return {Promise}
     * @param  {any} items
     */
    function attachNails(items) {
        return new Promise(resolve => {
            var nailIds = _.filter(
                _.union(
                    _.uniq(_.map(items, 'nailId')),
                    _.map(_.filter(items, '$hammer'), '$hammer.nailId')
                ),
                a => a // Filter nulls
            );

            if (nailIds.length === 0) {
                return resolve(items);
            }

            Model.app.models.nail.find({
                where: {
                    id: {
                        inq: nailIds
                    }
                }
            }, (err, nails) => {
                if (err) {
                    debug('attachNails.find error', err);
                    return resolve(items);
                }

                items.forEach(item => {
                    if (item.nailId) {
                        item.$nail = _.find(nails, {id: item.nailId});
                    }
                    if (item.$hammer && item.$hammer.nailId) {
                        item.$hammer.$nail = _.find(nails, {id: item.$hammer.nailId});
                    }
                });

                resolve(items);
            });
        });
    }

    /**
     * Attach Hammer to each entity
     *
     * @return {Promise}
     * @param  {any} items
     */
    function attachHammers(items) {
        return new Promise(resolve => {
            var hammerIds = _.filter(
                    _.uniq(
                        _.map(items, 'hammerId'),
                        a => a
                    )
                );

            if (hammerIds.length === 0) {
                return resolve(items);
            }

            Model.app.models.hammer.find({
                where: {
                    id: {
                        inq: hammerIds
                    }
                }
            }, (err, hammers) => {
                if (err) {
                    debug('attachHammers.find error', err);
                    return resolve(items);
                }

                items.forEach(item => {
                    item.$hammer = _.find(hammers, { id: item.hammerId });
                });

                resolve(items);
            });
        });
    }



    /**
     * Attach to each entity & entity.nail user names
     *
     * @param {Array} objects
     * @param {String} userKey default:'userId'
    * @return {Promise}
     */
    function attachUserNames(objects, userKey) {
        userKey = userKey || 'userId';

        return new Promise(resolve => {
            var userIds = _.filter(
                _.union(
                    _.map(objects, userKey),
                    _.map(_.filter(objects, '$nail'), '$nail.userId'),
                    _.map(_.filter(objects, '$hammer'), '$hammer.userId'),
                    _.map(_.filter(objects, '$hammer.$nail'), '$hammer.$nail.userId')
                ),
                a => a
            );

            if (userIds.length === 0) {
                return resolve(objects);
            }

            Model.app.models.user.find({
                fields: ['id', 'name', 'avatar', 'badges'],
                where: {
                    id: {
                        inq: _.uniq(_.filter(userIds, a => a))
                    }
                }
            }, (err, users) => {
                if (err) {
                    debug('attachUserNames.find error', err);
                    return resolve(objects);
                }

                objects.forEach(item => {
                    item.$user = _.find(users, obj => String(obj.id) === String(item[userKey]));

                    if (item.$nail) {
                        item.$nail.$user = _.find(users, { id: item.$nail.userId });
                    }
                    if (item.$hammer) {
                        item.$hammer.$user = _.find(users, { id: item.$hammer.userId });

                        if (item.$hammer.$nail) {
                            item.$hammer.$nail.$user = _.find(users, { id: item.$hammer.$nail.userId });
                        }
                    }
                });

                resolve(objects);
            });
        });
    }
};

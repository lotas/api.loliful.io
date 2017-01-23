'use strict';

var debug = require('debug')('kontra:model:nail');
const _ = require('lodash');

const moment = require('moment');

var config = require('../../server/config');
var apiErrors = require('../../server/lib/api-errors');
var getCurrentUserId = require('../../server/lib/get-current-user-id');
var live = require('../../server/lib/live');
var appEvents = require('../../server/lib/app-events');

module.exports = function(Nail) {

    Nail.disableRemoteMethod('__destroyById__hammers', false);
    Nail.disableRemoteMethod('__delete__hammers', false);
    Nail.disableRemoteMethod('__updateById__hammers', false);
    Nail.disableRemoteMethod('__findById__hammers', false);

    Nail.getRandomIntro = getRandomIntro;
    Nail.getRecentNails = getRecentNails;

    Nail.validatesPresenceOf('text');
    //Nail.validatesUniquenessOf('text');
    Nail.validatesLengthOf('text', {
        min: 3,
        max: 212,
        message: {
            min: 'Not even funny',
            max: 'Too funny'
        }});

    Nail.on('attached', function() {
        var createFn = Nail.create;
        /**
         * Overwrite default create to be able to restrict unwanted data
         */
        Nail.create = Nail.__onCreateFilterData(createFn);
    });


    Nail.prototype.getLink = function () {
        return `https://app.loliful.io/nail/${this.id}`;
    };
    Nail.prototype.getText = function () {
        return this.text.replace(/</, '&lt;');
    };


    /**
     * Recalc `rating`:
     *    this.countVotes + SUM(hammers.countVotes)
     */
    Nail.prototype.updateRating = function() {
        Nail.__updateNailRating(this);
    };
    Nail.updateRating = function(nailId) {
        Nail.findById(nailId, function(err, obj) {
            if (!err) {
                Nail.__updateNailRating(obj);
            }
        });
    };

    /**
     * Update answers count
     */
    Nail.afterRemote('*.__create__hammers', function(ctx, hammer, next) {

        const models = Nail.app.models;

        process.nextTick(() => {

            // Increase hammers limits counter
            models.userLimits.addHammer(hammer);

            // Update parent vote entity countAnswers
            models.hammer.count({
                nailId: hammer.nailId
            }, function(err, cnt) {
                if (err) {
                    debug('Cannot calculate hammers count for nail ', hammer.id, err);
                    return next();
                }
                Nail.updateAll({
                    id: hammer.nailId
                }, {
                    countAnswers: cnt
                }, function(err) {
                    if (err) {
                        debug('Cannot update nail.countVotes', err);
                    }
                });
            });

            Nail.findById(hammer.nailId, (err, obj) => {
                if (err) {
                    return debug('Create hammer: ', err);
                }

                // Send notification to the nail author
                if (hammer.userId !== obj.userId) {
                    models.notification.addReply(
                        obj,
                        hammer
                    );
                }

                // Add notifications for all other users that replied same question
                obj.hammers({
                    where: {
                        userId: {
                            nin: [hammer.userId, obj.userId] // don't include author and current replier
                        }
                    }
                }, (err, hammers) => {
                    if (err) {
                        return debug('Cannot fetch obj hammers', err);
                    }

                    let userIds = _.uniq(_.map(hammers, 'userId'));
                    debug(`Adding REPLY_SAME notification for nail#${obj.id} users:[${userIds.join(',')}]`);
                    userIds.forEach(otherUserId => {
                        models.notification.addReplySame(
                            obj,
                            hammer,
                            otherUserId
                        );
                    });
                });
            });
        });

        next();
    });

    /**
     * Update limits count
     */
    Nail.afterRemote('create', function(ctx, nail, next) {
        process.nextTick(() => {
            Nail.app.models.userLimits.addNail(nail);
            if (Nail.app && Nail.app.io) {
                live.publish(Nail.app.io, 'fresh', nail);
            }

            appEvents.emit(appEvents.EVENTS.NEW_INTRO, {
                'id': nail.id,
                'text': nail.text,
                'userId': nail.userId
            });

            Nail.app.models.user.updateCounts(nail.userId, 'nail', 1);
        });
        next();
    });
    Nail.afterRemote('deleteById', function(ctx, nail, next) {
        var nailId = ctx.args && ctx.args.id || false;

        next();

        if (nailId) {
            var filter = {nailId: nailId};
            process.nextTick(() => {
                // Remove all dependant entries
                ['hammer', 'favorite', 'votes', 'notification'].forEach(entity => {
                    Nail.app.models[entity].destroyAll(filter, _.partial(debug, 'Remove hammerId:' + nailId));
                });
            });

            appEvents.emit(appEvents.EVENTS.INTRO_REMOVED, {
                'nailId': nailId
            });
        }
    });


    /**
     * Remove is possible within some timespan
     */
    Nail.beforeRemote('deleteById', function(ctx, inst, next) {
        var nailId = ctx.args && ctx.args.id || false;
        if (nailId) {
            Nail.findById(nailId, (err, nail) => {
                if (err || !nail) {
                    return next(apiErrors.notFound());
                }
                if (Nail.__canBeDeleted(nail, config.removeTimeSpan)) {
                    Nail.app.models.user.updateCounts(nail.userId, 'nail', -1);
                    return next();
                }
                next(apiErrors.validation('It is too late to remove!'));
            });
        } else {
            next();
        }
    });

    /**
     * Check if entity can be removed
     *
     * @param {Nail} nail
     * @param span
     * @returns {boolean}
     * @private
     */
    Nail.__canBeDeleted = function(nail, span) {
        return nail.countAnswers === 0 || !nail.countAnswers;
    };

    Nail.__beforeRemoteUpdateAttributes = function(ctx, data, next) {
        var allowedForUpdateFields = ['text'];
        ctx.args.data = _.pick(ctx.args.data, allowedForUpdateFields);
        next();

        appEvents.emit(appEvents.EVENTS.INTRO_CHANGED, {
            'id': ctx.instance.id,
            'text': ctx.instance.text
        });
    };
    Nail.beforeRemote('prototype.updateAttributes', Nail.__beforeRemoteUpdateAttributes);

    /**
     * Add limits validator
     */
    Nail.beforeRemote('create', function(ctx, inst, next) {
        Nail.__validateLimitsRate('nail', next);
    });
    Nail.beforeRemote('*.__create__hammers', function(ctx, inst, next) {
        Nail.__validateLimitsRate('hammer', next);
    });
    Nail.afterRemote('*.__create__hammers', function(ctx, inst, next) {
        if (inst && inst.userId) {
            Nail.app.models.user.updateCounts(inst.userId, 'hammer', +1);
            next();
        }
    });


    /*   PRIVATE METHODS    */

    Nail.__validateLimitsRate = function(entityName, cb) {

        Nail.app.models.userLimits.checkLimits(entityName, getCurrentUserId(), function(err) {
            if (err) {
                return cb(apiErrors.validation(
                    `Limit exceeded: max per hour: ${err.limitHour}, max per day: ${err.limitDay}`
                ));
            }

            cb();
        });
    };


    /**
     * Return wrapped function that will filter data
     *
     * @return {Function}
     * @param originalCreateFn
     */
    Nail.__onCreateFilterData = function(originalCreateFn) {
        return function(data, options, cb) {
            data = {
                text: data.text,
                userId: getCurrentUserId() || data.userId,
                created: data.created || new Date()
            };
            return originalCreateFn.apply(this, [data, options, cb]);
        };
    };

    /**
     * Recalc rating
     */
    Nail.__updateNailRating = function(nailObj) {
        var rating = parseInt(nailObj.countVotes);

        Nail.app.models.hammer.find({
            where: {
                nailId: nailObj.id
            },
            order: 'countVotes DESC',
            limit: 100 // count only first 100
        }, function(err, items) {
            items.forEach(function(hammer) {
                rating += parseInt(hammer.countVotes);
            });

            nailObj.rating = rating;
            nailObj.updateAttribute('rating', nailObj.rating);
            debug('Recalculated nail %s rating: %s', nailObj.id, nailObj.rating);
        });
    };


    const QUERY_RANDOM_INTRO = 'SELECT id FROM nail WHERE nsfw=0 ORDER BY RAND() ASC LIMIT 1';

    function getRandomIntro() {
        return new Promise((resolve, reject) => {
            Nail.runSql(QUERY_RANDOM_INTRO)
                .then(result => {
                    if (!result.length && !result[0].id) {
                        return reject(null);
                    }

                    Nail.findById(result[0].id, (err, nail) => {
                        if (err) {
                            debug(err);
                            return reject(err);
                        }

                        Nail.attachUserNames([nail])
                            .then(items => {
                                resolve(items[0]);
                            })
                            .catch(err => {
                                reject(err);
                            });
                    });
                })
                .catch(err => {
                    debug(err);
                    return reject(err);
                });
        });
    }

     function getRecentNails(excludeUser = null, periodInDays = 7, minVotes = 0, limit = 10) {
         let where = {
            created: {
              gte: moment().subtract(periodInDays, 'day').hours(0).minutes(0).seconds(0).toDate()
            },
            countVotes: {
                gte: minVotes
            }
         };

         if (excludeUser) {
             where.userId = {
                 neq: excludeUser.id
             };
         }

        return new Promise((resolve, reject) => {
            Nail.find({
                order: 'id DESC',
                limit: limit,
                where: where
            }, (err, nails) => {
                if (err) {
                    return reject(err);
                }
                resolve(nails);
            });
        });
    }
};

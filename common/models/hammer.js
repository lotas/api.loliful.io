'use strict';

var loopback = require('loopback');
var debug = require('debug')('kontra:model:hammer');
var _ = require('lodash');
var moment = require('moment');
var getCurrentUserId = require('../../server/lib/get-current-user-id');
var config = require('../../server/config');
var apiErrors = require('../../server/lib/api-errors');
var appEvents = require('../../server/lib/app-events');


module.exports = function(Hammer) {
    // go through nail instead
    Hammer.disableRemoteMethod('create', true);

    Hammer.validatesPresenceOf('text');
    Hammer.validatesLengthOf('text', {
        min: 1,
        max: 212,
        message: {
            min: 'Too short to be funny',
            max: 'Nobody is going to read such a long answer'
        }
    });

    Hammer.prototype.getLink = function () {
        return `https://app.loliful.io/nail/${this.nailId}`;
    };
    Hammer.prototype.getText = function () {
        return this.text.replace(/</, '&lt;');
    };
    Hammer.prototype.getCardLink = function () {
        return `https://api.loliful.io/share/${this.nailId}/${this.id}`;
    }


    Hammer.__beforeRemoteUpdateAttributes = function(ctx, data, next) {
        var allowedForUpdateFields = ['text'];
        ctx.args.data = _.pick(ctx.args.data, allowedForUpdateFields);
        next();

        appEvents.emit(appEvents.EVENTS.OUTRO_CHANGED, {
            'id': ctx.instance.id,
            'text': ctx.instance.text
        });
    };
    Hammer.beforeRemote('prototype.updateAttributes', Hammer.__beforeRemoteUpdateAttributes);


    Hammer.afterRemote('deleteById', function(ctx, nail, next) {
        var hammerId = ctx.args && ctx.args.id || false;

        next();

        if (hammerId) {
            var filter = {hammerId: hammerId};
            process.nextTick(() => {
                // Remove all dependant entries
                ['favorite', 'votes', 'notification'].forEach(entity => {
                    Hammer.app.models[entity].destroyAll(filter, _.partial(debug, 'Remove hammerId:' + hammerId));
                });
            });

            appEvents.emit(appEvents.EVENTS.OUTRO_REMOVED, {
                'hammerId': hammerId
            });
        }
    });


    /**
     * Remove is possible within some timespan
     */
    Hammer.beforeRemote('deleteById', function(ctx, inst, next) {
        var hammerId = ctx.args && ctx.args.id || false;
        if (hammerId) {
            Hammer.findById(hammerId, (err, hammer) => {
                if (err || !hammer) {
                    return next(apiErrors.notFound());
                }
                if (Hammer.__canBeDeleted(hammer, config.removeTimeSpan)) {
                    Hammer.app.models.user.updateCounts(hammer.userId, 'hammer', -1);
                    return next();
                }
                next(apiErrors.validation('It is too late to remove!'));
            });
        } else {
            next();
        }
    });
    /**
     * Check if entity can be removed within the given time span after creation
     *
     * @param created
     * @param span
     * @returns {boolean}
     * @private
     */
    Hammer.__canBeDeleted = function(hammer, span) {
        return hammer.countVotes === 0;
    };

    Hammer.on('attached', function() {
        var createFn = Hammer.create;
        var voteFn = Hammer.prototype.vote;

        // Overwrite default create to be able to restrict unwanted data
        Hammer.create = Hammer.__onCreateFilterData(createFn);

        // recalculate hammer rating after vote on
        Hammer.prototype.vote = Hammer.__onVoteUpdateRating(voteFn);
    });

    /*    PRIVATE METHODS   */
    Hammer.__onCreateFilterData = function(originalCreateFn) {
        return function(data, arg2, arg3) {
            let filtered = {
                text: data.text,
                nailId: data.nailId,
                userId: getCurrentUserId()
            };

            appEvents.emit(appEvents.EVENTS.NEW_OUTRO, filtered);

            return originalCreateFn.apply(this, [filtered, arg2, arg3]);
        };
    };

    Hammer.__onVoteUpdateRating = function(originalVoteFn) {
        return function(hammer, cb) {
            var res = originalVoteFn.apply(this, arguments);

            var nailId = (hammer && hammer.nailId) ? hammer.nailId :
                this.nailId;

            process.nextTick(function() {
                Hammer.app.models.nail.updateRating(nailId);
            });

            return res;
        };
    };


    const QUERY_RANDOM_OUTRO = 'SELECT id FROM hammer WHERE nsfw=0 ORDER BY RAND() ASC LIMIT 1';

    Hammer.getRandomOutro = getRandomOutro;

    function getRandomOutro() {
        return new Promise((resolve, reject) => {
            Hammer.runSql(QUERY_RANDOM_OUTRO)
                .then(result => {
                    if (!result.length && !result[0].id) {
                        return reject(null);
                    }

                    Hammer.findById(result[0].id, (err, hammer) => {
                        if (err) {
                            debug(err);
                            return reject(err);
                        }

                        Hammer.attachUserNames([hammer])
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

    Hammer.getRecentJokes = getRecentJokes;
    function getRecentJokes(excludeUser = null, periodInDays = 7, minVotes = 1, limit = 10) {
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
            Hammer.find({
                order: 'countVotes DESC',
                limit: limit,
                where: where
            }, (err, hammers) => {
                if (err) {
                    return reject(err);
                }

                Hammer.attachNails(hammers)
                     .then(items => resolve(items));
            });
        });
    }
};

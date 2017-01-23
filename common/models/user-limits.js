var config = require('../../server/config');
var limits = config.limits;
var debug = require('debug')('kontra:model:user-limits');

var redis = config.env === 'testing' ? require('redis-mock') : require('redis');
var client = redis.createClient();


/**
 * Using as normal loopback entity but replacing all methods for custom
 * loopback-redis-cli is still buggy and is an overhead for redis
 *
 * @param UserLimits
 */
module.exports = function (UserLimits) {
    const EXPIRE = 24 * 60 * 60;

    UserLimits.addNail = addEntity('nail');
    UserLimits.addHammer = addEntity('hammer');

    UserLimits.checkLimits = checkLimits;

    /**
     * Create adder function
     *
     * @param {String} entity
     * @return {Function}
     */
    function addEntity(entityName) {
        return function (entity) {
            var key = `${entityName}:${entity.userId}`;

            if (config.env === 'testing') {
                client.rpush(key, Date.now());
            } else {
                client.multi()
                    .rpush(key, Date.now())
                    .expire(key, EXPIRE)
                    .exec(function (err) {
                        if (err) {
                            debug('UserLimits:addEntity error', key, err);
                        }
                    });
            }

        };
    }

    /**
     * Check if limits for a given entity were not exceeded
     *
     * Algorithm:
     *  1) check count of created for day
     *  2) if less, check for last hour
     *  3) fetch only limit last count of items and check timestamp
     *
     * @param {String} entityName
     * @param {String} userId
     * @param {Function} cb   {err, boolean}
     */
    function checkLimits(entityName, userId, cb) {
        var key = `${entityName}:${userId}`;

        client.llen(key, function(err, cntDay) {
            if (err) return cb(err);

            // check overall for day
            if (cntDay > limits.day[entityName]) {
                return errorCb();
            }

            // find all for last hour
            client.lindex(key, cntDay - limits.hour[entityName], function(err, timestamp) {
                // if [-limits.hour.entity] value is within the last hour - it's a no no
                if (timestamp && timestamp <= Date.now() - 60*60) {
                    return errorCb();
                }
            });

            cb(null, true);

            function errorCb() {
                return cb({
                    limitDay: limits.day[entityName],
                    limitHour: limits.hour[entityName],
                    cnt: cntDay
                });
            }
        });
    }

};

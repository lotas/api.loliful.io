'use strict';

var loopback = require('loopback');
var moment = require('moment');
var debug = require('debug')('kontra:controller:main');
var ensureLoggedIn = require('../lib/ensure-logged-in');
var getCurrentUserId = require('../lib/get-current-user-id');
var apiUrl = require('../config').apiUrl;

const ACTIVITY_LIMIT = 50;

function responseHandler(res, promises) {
    Promise.all(promises)
        .then(function (result) {
            result[1].pager = result[0];
            res.json(result[1]);
        })
        .catch(function (err) {
            debug(err);
            res.sendStatus(503);
        });
}

module.exports = function (app) {
    var models = app.models;
    var router = app.loopback.Router();
    var modelUtils = require('../lib/model-helpers');

    app.use('/', router);

    router.get('/fresh', ensureLoggedIn, function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let limit = modelUtils.parseLimit(req.query.limit);
        let where = {};
        let order = req.query.type === 'popular' ?
                ['updated DESC', 'countAnswers DESC'] :
                ['created DESC'];

        if (req.query.type === 'unanswered') {
            where = `id NOT IN (SELECT DISTINCT nailId
                FROM hammer WHERE userId=${req.user.id})`;
        }

        var nailsPromise = new Promise((resolve, reject) => {
            models.nail.find({
                order: order,
                where: where,
                skip: limit * (page - 1),
                limit: limit
            }, (err, nails) => {
                if (err) {
                    return reject(err);
                }

                models.nail.attachMeta(nails, 'nailId')
                    .then(models.nail.attachUserNames)
                    .then(items => {
                        resolve({
                            nails: items
                        });
                    });
            });
        });

        responseHandler(res, [
            getPaginator('nail', where, page, limit, req.path),
            nailsPromise
        ]);
    });



    router.get('/top', /* ensureLoggedIn, */ function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let limit = modelUtils.parseLimit(req.query.limit);
        let order = req.query.order === 'date' ? 'created' : 'countVotes';

        let where = {
            countVotes: {
                gt: order === 'created' ? -1 : 0
            }
        };

        switch (req.query.period) {
        case 'day':
            where['created'] = {
                gte: moment().subtract(1, 'day').hours(0).minutes(0).seconds(0).toDate()
            };
            break;
        case 'week':
            where['created'] = {
                gte: moment().subtract(1, 'week').hours(0).minutes(0).seconds(0).toDate()
            };
            break;
        case 'month':
            where['created'] = {
                gte: moment().subtract(1, 'month').hours(0).minutes(0).seconds(0).toDate()
            };
            break;
        }

        var jokesPromise = new Promise((resolve, reject) => {
            models.hammer.find({
                order: `${order} DESC`,
                where: where,
                skip: limit * (page - 1),
                limit: limit
            }, (err, hammers) => {
                if (err) {
                    return reject(err);
                }

                models.hammer.attachMeta(hammers, 'hammerId')
                    .then(models.hammer.attachNails)
                    .then(models.hammer.attachUserNames)
                    .then(items => {
                        resolve({
                            jokes: items
                        });
                    });
            });
        });

        responseHandler(res, [
            getPaginator('hammer', where, page, limit, req.path),
            jokesPromise
        ]);
    });

    router.get('/activity/hammers', ensureLoggedIn, function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let condition = {
            userId: req.query.userId || getCurrentUserId()
        };

        var hammersPromise = new Promise((resolve, reject) => {
            models.hammer.find({
                where: condition,
                order: 'created DESC',
                skip: ACTIVITY_LIMIT * (page - 1),
                limit: ACTIVITY_LIMIT
            }, (err, items) => {
                if (err) {
                    return reject(err);
                }

                models.hammer.attachMeta(items, 'hammerId')
                    .then(models.hammer.attachNails)
                    .then(models.hammer.attachUserNames)
                    .then(items => {
                        resolve({
                            hammers: items
                        });
                    });
            });
        });
        responseHandler(res, [
            getPaginator('hammer', condition, page, ACTIVITY_LIMIT, req.path),
            hammersPromise
        ]);
    });

    router.get('/activity/nails', ensureLoggedIn, function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let condition = {
            userId: req.query.userId || getCurrentUserId()
        };

        var nailsPromise = new Promise((resolve, reject) => {
            models.nail.find({
                where: condition,
                order: 'created DESC',
                skip: ACTIVITY_LIMIT * (page - 1),
                limit: ACTIVITY_LIMIT
            }, (err, items) => {
                if (err) {
                    return reject(err);
                }

                models.nail.attachMeta(items, 'nailId')
                    .then(models.nail.attachUserNames)
                    .then(items => {
                        resolve({
                            nails: items
                        });
                    });
            });
        });
        responseHandler(res, [
            getPaginator('nail', condition, page, ACTIVITY_LIMIT, req.path),
            nailsPromise
        ]);
    });

    router.get('/activity/likes', ensureLoggedIn, function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let condition = {
            userId: getCurrentUserId()
        };

        var votesPromise = new Promise((resolve, reject) => {
            models.votes.find({
                where: condition,
                order: 'created DESC',
                skip: ACTIVITY_LIMIT * (page - 1),
                limit: ACTIVITY_LIMIT
            }, (err, items) => {
                if (err) {
                    return reject(err);
                }

                models.hammer.attachHammers(items)
                    .then(models.hammer.attachNails)
                    .then(models.hammer.attachUserNames)
                    .then(items => {

                        // We know it was liked anyway, adding quick hack here
                        items.forEach(item => {
                            if (item.$nail) {
                                item.$nail.$votes = true;
                            } else if (item.$hammer) {
                                item.$hammer.$votes = true;
                            }
                        });

                        resolve({
                            likes: items
                        });
                    });
            });
        });

        responseHandler(res, [
            getPaginator('votes', condition, page, ACTIVITY_LIMIT, req.path),
            votesPromise
        ]);
    });

    router.get('/activity/saves', ensureLoggedIn, function (req, res) {
        let page = modelUtils.parsePage(req.query.page);
        let condition = {
            userId: getCurrentUserId()
        };

        var favsPromise = new Promise((resolve, reject) => {
            models.favorite.find({
                where: condition,
                order: 'created DESC',
                skip: ACTIVITY_LIMIT * (page - 1),
                limit: ACTIVITY_LIMIT
            }, (err, items) => {
                if (err) {
                    return reject(err);
                }

                models.hammer.attachNails(items)
                    .then(models.hammer.attachHammers)
                    .then(models.hammer.attachUserNames)
                    .then(items => {

                        // We know it was saved anyway, adding quick hack here
                        items.forEach(item => {
                            if (item.$nail) {
                                item.$nail.$favorite = true;
                            } else if (item.$hammer) {
                                item.$hammer.$favorite = true;
                            }
                        });

                        resolve({
                            saves: items
                        });
                    });
            });
        });
        responseHandler(res, [
            getPaginator('favorite', condition, page, ACTIVITY_LIMIT, req.path),
            favsPromise
        ]);
    });

    router.get('/nail/:nailId', ensureLoggedIn, function (req, res) {
        models.nail.findById(req.params.nailId, (err, nail) => {
            if (err || !nail) {
                debug(err);
                return res.sendStatus(404);
            }

            models.hammer.find({
                where: {
                    nailId: nail.id
                },
                order: 'created DESC'
            }, (err, hammers) => {
                if (err) {
                    debug(err);
                } else {
                    nail.$hammers = hammers;
                }

                Promise.all([
                    models.nail.attachUserNames(hammers),
                    models.nail.attachMeta(hammers, 'hammerId'),
                    models.nail.attachMeta([nail], 'nailId')
                        .then(models.nail.attachUserNames)
                ]).then(() => {
                    res.json({
                        nail: nail
                    });
                });
            });
        });
    });


    /**
     *
     * @param  {any} entity
     * @param  {any} condition
     * @param  {any} page
     * @param  {any} limit
     * @return {Promise}
     */
    function getPaginator(entity, condition, page, limit, path) {
        return new Promise(resolve => {
            models[entity].count(condition || {}, (err, data) => {
                let totalPages = Math.ceil(data / limit);
                resolve({
                    pages: totalPages,
                    total: data,
                    page: page,
                    first: `${apiUrl}${path}?page=1&limit=${limit}`,
                    last: `${apiUrl}${path}?page=${totalPages}&limit=${limit}`,
                    next: page < totalPages ? `${apiUrl}${path}?page=${page + 1}&limit=${limit}` : '',
                    prev: page > 1 ? `${apiUrl}${path}?page=${page - 1}&limit=${limit}` : ''
                });
            });
        });
    }

};

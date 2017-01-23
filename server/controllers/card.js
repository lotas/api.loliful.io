'use strict';

var debug = require('debug')('kontra:card');

var shareService = require('../lib/share-service');

module.exports = function(app) {
    var models = app.models;
    var router = app.loopback.Router();

    app.use(router);

    router.get('/card/:shareId', function(req, res) {
        let shareId = req.params.shareId;

        models.share.findById(shareId, (err, item) => {
            if (err) {
                res.status(500);
                return res.render('error/500');
            }

            if (!item) {
                res.status(404);
                return res.render('error/404');
            }

            res.render('card/view', {
                share: req.params.shareId,
                item: item,
                gradNum: shareService.getGradientNum(item)
            });

            // update count of views
            item.openedCount++;
            item.updateAttribute('openedCount', item.openedCount);
        });
    });
};

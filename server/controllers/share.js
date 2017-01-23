'use strict';

var debug = require('debug')('kontra:share');

var shareService = require('../lib/share-service');


module.exports = function(server) {
    let models = server.models;

    shareService.setModels(models);

    var router = server.loopback.Router();
    router.get('/share/:nail', shareJoke);
    router.get('/share/:nail/:hammer', shareJoke);
    router.post('/share/:id/:network', shareClick);
    server.use(router);

    /**
     * Share only intro or joke
     *
     * @param req
     * @param res
     * @returns {*}
     */
    function shareJoke(req, res) {
        shareService.findOrGenerateShare(
            req.params.nail || null,
            req.params.hammer || null
        )
        .then(shareObject => {
            if (req.query.img === '1') {
                return res.redirect(shareObject.img);
            }

            return res.json({
                id: shareObject.id,
                url: `http://loliful.io/card/${shareObject.id}`,
                img: shareObject.img
            });
        })
        .catch(err => {
            if (err.statusCode) {
                return res.status(err.statusCode)
                    .send({error: err.message});
            }
            res.sendStatus(412);
        });
    }

    function shareClick(req, res) {
        shareService.addShareClick(
            req.params.id,
            req.user ? req.user.id : null,
            req.params.network
        );

        res.sendStatus(200);
    }
};

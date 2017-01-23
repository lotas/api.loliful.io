const co = require('co');

module.exports = function(app) {
    var models = app.models;
    var router = app.loopback.Router();
    var ensureLoggedIn = require('../lib/ensure-logged-in');

    app.use('/admin', router);

    function getViewValues(req) {
        return {
            user: req.user,
            url: req.url
        };
    }

    router.get('/', ensureLoggedIn, function(req, res, next) {
        res.render('admin/index', {
            user: req.user,
            url: req.url
        });
    });


    const MailService = require('../lib/mail-service');
    const mailService = new MailService(app.models.Email);

    var actor = {
        id: 1,
        name: 'Yarik'
    };
    var user = actor;
    var nail = new app.models.Nail({
        id: 1,
        text: 'Here comes the intro'
    });
    var hammer = new app.models.Hammer({
        id: 1,
        text: 'Here comes the outro'
    });
    var config = {
        frontendUrl: 'https://app.loliful.co'
    };

    router.get('/email/reply', function(req, res, next) {
        var email = mailService._dataSendNewReply(actor, {}, nail, hammer, user);
        res.send(mailService.generateHtml(email));
    });
    router.get('/email/replySame', function(req, res, next) {
        var email = mailService._dataSendReplySame(actor, {}, nail, hammer, user);
        res.send(mailService.generateHtml(email));
    });
    router.get('/email/likeIntro', function(req, res, next) {
        var email = mailService._dataSendNewLike(actor, {entity: 'nail'}, nail, false, user);
        res.send(mailService.generateHtml(email));
    });
    router.get('/email/likeOutro', function(req, res, next) {
        var email = mailService._dataSendNewLike(actor, {entity: 'hammer'}, nail, hammer, user);
        res.send(mailService.generateHtml(email));
    });
    router.get('/email/digest', function(req, res, next) {

        co(function* (){
            let nails = yield models.Nail.getRecentNails(null, 90, 1);
            let jokes = yield models.Hammer.getRecentJokes(null, 90);

            const email = mailService._dataSendDigest(actor, nails, jokes);
            const emailHtml = mailService.generateHtml(email);

            res.send(emailHtml);
        }).then(() => {
            // console.log('Digest finished');

        }).catch(err => {
            console.error(err);
            res.sendStatus(500)
        });

        // var email = mailService._dataSendDigest(actor, [nail,nail,nail,nail],
        //     [
        //         Object.assign(hammer, {$nail: nail}),
        //         Object.assign(hammer, {$nail: nail}),
        //         Object.assign(hammer, {$nail: nail})
        //     ]);
        // res.send(mailService.generateHtml(email));
    });
};

var debug = require('debug')('kontra:feedback');
var ensureLoggedIn = require('../lib/ensure-logged-in');

module.exports = function (server) {

    var router = server.loopback.Router();
    router.post('/feedback', ensureLoggedIn, sendFeedback);
    server.use(router);

    function sendFeedback(req, res, next) {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        res.json({sent: true});

        server.models.Email.send({
            to: 'feedback@loliful.io',
            from: 'no-reply@loliful.io',
            subject: 'New feedback!',
            text: `
User email: ${req.user ? req.user.email : '-'}
User id:  ${req.user ? req.user.id : '-'}
User name:  ${req.user ? req.user.name : '-'}
IP: ${ip}
UA: ${req.headers['user-agent']}

Text: ${req.body.feedback}
`
        }, debug);
    }
};

'use strict';

module.exports = function(server) {

    require('../controllers/auth')(server);
    require('../controllers/main')(server);
    require('../controllers/feedback')(server);
    require('../controllers/share')(server);

    require('../controllers/card')(server);

    require('../controllers/bot')(server);

    require('../controllers/admin')(server);

};

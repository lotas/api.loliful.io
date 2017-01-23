var debug = require('debug')('kontra:boot:db-migrate');

module.exports = (app) => {

    app.models.user.findOrCreate({where: {email: 'kontra@kontra.com'}},
        {username: 'kontra', email: 'kontra@kontra.com', password: 'qwerty'},
        function(err, user) {
            if (err) return debug('%j', err);

            ensureAdminRole(function(err, role) {
                if (err) return debug('%j', err);

                var principal = {
                    principalType: app.models.RoleMapping.USER,
                    principalId: user.id
                };

                role.principals.findOne({where: principal}, function(err, res) {
                    if (err) return debug('%j', err);

                    if (res === null) {
                        role.principals.create(principal, function(err, res) {
                            if (err) return debug('%j', err);

                            debug('Attached user to role', res);
                        });
                    }
                });
            });
        }
    );

    // create base roles
    function ensureAdminRole(cb) {
        app.models.Role.findOrCreate(
            {where: {name: 'admin'}},
            {name: 'admin'},
            function(err, role) {
                if (err) {
                    debug('Cannot create role admin', err);
                    return cb(err);
                }

                cb(null, role);
            }
        );
    }
    function ensureModeratorRole(cb) {
        app.models.Role.findOrCreate(
            {where: {name: 'moderator'}},
            {name: 'moderator'},
            function(err, role) {
                if (err) return debug(err);

                cb(null, role);
            }
        );
    }

    ensureAdminRole(() => {});
    ensureModeratorRole(() => {});
};

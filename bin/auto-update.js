var path = require('path');

var app = require(path.resolve(__dirname, '../server/server'));

console.log('Starting autoupdate');
app.dataSources.mainDb.autoupdate(createAdminUsers);

function createAdminUsers(err, res) {
    if (err) {
        console.log(`autoupdate error: ${err}`);
    }
    console.log('autoupdate done', res);

    app.models.user.findOrCreate({where: {email: 'kontra@kontra.com'}},
        {username: 'kontra', email: 'kontra@kontra.com', password: 'qwerty'},
        function(err, user) {
            if (err) return console.log(err);

            console.log("Created kontra@kontra");

            ensureAdminRole(function(err, role) {
                if (err) return console.log(err);

                var principal = {
                    principalType: app.models.RoleMapping.USER,
                    principalId: user.id
                };

                role.principals.findOne({where: principal}, function(err, res) {
                    if (err) return console.log(err);

                    console.log("principals", res);
                    if (res === null) {
                        role.principals.create(principal, function(err, res) {
                            if (err) return console.log(err);

                            console.log('Attached user to role', res);
                            process.exit(0);
                        });
                    } else {
                        process.exit(0);
                    }
                });
            });
        }
    );

}

// create base roles
function ensureAdminRole(cb) {
    app.models.Role.findOrCreate(
        {where: {name: 'admin'}},
        {name: 'admin'},
        function(err, role) {
            if (err) {
                console.log('Cannot create role admin', err);
                return cb(err);
            }

            console.log('Attached admin role');
            cb(null, role);
        }
    );
}
function ensureModeratorRole(cb) {
    app.models.Role.find(
        {where: {name: 'moderator'}},
        {name: 'moderator'},
        function(err, role) {
            if (err) return console.log(err);

            console.log('Created moderator role');
            cb(null, role);
        }
    );
}


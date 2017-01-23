'use strict';

var server = require('../server/server');

// server.start();
console.log('Fixing broken nails records: Without users');

server.models.nail.find({
    where: {
    },
    limit: 9999999
}, (err, res) => {
    if (err) {
        console.warn(err);
        process.exit(1);
    }

    console.log(`Total ${res.length} nails`);

    var saved = 0;
    var removed = 0;
    function countSaves() {
        saved--;
    }

    res.forEach(nail => {
        server.models.user.findById(nail.userId, (err, user) => {
            if (err || !user) {
                console.log(`nail #${nail.id} without user #${nail.userId}, removing`);
                removed++;
                saved++;
                nail.remove(countSaves);
            }
        });
    });

    setTimeout(function checkSaves() {
        if (saved > 0 ) {
            setTimeout(checkSaves, 50);
        } else {
            console.log(`Removed total: ${removed}`);
            process.exit(0);
        }
    }, 50);
});
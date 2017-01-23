var path = require('path');
var prompt = require('prompt');


console.log(`
    WARNING!
    THIS WILL DROP existing data!

    Type in [yes] to continue;
`);

prompt.start();
prompt.get(['proceed'], function (err, result) {
    if (err) { return onErr(err); }

    if (result.proceed === 'yes') {
        return runAutoMigrate();
    }
    console.log('Ok! Till next time then');
});

function onErr(err) {
    console.log(err);
    return 1;
}

function runAutoMigrate() {
    console.log('Starting automigrate');
    var app = require(path.resolve(__dirname, '../server/server'));

    app.dataSources.mainDb.automigrate((err, res) => {
        if (err) {
            console.warn(`Error: ${err}`);
        }

        console.log('Result: ', res);
        process.exit(1);
    });
}

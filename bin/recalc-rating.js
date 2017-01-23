var path = require('path');
var app = require(path.resolve(__dirname, '../server/server'));

console.log('Calculating rating');
app.dataSources.mainDb.on('connected', calculate);

var connected = false;

/**
 *
 * to sync all users:
 *
 * update user a set nailKarma = (select sum(countVotes) as cnt FROM nail b where a.id = b.userId);
 * update user a set hammerKarma = (select sum(countVotes) as cnt FROM hammer b where a.id = b.userId);
 * update user a set nailCount = (select count(*) as cnt FROM nail b where a.id = b.userId);
 * update user a set hammerCount = (select count(*) as cnt FROM hammer b where a.id = b.userId);
 *
 * @returns {boolean}
 */
function calculate() {
    if (connected === true) {
        // not sure why it is called twice
        return false;
    }
    connected = true;

    var mysqlConnector = app.datasources.mainDb.connector;

    console.time('Calc');

    runSql('TRUNCATE TABLE rating')
        .then(() => {
            return runSql(`INSERT INTO rating (userId, nailKarma, hammerKarma, nailCount, hammerCount)
                      SELECT id, IFNULL(nailKarma, 0), IFNULL(hammerKarma, 0),
                             IFNULL(nailCount, 0), IFNULL(hammerCount, 0)
                      FROM user`);
        })
        .then(() => {
            return runSql(`UPDATE rating
                      SET rating = (nailKarma + hammerKarma) * (
                                hammerKarma / IF(hammerCount > 0, hammerCount, 1)
                                +
                                nailKarma / IF(nailCount > 0, nailCount, 1)
                            )
                      `);
        })
        .then(() => {
            return runSql(`CREATE TABLE tmp_rank ENGINE=MEMORY
                           SELECT userId, 1+(SELECT COUNT(*)
                           FROM rating b WHERE a.rating < b.rating) as position FROM rating a;
                      `);
        })
        .then(() => {
            return runSql(`UPDATE rating, tmp_rank SET rating.position = tmp_rank.position
                            WHERE rating.userId=tmp_rank.userId`);
        })
        .then(() => {
            return runSql(`DROP TABLE tmp_rank`);
        })
        .then(() => {
            console.log('All done!');
            console.timeEnd('Calc');
            process.exit(0);
        })
        .catch(err => {
            console.timeEnd('Calc');
            console.error(`Commands failed: ${err}`);
            process.exit(1);
        });


    function runSql(sql, params=[]) {
        console.info(`Executing ${Date.now()}: ${sql}`);

        return new Promise((resolve, reject) => {
            mysqlConnector.query(sql, [], (err, res) =>{
                if (err) {
                    console.log('error', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    }

}

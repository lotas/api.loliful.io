var debug = require('debug')('kontra:mixin:sqlable');

module.exports = function(Model, options) {

    Model.runSql = runSql;

    var modelName = Model.sharedClass.name;

    Model.on('attached', function() {
        var originalFind = Model.find;
        var originalCount = Model.count;

        Model.find = findSql(originalFind);
        Model.count = countSql(originalCount);
    });

    function findSql(originalFn) {
        return function(query, cb) {
            if (query && query.where && typeof query.where === 'string') {
                return runSql(getSqlFromLoopbackQuery(query, modelName))
                    .then(res => {
                        cb(null, res);
                    })
                    .catch(err => {
                        cb(err);
                    });
            } else {
                return originalFn.apply(this, arguments);
            }
        };
    }

    function countSql(originalFn) {
        return function(query, cb) {
            if (query && typeof query === 'string') {
                let q = {
                    fields: ['COUNT(*) as "cnt"'],
                    where: query
                };

                runSql(getSqlFromLoopbackQuery(q, modelName))
                    .then(res => {
                        var c = (res && res[0] && res[0].cnt) || 0;
                        cb(null, c);
                    })
                    .catch(err => {
                        cb(err);
                    });
            } else {
                originalFn.apply(this, arguments);
            }
        };
    }


    /**
     * @param  {String} sql
     * @param  {Object|null} params=[]
     */
    function runSql(sql, params=[]) {
        debug(`Executing ${Date.now()}: ${sql} [${params}]`);

        return new Promise((resolve, reject) => {
            Model.dataSource.connector.query(sql, params, (err, res) => {
                if (err) {
                    debug('error', err);
                    return reject(err);
                }
                resolve(res);
            });
        });
    }

};


function getSqlFromLoopbackQuery(query, modelName) {
    var sql = `SELECT ${query.fields ? query.fields.join(',') : '*'}
        FROM ${modelName}
        WHERE ${query.where}
        ${query.order ? ('ORDER BY ' + query.order) : ''}
    `;

    if (query.limit) {
        sql += ` LIMIT ${(query.skip ? (query.skip + ',' + query.limit) : query.limit)}`;
    }

    debug(sql);

    return sql;
}

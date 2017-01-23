var apiErrors = require('../../server/lib/api-errors');

module.exports = function(Votes) {

    Votes.addVote = addVote;
    Votes.removeVote = removeVote;

    function addVote(modelName, id, userId, cb) {
        var saveData = {userId: userId};
        saveData[modelName + 'Id'] = id;

        Votes.findOrCreate({where: saveData}, saveData, function(err, vote) {
            if (err) return cb(err);

            cb(null, true);
        });
    }

    function removeVote(modelName, id, userId, cb) {
        var filter = {userId: userId};
        filter[modelName + 'Id'] = id;

        Votes.findOne({where: filter}, function(err, vote) {
            if (err) return cb(err);

            if (vote) {
                vote.delete(cb);
            } else {
                cb(null, true);
            }
        });
    }

};

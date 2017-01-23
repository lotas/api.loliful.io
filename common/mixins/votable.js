var debug = require('debug')('kontra:mixin:votable');
var appEvents = require('../../server/lib/app-events');
var apiErrors = require('../../server/lib/api-errors');

module.exports = function(Model, options) {

    Model.disableRemoteMethod('__delete__votes', false);
	Model.disableRemoteMethod('__get__votes', false);
	Model.disableRemoteMethod('__create__votes', false);
	Model.disableRemoteMethod('__findById__votes', false);
	Model.disableRemoteMethod('__destroyById__votes', false);
	Model.disableRemoteMethod('__updateById__votes', false);


	var modelName = Model.sharedClass.name;

    // dynamic version
    Model.vote = function(id, userId, cb) {
        Model.findById(id, function(err, obj) {
			if (err) return cb(err);
            voteForIt(obj, userId, cb);
        });
    };
    // static version
	Model.prototype.vote = function(userId, cb) {
        voteForIt(this, userId, cb);
	};

    // dynamic version
    Model.unvote = function(id, userId, cb) {
        Model.findById(id, function(err, obj) {
			if (err) return cb(err);
            unvoteIt(obj, userId, cb);
        });
    };
    // static version
	Model.prototype.unvote = function(userId, cb) {
        unvoteIt(this, userId, cb);
	};

	/**
	 *  Vote for a given object
	 */
	function voteForIt(obj, userId, cb) {
        if (String(obj.userId) === String(userId)) {
            debug('Voting for own item', userId, obj.id, modelName);
            return cb(null, obj.countVotes || 0);
        }
        if (!obj.countVotes) {
            obj.countVotes = 0;
        }
        // TODO : where do we update this??
        if (!obj.rating) {
            obj.rating = 0;
        }
        var Votes = Model.app.models.votes;
        Votes.addVote(modelName, obj.id, userId, function(err, res) {
            if (err) return cb(err);

			var where = {};
			where[modelName + 'Id'] = obj.id;

            Votes.count(where, function(err, cnt) {
                if (err) return cb(err);

                cb(null, cnt);

                obj.rating = cnt;
                obj.countVotes = cnt;

                obj.updateAttributes({
                    rating: obj.rating,
                    countVotes: obj.countVotes
                });
            });

            process.nextTick(() => {
                Model.app.models.notification.addLike(obj, modelName, userId);
                Model.app.models.user.increaseKarma(obj.userId, modelName);

                appEvents.emit(appEvents.EVENTS.NEW_LIKE, {
                    'id': obj.id,
                    'text': obj.text,
                    'userId': userId
                });
            });
        });
    }

	/**
	 *  Unote for a given object
	 */
	function unvoteIt(obj, userId, cb) {
        if (!obj.countVotes) {
            obj.countVotes = 0;
        }
        // TODO: Where do we update this??
        if (!obj.rating) {
            obj.rating = 0;
        }

        var Votes = Model.app.models.votes;
        Votes.removeVote(modelName, obj.id, userId, function(err, res) {
            if (err) return cb(err);

			var where = {};
			where[modelName + 'Id'] = obj.id;

            Votes.count(where, function(err, cnt) {
                if (err) return cb(err);

                cb(null, cnt);

                obj.rating = cnt;
                obj.countVotes = cnt;

                obj.updateAttributes({
                    rating: obj.rating,
                    countVotes: obj.countVotes
                });
            });

            process.nextTick(() => {
                Model.app.models.notification.addUnlike(obj, modelName, userId);
                Model.app.models.user.decreaseKarma(obj.userId, modelName);

                appEvents.emit(appEvents.EVENTS.NEW_UNLIKE, {
                    'id': obj.id,
                    'text': obj.text,
                    'userId': userId
                });
            });
        });
    }

	Model.remoteMethod('vote', {
        isStatic: false,
		description: 'Vote +1',
		accepts: [
			{arg: 'custom', type: 'String', http: function(ctx) {
                if (!ctx.req.accessToken || !ctx.req.accessToken.userId) {
                    throw new apiErrors.authRequired();
                }
				return ctx.req.accessToken.userId;
	  		}}
		],
		returns: {arg: 'countVotes', type: 'number'},
		http: {path: '/vote', verb: 'POST'}
	});

	Model.remoteMethod('unvote', {
        isStatic: false,
		description: 'Vote -1',
		accepts: [
			{arg: 'custom', type: 'String', http: function(ctx) {
                if (!ctx.req.accessToken || !ctx.req.accessToken.userId) {
                    throw new apiErrors.authRequired();
                }
                return ctx.req.accessToken.userId;
	  		}}
		],
		returns: {arg: 'countVotes', type: 'number'},
		http: {path: '/vote', verb: 'DELETE'}
	});
};

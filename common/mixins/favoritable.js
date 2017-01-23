
module.exports = function(Model, options) {

	Model.disableRemoteMethod('__delete__favorites', false);
	Model.disableRemoteMethod('__get__favorites', false);
	Model.disableRemoteMethod('__create__favorites', false);
	Model.disableRemoteMethod('__findById__favorites', false);
	Model.disableRemoteMethod('__destroyById__favorites', false);
	Model.disableRemoteMethod('__updateById__favorites', false);

	var modelName = Model.sharedClass.name;

    Model.prototype.addToFav = function(userId, cb) {
        var Favorite = Model.app.models.favorite;
        Favorite.addToFav(modelName, this.id, userId, cb);
        Model.app.models.notification.addSave(
            this,
            modelName,
            userId
        );
    };

    Model.prototype.removeFromFav = function(userId, cb) {
        var Favorite = Model.app.models.favorite;
        Favorite.removeFromFav(modelName, this.id, userId, cb);
    };

	Model.remoteMethod('addToFav', {
        isStatic: false,
		description: 'Add to favorites',
		accepts: [
			{arg: 'custom', type: 'String', http: function(ctx) {
				return ctx.req.accessToken.userId;
	  		}}
		],
		returns: {arg: 'success', type: 'boolean'},
		http: {path: '/favorite', verb: 'POST'}
	});
	Model.remoteMethod('removeFromFav', {
        isStatic: false,
		description: 'Remove from favorites',
		accepts: [
			{arg: 'custom', type: 'String', http: function(ctx) {
				return ctx.req.accessToken.userId;
	  		}}
		],
		returns: {arg: 'success', type: 'boolean'},
		http: {path: '/favorite', verb: 'DELETE'}
	});
};

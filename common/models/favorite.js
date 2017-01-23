var apiErrors = require('../../server/lib/api-errors');

module.exports = function(Favorite) {
	
	Favorite.addToFav = addFavorite;
	Favorite.removeFromFav = removeFavorite;
	
	function addFavorite(modelName, id, userId, cb) {
		var saveData = {userId: userId};
		saveData[modelName + 'Id'] = id;
		
		Favorite.findOrCreate({where: saveData}, saveData, function(err, fav) {
			if (err) return cb(err);
			
			cb(null, true);
		});
    }

	function removeFavorite(modelName, id, userId, cb) {
		var saveData = {userId: userId};
		saveData[modelName + 'Id'] = id;

		Favorite.findOne({where: saveData}, function(err, fav) {
			if (err) return cb(err);
			
			if (fav) {
				fav.delete();
			}
			cb(null, true);
		});
    }
};

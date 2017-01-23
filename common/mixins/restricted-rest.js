module.exports = function(Model, options) {

	Model.disableRemoteMethod('updateAll', true);
    Model.disableRemoteMethod('upsert', true);
    Model.disableRemoteMethod('createChangeStream', true);
    Model.disableRemoteMethod('__destroyById__accessTokens', false); // DELETE
    Model.disableRemoteMethod('__updateById__accessTokens', false); // PUT

    if (!options || !options.updateAttributes) {
        Model.disableRemoteMethod('updateAttributes', false);
    }
};

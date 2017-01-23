'use strict';

var debug = require('debug')('kontra:live');

function publish(socket, event, data) {
    if (socket && socket.emit) {
        debug(`Publish ${event}`, data);
        socket.emit(event, data);
    }
}

function publishPrivate(socket, userId, name, data) {
    if (socket && socket.sockets) {
        debug(`Publish to private user:${userId} [${name}]`, data);
        socket.sockets.in(`user:${userId}`).emit(`p:${name}`, data);
    }
}

module.exports.publish = publish;
module.exports.publishPrivate = publishPrivate;

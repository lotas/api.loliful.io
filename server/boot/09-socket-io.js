var debug = require('debug')('kontra:io');
var appConfig = require('../config.js');

if (appConfig.flags.socketIO) {
    module.exports = attachSocketIo;
}

function attachSocketIo(server) {
    server.on('started', () => {
        server.io.on('connection', (socket) => {
            debug('>> new connection', socket.id, socket.auth);

            socket.on('msg', (msg) => {
                debug('msg: ', msg);
                server.io.emit('msg', `Pong: ${msg}`);
            });

            socket.on('disconnect', () => {
                debug('disconnected');
            });
        });

        // var privateNsp = server.io.of('/private');
        // privateNsp.on('connection', (socket) => {
        //     debug('>> new private connection', socket.id);


        // });
    });
}

'use strict';

const THISBROADCASTER = 'power-broadcaster-port'

const os = require('os')
const path = require('path')
const fs = require('fs')

var PORT = 6900;

var portFile = path.join(os.tmpdir(), THISBROADCASTER )
console.log(portFile)
try {
    PORT = fs.readFileSync(portFile, 'utf8')
    console.log(`Must listen to port ${PORT}`)
} catch(e) {
    console.log(e)
};


var MULTICAST_ADDR = '239.255.255.250';
var HOST_IP_ADDRESS = '127.0.0.1';
var dgram = require('dgram');
// var client = dgram.createSocket('udp4');
var client = dgram.createSocket({type: 'udp4', reuseAddr: true});


client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
});

client.on('message', function (message, rinfo) {
    console.log('Message from: ' + rinfo.address + ':' + rinfo.port + ' - ' + message);
});

client.bind(PORT, function () {
    // client.addMembership(MULTICAST_ADDR);
    client.addMembership(MULTICAST_ADDR,  HOST_IP_ADDRESS);
});



// For the code to work reliably, change the code so you specify the host's IP address for the interface you wish to use, as follows:

// Server - server.bind(SRC_PORT, HOST_IP_ADDRESS, function() ...

// Client - client.addMembership(MULTICAST_ADDR, HOST_IP_ADDRESS);
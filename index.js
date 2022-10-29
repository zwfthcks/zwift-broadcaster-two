'use strict'

const THISBROADCASTER = 'power-broadcaster-port'

const pickPort = require('pick-port');

const os = require('os')
const path = require('path')
const fs = require('fs')

const EventEmitter = require('events');
const monitor = new EventEmitter()


const ansiEscapes = require('ansi-escapes');
const boxen = require('boxen');

console.log( ansiEscapes.clearTerminal + ansiEscapes.cursorTo(0,0))
console.log(boxen(' Reading Zwift data from memory... ') + ansiEscapes.cursorDown(1))

const ora = require('ora')
// const ora = (...args) => import('ora').then(({ default: ora }) => ora(...args));
const spinner = ora({
          text: '',
          indent: 0
        })

// fork of child process
const { fork } = require('node:child_process');
const { stringify } = require('querystring');
const controller = new AbortController();
const { signal } = controller;
const child = fork(path.resolve(__dirname, 'zmm-child.js'), ['playerstate'], { signal });

child.on('error', (err) => {
    // This will be called with err being an AbortError if the controller aborts
});

child.on('message', (msg) => {
    // console.log('Got message:', msg)
    // hasMonitor = true; // we actually have an active monitor
    if (msg?.type == 'info') {
        // console.log(...msg.payload)
        spinner.text = 'info: ' + JSON.stringify(...msg.payload)
        spinner.info()
        spinner.text = ''
        spinner.start()
    }
    if (msg?.type == 'status') {
        // console.log(msg.payload)
        spinner.text = msg.payload
    }
    if (msg?.type == 'playerstate') {
        monitor.emit('playerstate', { ...msg.payload })
    }
})

// controller.abort(); // Stops the child process

var packageId = 0;

var host = '127.0.0.1'
var MULTICAST_ADDR = '239.255.255.250';

pickPort({ minPort: 6900, maxPort: 6999, ip: host, type: 'udp'}).then((port) => {
    
    // var PORT = port;
    // var HOST_IP_ADDRESS = host;
    
    var dgram = require('dgram');
    var server = dgram.createSocket("udp4");
    
    server.bind(port, host, function () {
        // server.bind(host, function () {
        // server.bind(SRC_PORT, HOST_IP_ADDRESS, function () {
        var portFile = path.join(os.tmpdir(), THISBROADCASTER )
        
        console.log(ansiEscapes.cursorDown(1) + 'Publishing port in: ' + portFile + ansiEscapes.cursorDown(2))
        
        fs.writeFileSync(portFile, `${port}`)

		spinner.start()
        
        monitor.on('playerstate', (playerState) => {
            multicast(JSON.stringify({ ...playerState, packetInfo: { source: 'zmm', seqNo: ++packageId } }))
            
            // {
            //     player: 46976,
            //     distance: 30137 + packageId,
            //     speed: 20874566,
            //     cadence: cadence,
            //     heartrate: 145 + Math.trunc(time) % 5,
            //     power: power,
            //     climbing: 245 + Math.trunc(time) % 10,
            //     time: 1 + Math.trunc(time),
            //     work: 100000 + (2 * packageId),
            //     x: x,
            //     altitude: altitude,
            //     y: y,
            //     watching: 46976,
            //     metadata: {
            //         source: 'zmm',
            //         seqNo: packageId
            //     }
            // }
            
        })
        
    });
    
    
    function multicast(text) {
        // var message = new Buffer(`Multicast message! From ${server.address().address}:${server.address().port} to ${PORT}: ${text}`);
        var message = new Buffer.from(text);
        // server.send(message, 0, message.length, PORT, MULTICAST_ADDR, function () {
        server.send(message, 0, message.length, port, MULTICAST_ADDR, function () {
            spinner.text = `Sent ${message}`;
            // console.log(`Sent ${message}`);
        });
    }
    
    
});


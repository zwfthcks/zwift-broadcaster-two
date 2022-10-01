'use strict'

const THISBROADCASTER = 'power-broadcaster-port'

const findUdpPort = require('find-free-udp-port');

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
const controller = new AbortController();
const { signal } = controller;
const child = fork(path.resolve(__dirname, 'zmm-child.js'), ['playerstate'], { signal });

child.on('error', (err) => {
    // This will be called with err being an AbortError if the controller aborts
});

child.on('message', (msg) => {
    // console.log('Got message:', msg)
    // hasMonitor = true; // we actually have an active monitor
    // if (msg?.type == 'info') {
    //     console.log(...msg.payload)
    // }
    // if (msg?.type == 'status') {
    //     console.log(msg.payload)
    // }
    if (msg?.type == 'playerstate') {
        monitor.emit('playerstate', { ...msg.payload })
    }
})

// controller.abort(); // Stops the child process



findUdpPort({ start: 6900, end: 6999, host: '127.0.0.1', type: 'udp4'}).then(({type, port, host}) => {
    
    // var PORT = port;
    // var HOST_IP_ADDRESS = host;
    var MULTICAST_ADDR = '239.255.255.250';
    
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
            multicast(JSON.stringify({ ...playerState, source: 'zwift-memory-monitor' }))
            
            // {"id":46976,"worldTime":"162155205099","distance":30137,"roadTime":22838,"laps":1,"speed":20874566,"roadPosition":9704442,"cadenceUHz":964878,"heartrate":154,"power":29,"heading":"1519842","lean":1003085,"climbing":245,"time":3609,"f19":486998039,"f20":33561103,"progress":65280,"customisationId":"162150800509","justWatching":0,"calories":183823,"x":390697.34375,"altitude":9905.400390625,"y":103653.7578125,"watchingRiderId":46976,"groupId":0,"sport":"0","f34":3389112.75}
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


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
const spinner = ora({
          text: '',
          indent: 0
        })

// fork of child process
const { fork } = require('node:child_process');
const { stringify } = require('querystring');
const controller = new AbortController();
const { signal } = controller;
const child = fork(path.resolve(__dirname, 'zmm-child.js'), ['--type=playerstate'].concat(process.argv), { signal });

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
        if (!argv.nobroadcast) {
            monitor.emit('playerstate', { ...msg.payload })
        } else {
            spinner.text = JSON.stringify(msg.payload)
        }
    }
})

// controller.abort(); // Stops the child process


var argv = require('minimist')(process.argv.slice(2));

var packageId = 0;

var host = '127.0.0.1'
var MULTICAST_ADDR = '239.255.255.250';

if (!argv.nobroadcast) {

    pickPort({ minPort: 6900, maxPort: 6999, ip: host, type: 'udp' }).then((port) => {
    
        var dgram = require('dgram');
        var server = dgram.createSocket("udp4");
    
        server.bind(port, host, function () {
            var portFile = path.join(os.tmpdir(), THISBROADCASTER)
        
            console.log(ansiEscapes.cursorDown(1) + 'Publishing port in: ' + portFile + ansiEscapes.cursorDown(2))
        
            fs.writeFileSync(portFile, `${port}`)

            spinner.start()
        
            monitor.on('playerstate', (playerState) => {
                multicast(JSON.stringify({ ...playerState, packetInfo: { source: 'zmm', seqNo: ++packageId } }))
            })
        
        });
    
    
        function multicast(text) {
            var message = new Buffer.from(text);
            server.send(message, 0, message.length, port, MULTICAST_ADDR, function () {
                spinner.text = `Sent ${message}`;
                // console.log(`Sent ${message}`);
            });
        }
       
    });

}

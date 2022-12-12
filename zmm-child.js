const process = require('node:process')
const ZwiftMemoryMonitor = require('@zwfthcks/zwift-memory-monitor');

if (process.platform == 'win32') {

    var argv = require('minimist')(process.argv.slice(2));

    // Expected/allowed switches:
    // --type=<type>
    // --verbose

    let type = argv.type
    let log = (argv.verbose ? console.log : () => { })
    
    const zmm = new ZwiftMemoryMonitor(
        {
            retry: true,
            keepalive: true,
            log: log,
            type: type
        }
    )
    
    // console.log('last error:', zmm.lasterror)
    // process.send({ type: 'lasterror', payload: 'last error: ' + zmm.lasterror })
    
    zmm.on('data', (data) => {
        // console.log(data)
        send({ type: type, payload: data })
    })
    
    zmm.on('status.error', (...args) => {
        log('status.started')
        send({ type: 'status', payload: 'status.error  - ' + args.toString()  })
    })
    
    zmm.on('status.started', (...args) => {
        log('status.started')
        send({ type: 'status', payload: 'status.started  - ' + args.toString()  })
    })
    
    zmm.on('status.stopped', (...args) => {
        log('status.stopped')
        send({ type: 'status', payload: 'status.stopped  - ' + args.toString() })
    })
    
    zmm.on('status.stopping', (...args) => {
        log('status.stopping')
        send({ type: 'status', payload: 'status.stopping  - ' + args.toString()  })
    })
    
    zmm.on('status.retrying', (...args) => {
        log('status.retrying', args)
        send({ type: 'status', payload: 'status.retrying  - ' + args.toString() })
    })
    
    zmm.on('info', (...args) => {
        send({ type: 'info', payload: args })
    })

    zmm.on('status.loaded', () => {
        log('status.loaded')
        try {
            zmm.start()
            
            // console.log('last error:', zmm.lasterror)
            send({ type: 'lasterror', payload: 'last error: ' + zmm.lasterror })
            
        } catch (e) {
            // console.log('error in zmm.start(): ', zmm.lasterror)
            log('error in zmm.start(): ', zmm.lasterror)
            send({ type: 'lasterror', payload: 'last error: ' + zmm.lasterror })
        }
    })
    
    
    zmm.loadURL(`https://zwfthcks.github.io/data/lookup-${type}.json`)
    

}    


function send(message) {
    try {
        if (process.connected) {
            process.send(message)
        }
    } catch(error) {}
}
const fs = require('fs');
const process = require('process');
const { Proxy } = require('./proxy');

const host = 'localhost';
const port = 3000;

fs.promises.readFile('./index.html')
    .then(contents => {
        Proxy(contents, host, port).start();
    })
    .catch(err => {
        console.error(`Could not read index.html file: ${err}`);
        process.exit(1);
    });

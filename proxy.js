const http = require('http');
const dayjs = require('dayjs');
const fs = require('fs');
const net = require('net');
const url = require('url');

const log = (level, message, args) => {
    const today = dayjs();
    let color = '\x1b[0m';
    if (level === 'INFO') {
        color = '\x1b[32m';
    } else if (level === 'DEBUG') {
        color = '\x1b[34m';
    } else if (level === 'WARN') {
        color = '\x1b[33m';
    } else if (level === 'ERROR') {
        color = '\x1b[31m';
    }
    if (args) {
        console.log(`\x1b[37m${today.format("YYYY-MM-DD H:mm:ss")}\x1b[0m`, `${color}${level}\x1b[0m`, message, args);
    } else {
        console.log(`\x1b[37m${today.format("YYYY-MM-DD H:mm:ss")}\x1b[0m`, `${color}${level}\x1b[0m`, message);
    }
};

module.exports = {
    Proxy: (content, host, port) => {
        let blacklist = [];
        const updateBlacklist = () => {
            log('INFO', 'Updating blacklist file...');
            const data = fs.readFileSync('./blacklist', { encoding: 'utf8', flag: 'r' });
            blacklist = JSON.parse(data);
        };
        const writeBlacklist = () => {
            return fs.promises.writeFile('./blacklist', JSON.stringify(blacklist));
        };
        const requestHandler = (req, res) => {
            if (req.method === 'GET') {
                if (req.url === '/') {
                    res.setHeader("Content-Type", "text/html");
                    res.writeHead(200);
                    res.end(content);
                }
                if (req.url.indexOf('/blacklist') === 0) {
                    res.setHeader("Content-Type", "application/json");
                    res.writeHead(200);
                    res.end(JSON.stringify(blacklist));
                }
            }
            if (req.method === 'DELETE' && req.url.indexOf('/blacklist') === 0) {
                const parts = url.parse(req.url, true);
                const removeUrl = parts.query.url;
                log('INFO', `- Remove blacklist: ${removeUrl}`);
                blacklist.splice(blacklist.indexOf(removeUrl), 1);
                writeBlacklist().then(() => {
                    res.writeHead(200);
                    res.end();
                });
            }
            if (req.method === 'PUT' && req.url.indexOf('/blacklist') === 0) {
                const parts = url.parse(req.url, true);
                const newUrl = parts.query.url;
                log('INFO', `+ Add blacklist: ${newUrl}`);
                blacklist.push(newUrl);
                writeBlacklist().then(() => {
                    res.writeHead(201);
                    res.end();
                });
            }
        }
        fs.watchFile('./blacklist', () => updateBlacklist());
        const server = http.createServer(requestHandler);
        server.on('connect', (req, clientSocket) => {
            log('INFO', `${clientSocket.remoteAddress}:${clientSocket.remotePort} - ${req.method} ${req.url}`);

            if (blacklist.some(b => new RegExp(b).test(req.url))) {
                log('WARN', `Denied: ${req.method} ${req.url}`);
                clientSocket.write([
                    'HTTP/1.1 403 Forbidden',
                    'Proxy-agent: Node-Proxy',
                ].join('\r\n'))
                clientSocket.end(`URL ${req.url} is denied by proxy configuration\r\n\r\n`);
                return;
            }

            const { port, hostname } = url.parse(`//${req.url}`, false, true);
            if (hostname && port) {
                clientSocket.on('error', (err) => {
                    log('ERROR', err.message);
                    if (serverSocket) {
                        serverSocket.end();
                    }
                });
                clientSocket.on('end', () => {
                    if (serverSocket) {
                        serverSocket.end();
                    }
                });
                const serverSocket = net.connect(port, hostname);
                serverSocket.on('error', (err) => {
                    log('ERROR', err.message);
                    if (clientSocket) {
                        clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`);
                    }
                });
                serverSocket.on('end', () => {
                    if (clientSocket) {
                        clientSocket.end(`HTTP/1.1 500 External Server End\r\n`);
                    }
                });
                serverSocket.on('connect', () => {
                    clientSocket.write([
                        'HTTP/1.1 200 Connection Established',
                        'Proxy-agent: Node-Proxy',
                    ].join('\r\n'));
                    clientSocket.write('\r\n\r\n');
                    serverSocket.pipe(clientSocket, { end: false });
                    clientSocket.pipe(serverSocket, { end: false });
                });
            } else {
                clientSocket.end('HTTP/1.1 400 Bad Request\r\n');
                clientSocket.destroy();
            }
        });
        this.start = () => {
            updateBlacklist();
            server.listen(port, host, (err) => {
                if (err) {
                    return log('ERROR', err);
                }
                log('INFO', `HTTP Proxy Server is runiing on http://${host}:${port}`)
            });
        }
        return this;
    }
}

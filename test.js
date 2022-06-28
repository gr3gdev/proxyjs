const chai = require('chai');
const chaiHttp = require('chai-http');
const { describe, it } = require('mocha');
const expect = chai.expect;
const { Proxy } = require('./proxy');

chai.use(chaiHttp);
require('superagent-proxy')(chai.request);

const host = '127.0.0.1';
const port = 8888;
const proxyUrl = `http://${host}:${port}`;

Proxy('OK', 'localhost', port).start()

describe('Proxy tests', () => {

    it('Add blacklist url', (done) => {
        chai.request(`http://${host}:${port}`)
            .put('/blacklist?url=google.com')
            .then(res => {
                expect(res).to.have.status(201);
                done();
            })
            .catch(err => {
                throw err;
            });
    });

    it('Remove blacklist url', (done) => {
        chai.request(`http://${host}:${port}`)
            .delete('/blacklist?url=google.com')
            .then(res => {
                expect(res).to.have.status(200);
                done();
            })
            .catch(err => {
                throw err;
            });
    });

    it('Access autorized url', (done) => {
        chai.request(`https://www.google.com`)
            .get('/')
            .proxy(proxyUrl)
            .end((err, res) => {
                expect(res).to.undefined;
                done();
            });
    });

    it('Access denied url', (done) => {
        chai.request(`http://${host}:${port}`)
            .put('/blacklist?url=google.com')
            .then(res => {
                // Add url to blacklist
                expect(res).to.have.status(201);
                chai.request(`https://www.google.com`)
                    .get('/')
                    .proxy(proxyUrl)
                    .end((err, res) => {
                        // Access denied
                        expect(res).to.have.status(403);
                        chai.request(`http://${host}:${port}`)
                            .delete('/blacklist?url=google.com')
                            .then(res => {
                                // Remove url to blacklist
                                expect(res).to.have.status(200);
                                done();
                            })
                            .catch(err => {
                                throw err;
                            });
                    });
            })
            .catch(err => {
                throw err;
            });
    });

});

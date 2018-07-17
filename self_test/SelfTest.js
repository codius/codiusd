"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../src/services/Config");
const log_1 = require("../src/common/log");
const ilpFetch = require('ilp-fetch');
const log = log_1.create('SelfTest');
const WebSocket = require('ws');
const manifestJson = require('./self-test-manifest.json');
const axios = require('axios');
const crypto = require('crypto');
class SelfTest {
    constructor(deps) {
        this.config = deps(Config_1.default);
    }
    start() {
        this.run()
            .catch(err => log.error(err));
    }
    async run() {
        const duration = 300;
        const host = this.config.publicUri;
        try {
            const randomName = crypto.randomBytes(20).toString('hex');
            manifestJson['manifest']['name'] = randomName;
            log.debug('manifestJson', manifestJson);
            let response = await ilpFetch(`${host}/pods?duration=${duration}`, {
                headers: {
                    Accept: `application/codius-v1+json`,
                    'Content-Type': 'application/json'
                },
                maxPrice: (this.config.hostCostPerMonth * 1000000).toString(),
                method: 'POST',
                body: JSON.stringify(manifestJson),
                timeout: 70000
            });
            log.debug('ilpFetch Resp', response);
            if (this.checkStatus(response)) {
                response = await response.json();
                const url = new URL(this.config.publicUri);
                await new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, 10000);
                });
                const webSocketPromise = new Promise(resolve => {
                    const ws = new WebSocket(`wss://${response.manifestHash}.${url.host}/websockets`);
                    ws.on('open', () => {
                        log.debug('Connection went through!');
                    });
                    ws.on('message', (message) => {
                        let finalMessage = JSON.parse(message);
                        if (finalMessage.websocketEnabled) {
                            resolve();
                        }
                    });
                    ws.on('error', (err) => {
                        log.debug('Error on connection for websockets', err);
                        if (!this.config.disableSelfTest) {
                            process.exit(1);
                        }
                    });
                });
                const serverPromise = new Promise(async (resolve) => {
                    try {
                        const serverRes = await axios.get(`https://${response.manifestHash}.${url.host}/server`);
                        const serverCheck = serverRes.data;
                        log.debug('serverProm', serverCheck);
                        if (serverCheck.imageUploaded) {
                            resolve();
                        }
                    }
                    catch (err) {
                        log.error('Test contract not running');
                        if (!this.config.disableSelfTest) {
                            process.exit(1);
                        }
                    }
                });
                const testPromises = await Promise.all([serverPromise, webSocketPromise]);
                Promise.race([
                    testPromises,
                    new Promise((resolve, reject) => {
                        let timeout = setTimeout(function () {
                            clearTimeout(timeout);
                            reject(new Error('Could not listen to server or websocket'));
                        }, 60000);
                    })
                ]).catch(err => {
                    log.error('Promise race err: ', err);
                    if (!this.config.disableSelfTest) {
                        process.exit(1);
                    }
                });
            }
            else {
                log.error(`Failed to upload contract due to: ${response.error}`);
                throw new Error(`Could not upload contract successfully due to: ${response.error}`);
            }
        }
        catch (err) {
            log.debug('Upload Error', err);
            if (!this.config.disableSelfTest) {
                process.exit(1);
            }
        }
    }
    checkStatus(response) {
        if (response && response.status) {
            const statusString = `${response.status}`;
            if (statusString.startsWith('2')) {
                return true;
            }
        }
        return false;
    }
}
exports.default = SelfTest;
//# sourceMappingURL=SelfTest.js.map
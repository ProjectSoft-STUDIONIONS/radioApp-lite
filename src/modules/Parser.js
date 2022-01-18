const events_1 = require("events");
const StreamReader_1 = require("./StreamReader");
const http_1 = require("http");
const https_1 = require("https");
class Parser extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.previousMetadata = new Map();
        this.options = {
            autoUpdate: true,
            emptyInterval: 5 * 60,
            errorInterval: 10 * 60,
            keepListen: false,
            metadataInterval: 5,
            notifyOnChangeOnly: false,
            url: '',
            userAgent: 'icecast-parser',
        };
        this.options = { ...this.options, ...options };
        this.queueRequest();
    }
    onRequestResponse(response) {
        const icyMetaInt = response.headers['icy-metaint'];
        if (typeof icyMetaInt === 'undefined') {
            this.destroyResponse(response);
            this.queueNextRequest(this.options.emptyInterval);
            this.emit('empty');
        }
        else {
            const reader = new StreamReader_1.StreamReader(Array.isArray(icyMetaInt) ? Number(icyMetaInt[0]) : Number(icyMetaInt));
            reader.on('metadata', (metadata) => {
                this.destroyResponse(response);
                this.queueNextRequest(this.options.metadataInterval);
                if (this.options.notifyOnChangeOnly && this.isMetadataChanged(metadata)) {
                    this.previousMetadata = metadata;
                    this.emit('metadata', metadata);
                }
                else if (!this.options.notifyOnChangeOnly) {
                    this.emit('metadata', metadata);
                }
            });
            response.pipe(reader);
            this.emit('stream', reader);
        }
    }
    onRequestError(error) {
        this.queueNextRequest(this.options.errorInterval);
        this.emit('error', error);
    }
    onSocketEnd() {
        if (this.options.keepListen) {
            this.emit('end');
        }
    }
    makeRequest() {
        const request = this.options.url.startsWith('https://')
            ? https_1.request(this.options.url)
            : http_1.request(this.options.url);
        request.setHeader('Icy-MetaData', '1');
        request.setHeader('User-Agent', this.options.userAgent);
        request.once('socket', (socket) => socket.once('end', this.onSocketEnd.bind(this)));
        request.once('response', this.onRequestResponse.bind(this));
        request.once('error', this.onRequestError.bind(this));
        request.end();
    }
    destroyResponse(response) {
        if (!this.options.keepListen) {
            response.destroy();
        }
    }
    queueNextRequest(timeout) {
        if (this.options.autoUpdate && !this.options.keepListen) {
            this.queueRequest(timeout);
        }
    }
    queueRequest(timeout = 0) {
        setTimeout(this.makeRequest.bind(this), timeout * 1000);
    }
    isMetadataChanged(metadata) {
        for (const [key, value] of metadata.entries()) {
            if (this.previousMetadata.get(key) !== value) {
                return true;
            }
        }
        return false;
    }
}
exports.Parser = Parser;
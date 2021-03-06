"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const uri = require("url");
class ProxyUtil {
    static get httpProxy() {
        return this.env.HTTP_PROXY || this.env.http_proxy;
    }
    static get httpsProxy() {
        return this.env.HTTPS_PROXY || this.env.https_proxy;
    }
    static get usingProxy() {
        if (this.httpProxy || this.httpsProxy)
            return true;
        return false;
    }
    static get sslCertDir() {
        const certDir = this.env.SSL_CERT_DIR;
        if (certDir) {
            return fs.readdirSync(certDir).map(f => path.join(certDir, f));
        }
        else {
            return [];
        }
    }
    static get sslCertFile() {
        return this.env.SSL_CERT_FILE ? [this.env.SSL_CERT_FILE] : [];
    }
    static get certs() {
        let filenames = this.sslCertFile.concat(this.sslCertDir);
        return filenames.map((filename) => fs.readFileSync(filename));
    }
    static agent(https) {
        if (!this.usingProxy)
            return;
        const u = https ? this.httpsProxy || this.httpProxy : this.httpProxy;
        if (u) {
            let proxyParsed = uri.parse(u);
            let tunnel = require('tunnel-agent');
            let tunnelMethod = https ? tunnel.httpsOverHttp : tunnel.httpOverHttp;
            let opts = {
                proxy: {
                    host: proxyParsed.hostname,
                    port: proxyParsed.port || '8080',
                },
            };
            if (proxyParsed.auth) {
                opts.proxy.proxyAuth = proxyParsed.auth;
            }
            if (this.certs.length > 0) {
                opts.ca = this.certs;
            }
            let tunnelAgent = tunnelMethod(opts);
            if (https) {
                tunnelAgent.defaultPort = 443;
            }
            return tunnelAgent;
        }
    }
}
ProxyUtil.env = process.env;
exports.default = ProxyUtil;

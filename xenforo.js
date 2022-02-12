'use strict';

const rp = require('request-promise').defaults({jar: true});
const cheerio = require('cheerio');

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class XenforoLoginSession {
    constructor(username, password) {
        this.xenforosite = '';
        this.username = username;
        this.password = password;
        // Default stuff used for all requests that's going to be done
        this.request = {
            headers: {
               'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
               'accept-encoding': 'gzip, deflate, br',
               'connection': 'keep-alive',
            },
            gzip: true,
        }
    }

    get url() { return this.xenforosite; }

    start(xenforosite) {
        // This is required because Javascript
        let self = this;
        return new Promise((resolve, reject) => {
            if (self.xenforosite) reject(new AuthenticationError('Already logged in'));

            let tokenRequest = Object.assign({}, this.request);;
            tokenRequest.resolveWithFullResponse = true;
            tokenRequest.simple = false;
            tokenRequest.uri = xenforosite;

            rp.get(tokenRequest)
            .then(response => {
                let $ = cheerio.load(response.body);
                let xfToken = $('input[name="_xfToken"]').val();

                // Now we can send a login request with the provided username and password
                let loginRequest = Object.assign({}, self.request);
                loginRequest.resolveWithFullResponse = true;
                loginRequest.simple = false;
                loginRequest.uri = `${xenforosite}/login/login`;

                loginRequest.formData = {
                    _xfRedirect: xenforosite,
                    _xfToken: xfToken,
                    login: self.username,
                    password: self.password,
                };

                return rp.post(loginRequest);
            })
            .then(response => {
                // If the response is 303 here we should have been properly logged in
                if (response.statusCode !== 303) {
                    reject(new AuthenticationError(`Error while logging into ${xenforosite}!`));
                } else {
                    self.xenforosite = xenforosite;
                    resolve(`Finished logging in to ${xenforosite}`);
                }
            })
            .catch(err => console.error);
        });
    }

    open(url) {
        let self = this;
        if (!url.startsWith(this.xenforosite)) {
            url = `${this.xenforosite}${url}`;
        }
        return new Promise((resolve, reject) => {
            let request = Object.assign({}, self.request);
            request.uri = url;

            rp.get(request)
            .then(response => resolve(response))
            .catch(err => reject(err));
        });
    }
}

module.exports = XenforoLoginSession;
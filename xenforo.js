'use strict';

const needle = require('needle');
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
        this.site = '';
        this.username = username;
        this.password = password;

        // Default stuff used for all requests that's going to be done
        this.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'accept-encoding': 'gzip, deflate, br',
            'connection': 'keep-alive',
            'cookies': {},
        };
    }

    get url() { return this.site; }

    setCookies(cookies) {
        if (!cookies) return;
        for (const [name, value] of Object.entries(cookies)) {
            this.headers['cookies'][name] = value;
        }
    }

    start(site) {
        // This is required because Javascript
        let self = this;
        return new Promise((resolve, reject) => {
            if (self.site) reject(new AuthenticationError('Already logged in'));

            needle('get', site)
            .then(response => {
                self.setCookies(response.cookies);
                let $ = cheerio.load(response.body);
                let xfToken = $('input[name="_xfToken"]').val();

                // Now we can send a login request with the provided username and password
                let request = {
                    _xfRedirect: site,
                    _xfToken: xfToken,
                    login: self.username,
                    password: self.password,
                };

                return needle('post', `${site}login/login`, request, this.headers);
            })
            .then(response => {
                // If the response is 303 here we should have been properly logged in
                if (response.statusCode !== 303) {
                    reject(new AuthenticationError(`Error while logging into ${site}!`));
                } else {
                    self.setCookies(response.cookies);
                    self.site = site;
                    resolve(`Finished logging in to ${site}`);
                }
            })
            .catch(err => reject(err));
        });
    }

    open(url) {
        let self = this;
        if (!url.startsWith(this.site)) {
            url = `${this.site}${url}`;
        }
        return new Promise((resolve, reject) => {
            needle('get', url, null, self.headers)
            .then(response => resolve(response))
            .catch(err => reject(err));
        });
    }
}

module.exports = XenforoLoginSession;
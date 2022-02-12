'use strict';

const args = process.argv.slice(2);

const fs = require('fs');

const config = require('./config');
const XenforoLoginSession = require('./xenforo');
const Conversations = require('./conversations');

// Logger for logging to file
const log = require('simple-node-logger').createSimpleLogger({
    logFilePath: config.logfile,
    timestampFormat: 'YYYY-MM-DD HH:mm',
    level: 'info',
});

function qualifiedVoter(data) {
    let join = new Date(data.joindate);
    let cutoff = new Date((new Date()).getYear() + 1899, 11, 1);
    return join < cutoff && data.postcount >= 10;
}

// Application specific stuff
let session = new XenforoLoginSession(config.username, config.password);
let title = args[0];

session.start('https://www.smogon.com/forums/')
.then(started => {
    log.info(started);

    // has logged in, now start going through conversations
    let conversations = new Conversations(session, log);
    return conversations.idsByTitle(title);
})
.then(([conversations, convIds]) => {
    let promises = [];
    let file = [];
    for (let id of convIds) {
        promises.push(conversations.content(id));
    }

    let nomCount = promises.length;
    log.info(`Votes found ${nomCount}`);
    Promise.all(promises).then(results => {
        for (let content of results) {
            content = content[0];
            if (qualifiedVoter(content)) {
                file.push(content.author);
                for (const nom of content.nominations) {
                    for (let key of Object.keys(nom)) {
                        file.push(`${key}: ${nom[key]}`);
                    }
                }
                file.push(''); // Separate ballots with newline
            } else {
                nomCount--;
                log.info(`Ignored user "${content.author}", join date: ${content.joindate}, postcount: ${content.postcount}`);
            }
        }
        try {
            fs.writeFileSync('results.txt', file.join('\n'));
            log.info(`Compiled ${nomCount} votes`);
        } catch (err) {
            log.error(err);
        }
    });
})
.catch(err => {
    log.fatal(err);
});

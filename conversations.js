'use strict';

const cheerio = require('cheerio');

function parsePage(html) {
    return cheerio.load(html);
};

function getId(string) {
    return string.substring(string.lastIndexOf('.') + 1, string.lastIndexOf('/'));
}

class Conversations {
    constructor(session, log) {
        this.session = session;
        this.log = log;
    }

    idsByTitle(title) {
        let self = this;
        let url = 'conversations/';
        let ids = [];

        return new Promise((resolve) => {
            function loadPage(page) {
                let next = url;
                if (page > 1) {
                    next = `${next}page-${page}`;
                }
                self.session.open(next)
                .then(response => {
                    let $ = parsePage(response.body);
                    let newVotes = 0;
                    $('a.structItem-title').each((_, elem) => {
                        let t = cheerio.load(elem).text().trim();
                        if (t === title) {
                            let link = elem.attribs.href;
                            ids.push(getId(link));
                            newVotes++;
                        }
                    });

                    self.log.info(`Page: ${page}, new votes: ${newVotes}`);
                    if (newVotes > 0 && page < parseInt($('.pageNav-main li').last().text())) {
                        loadPage(page + 1);
                    } else {
                        resolve([self, ids]);
                    }
                });
            };
            loadPage(1);
        });
    }

    content(id) {
        let url = `conversations/${id}`;
        let messages = [];
        let self = this;
        return new Promise((resolve) => {
            self.session.open(url)
            .then(response => {
                let $ = parsePage(response.body);
                $('article.message').each((_, elem) => {
                    let $elem = $(elem);
                    let author = '';
                    let nomination = [];
                    let lines = [];
                    for (let line of $elem.find('.bbWrapper').html().replace(/i\&gt\;/g, '</i>').split('\n')) {
                        line.replace(/\&gt/g, '>');
                        if (line.startsWith('<b>')) {
                            lines.push(line.replace('<br />', ''));
                        } else {
                            lines[lines.length - 1] += line;
                        }
                    }

                    for (let line of lines) {
                        let category = /<b>(.+?)<\/b>/g.exec(line)[1];
                        let votes = line.substring(line.indexOf('</b>') + 4);
                        if (!votes) {
                            continue;
                        }
                        votes = votes.substring(1).replace('<br>', '');
                        if (category === 'User name:') {
                            author = votes;
                        } else if (votes && votes !== '(DID NOT ANSWER QUESTION)') {
                            let linebreak = category.indexOf('<br>');
                            if (linebreak > -1) {
                                category = category.substring(0, linebreak);
                            }
                            for (const vote of votes.split(',')) {
                                nomination.push({[category]: vote.replace('->;', '->').trim()});
                            }
                        }
                    }
                    messages.push({
                        author: author,
                        nominations: nomination,
                        datetime: $elem.find('.message-attribution time').attr('datetime'),
                        nominations: nomination,
                        //authorid: getId(link),
                    });
                });

                resolve(messages);
            })
            .catch(err => self.log.error(`${url}: ${err}`));
        });
    }
}

module.exports = Conversations;
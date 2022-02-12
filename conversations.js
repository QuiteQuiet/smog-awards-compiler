'use strict';

const cheerio = require('cheerio');

function parsePage(html) {
    return cheerio.load(html)
};

function getId(string) {
    return string.substring(string.lastIndexOf('.') + 1, string.lastIndexOf('/'));
}

class Conversations {
    constructor(session, log) {
        this.session = session;
        this.log = log;
    }

    authorData(data) {
        let self = this;
        return new Promise((resolve) => {
            self.session.open(`members/${data.authorid}`)
            .then(html => {
                let $ = parsePage(html);
                data.joindate = $('.u-dt').attr('datetime');
                data.postcount = $('.pairJustifier dd a').text().split('\n')[1].replace(/[^0-9]/g, '');
                resolve(data);
            })
            .catch(err => self.log.error(err));
        });
    }

    idsByTitle(title) {
        let self = this;
        let url = 'conversations/page-';
        let ids = [];

        return new Promise((resolve) => {
            function loadPage(page) {
                self.session.open(`${url}${page}`)
                .then(html => {
                    let $ = parsePage(html);
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
            .then((html) => {
                let promises = [];
                let $ = parsePage(html);
                $('article.message').each((_, elem) => {
                    let $elem = $(elem);
                    let link = $elem.find('a.username').attr('href');
                    let nomination = [];
                    for (let line of $elem.find('.bbWrapper').html().replace(/i\&gt\;/g, '</i>').split('\n')) {
                        line = line.replace(/\&gt/g, '>');
                        let category = /<b>(.+?)<\/b>/g.exec(line)[1];
                        let votes = /<i>(.+?)<\/i>/g.exec(line)[1];
                        nomination.push({[category]: votes});
                    }

                    promises.push(this.authorData({
                        author: $elem.attr('data-author'),
                        nominations: nomination,
                        datetime: $elem.find('.message-attribution time').attr('datetime'),
                        authorid: getId(link),
                    }));
                });

                Promise.all(promises).then(data => {
                    for (const post of data) {
                        messages.push(post);
                    }
                    resolve(messages);
                });
            })
            .catch(err => self.log.error(err));
        });
    }
}

module.exports = Conversations;
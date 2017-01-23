const debug = require('debug')('kontra:model:share');
var apiErrors = require('../../server/lib/api-errors');

const QUERY_RANDOM_CARD = `
    SELECT s.id
    FROM share s
    LEFT JOIN hammer h ON h.id = s.hammerId
    WHERE h.id is not null
    AND h.nsfw = 0
    AND countVotes > 2
    ORDER BY RAND() ASC
    LIMIT 1
`;
const QUERY_RANDOM_CARD_SEARCH = `
    SELECT s.id
    FROM share s
    LEFT JOIN hammer h ON h.id = s.hammerId
    WHERE h.id is not null
    AND h.nsfw = 0
    AND countVotes > 0
    AND s.data LIKE '<search>'
    ORDER BY RAND() ASC
    LIMIT 1
`;

module.exports = function(Share) {

    Share.prototype.getText = getText;
    Share.prototype.getParts = getParts;
    Share.prototype.getAuthors = getAuthors;
    Share.prototype.getLink = getLink;

    Share.getRandomCard = getRandomCard;


    function getText() {
        return this.getParts().join("\n") +
                "\n" +
                `[by ${this.getAuthors().join(' and ')}]`;
    }

    function getLink() {
        return `https://app.loliful.io/nail/${this.data.nailId}`;
    }

    function getParts() {
        let parts = [];

        if (this.data.nailText) {
            parts.push(this.data.nailText);
        }
        if (this.data.hammerText) {
            parts.push(this.data.hammerText);
        }

        return parts;
    }

    function getAuthors() {
        let authors = [];

        if (this.data.nailAuthor) {
            authors.push(this.data.nailAuthor);
        }
        if (this.data.hammerAuthor) {
            authors.push(this.data.hammerAuthor);
        }

        return authors;
    }

    function getRandomCard(search = null) {
        return new Promise((resolve, reject) => {
            let query;
            if (search) {
                query = QUERY_RANDOM_CARD_SEARCH.replace('<search>', `%${search.replace(/[^0-9a-zA-Z ]+/g, ' ')}%`);
            } else {
                query = QUERY_RANDOM_CARD;
            }

            Share.runSql(query)
                .then(result => {
                    if (!result.length || !result[0].id) {
                        return reject(null);
                    }

                    Share.findById(result[0].id, (err, card) => {
                        if (err) {
                            debug(err);
                            return reject(err);
                        }

                        resolve(card);
                    });
                })
                .catch(err => {
                    debug(err);
                    return reject(err);
                });
        });
    }
};

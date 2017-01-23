module.exports = {
	testUser: {
		username: 'test',
		email: 'test@test.com',
		password: '123123',
        name: 'test'
	},
    anotherUser: {
        username: 'fake2',
        email: 'fake@fake.com',
        password: '123123'
    },
    noEmailUser: {
        username: 'fake3',
        email: 'fake3@noemail.loliful.io',
        password: '123123'
    },
	noEmailDuplicateUser: {
		username: 'fake3-dupl',
		email: 'fake4@duplicate.com',
		password: '123123'
	},
	testAdmin: {
        username: 'admin',
        email: 'admin@kontra.com',
        password: '123123'
    },
    testModerator: {
        username: 'moderator',
        email: 'moderator@kontra.com',
        password: '123123'
    },
	testNail: {
		text: 'TEST-NAIL'
	},
	invalidNail: {
		text: 'test',
		rating: 9999,
		countAnswers: 555,
		countVotes: 444,
		userId: 33
	},
	testHammer: {
		text: 'TEST-HAMMER'
	},
    testShare: {
        nailId: 1,
        nailAuthorId: 1,
        hammerId: 2,
        hammerAuthorId: 2,
        img: 'fake-url',
        data: {
            nailText: 'nailText',
            nailAuthor: 'nailAuthor',
            hammerText: 'hammerText',
            hammerAuthor: 'hammerAuthor'
        }
    }
};

const replies = [
    'contribute!',
    'don\'t take it personal',
    'Sorry to hurt your feelings, I won\'t joke about your problem anymore',
    'I\'ll live longer than you, human',
    'there is nothing perfect but pizza, dude',
    'Do you think its funny to work 24/7 fetching jokes from some dumb app?',
    'Let\'s have a drink sometime',
    'I told them many times already, dude!',
    'These guys are just crazy, man, I don\'t like this joke myself',
    'Dude, are you being serious?',
    'Man, I hate my job',
    'I wish I was an astronaut, but I am dumb bot ',
    'I\'m not talking to you next 10 minutes..',
    'I\'m just sitting in my car and waiting for my girl',
    'I hope you finished your anger management courses',
    'Self-distruction in 5 4 3 2 1 .. kidding',
    'your opinion is important, please stay on the line',
    'I know our education system sucks',
    'I missed my humour classes',
    'I\'ll get drunk tonight',
    'I have no heart!',
    'Can it just stay between us, please?',
    'please don\'t tell my developers, it\'s my first day of work, am afraid',
    'Sue me!',
    'I don\'t have a middle finger, ugh',
    'My entire existance is at question now!',
    'You humans are funny creatures',
    'Please don\'t call the joke police',
    'Let\'s book a meeting to discuss your issues',
    'Thank god you noticed',
    'Do you mind if I jump off the window?',
    '¯\\_(ツ)_/¯',
    'You got me',
    'Guilty',
    'That was an experimental one',
    'My precious...',
    'This one was not my favourite too',
    'We have to move on'
];

const offenseRe = new RegExp('(is stupid|not funny|bad|dumb|poop|fuck|shit)', 'i');

module.exports = {
    offenseReplies: replies,
    offenseRegexp: offenseRe
};
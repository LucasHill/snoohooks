import { SnooHook } from '../index'
const exampleHook: SnooHook = {
  redditClientConfig() {
    return {
      userAgent: 'hook-bot',
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    }
  },

  directives() {
    return [{
      subreddits: ['testingground4bots'],
      interval: '0-59 * * * *',
      commentMatcher: [/yamhill pub/i],
      submissionMatcher: [/loud boom/i]
    }];
  },

  processComment(comment, matchers, client) {
    comment.reply('My favorite bar!');
    console.log(`Processed comment: ${comment.id}`);
  },

  processSubmission(submission, matchers, client) {
    submission.reply('I heard it too!')
    console.log(`Processed submission: ${submission.id}`)
  },
};

export default exampleHook;
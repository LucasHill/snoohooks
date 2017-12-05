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
      subreddits: ['portland'],
      interval: '0-59 * * * *',
      commentMatcher: [/yamhill pub/]
    }];
  },

  processComment(comment, matchers, client) {
    console.log(comment);
  },

  processSubmission(submission, matchers, client) {
    console.log(submission);
  },
};

export default exampleHook;
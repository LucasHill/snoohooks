import { SnoowrapOptions, Comment, Submission } from 'snoowrap';
import * as Snoowrap from 'snoowrap';

declare class SnooHooks {
  constructor(config: SnooHooks.SnooHooksConfig)
}

declare namespace SnooHooks {
  interface SnooHooksConfig {
    hooksDir?: string
  }

  interface SnooDirective {
    subreddits: string[]
    interval: string  
    submissionMatcher?: RegExp[]
    commentMatcher?: RegExp[]
  }

  interface SnooHook {
    redditClientConfig(): SnoowrapOptions
    directives(): SnooDirective[]
    processComment(comment: Comment, matches: RegExp[], client: Snoowrap): void
    processSubmission(submission: Submission, matches: RegExp[], client: Snoowrap): void
  }
}

export = SnooHooks;
import { SnoowrapOptions, Comment, Submission } from 'snoowrap';
import * as Snoowrap from 'snoowrap';
import * as fs from 'fs';
import * as bluebird from 'bluebird';
import * as path from 'path';
import * as schedule from 'node-schedule';

export interface SnooHooksConfig {
  hooksDir?: string
}

export interface SnooDirective {
  subreddits: string[]
  interval: string  
  submissionMatcher?: RegExp[]
  commentMatcher?: RegExp[]
}

type CommentHook = (comment: Comment, mattchers: RegExp[], redditClient: Snoowrap) => void
type SubmissionHook = (submission: Submission, mattchers: RegExp[], redditClient: Snoowrap) => void
export interface SnooHook {
  redditClientConfig(): SnoowrapOptions
  directives(): SnooDirective[]
  processComment: CommentHook
  processSubmission: SubmissionHook
}

export default class SnooHooks {
  private jobs: SnooJob[]

  constructor(snooConfig: SnooHooksConfig = { hooksDir: 'hooks'}) {
    const hooksDir = snooConfig.hooksDir;
    
    this.startHookDirectives(hooksDir);
  }

  private async startHookDirectives(hooksDir: string) {
    try {
      await this.importHooksFiles(hooksDir);      
    } catch (error) {
      console.error('Failed to import hook files: ', error);
    }

    this.scheduleJobs();
  }

  private scheduleJobs() {
    this.jobs.forEach(job => job.schedule());
  }

  private async importHooksFiles(hooksDir: string) {
    const files = await this.findHooksFiles(hooksDir);
    const filteredFiles = files.filter((file) => !file.includes('.map'));
    fs.existsSync(`./${path.join(hooksDir, files[0])}`);
    const hooks = await bluebird.Promise.all(filteredFiles.map((file) => import(`${path.join(process.cwd(), hooksDir, file)}`)));

    this.jobs = hooks.map((hook) => new SnooJob(hook.default));
  }

  private async findHooksFiles(hooksDir: string) {
    const readdir = bluebird.promisify(fs.readdir);
    const files = await readdir(path.join(process.cwd(), hooksDir));

    return files;
  }
}


class SnooJob {
  constructor(hook: SnooHook) {
    this.hook = hook;
    this.redditClient = new Snoowrap(hook.redditClientConfig());
    this.processedComments = [];
    this.procssedSubmissions = [];
  }
  hook: SnooHook
  redditClient: Snoowrap

  processedComments: string[]
  procssedSubmissions: string[]

  schedule() {
    const directives = this.hook.directives();
    directives.forEach((directive) => {
      schedule.scheduleJob(directive.interval, () => {
        directive.subreddits.forEach(async (subreddit) => {
          const commentListings = this.redditClient.getSubreddit(subreddit).getNewComments();
          const comments = await bluebird.Promise.all(commentListings.filter(listing => !this.processedComments.includes(listing.id)).map((comment) => comment.fetch()));
          this.matchAndProcessComments(comments, directive.commentMatcher);

          const submissionListing = this.redditClient.getSubreddit(subreddit).getNew()
          const submissions = await bluebird.Promise.all(submissionListing.filter(listing => !this.procssedSubmissions.includes(listing.id)).map((submission) => submission.fetch())); //todo promise.all on comments/submissions together
          this.matchAndProcessSubmissions(submissions, directive.submissionMatcher);
        });
      });
    });
  }

  matchAndProcessComments(comments: Comment[],  matchers: RegExp[]) {
    comments.forEach((comment) => {
      this.processedComments.push(comment.id);
    
      const matches = matchers.filter((matcher) => matcher.exec(comment.body));

      if(matches.length > 0) {
        this.hook.processComment(comment, matches, this.redditClient);
      }
    });
  }


  //todo extract both match methods together.
  matchAndProcessSubmissions(submissions: Submission[], matchers: RegExp[]) {
    submissions.forEach((submission) => {
      this.procssedSubmissions.push(submission.id);

      const matches = matchers.filter((matcher) => matcher.exec(submission.title));

      if(matches.length > 0) {
        this.hook.processSubmission(submission, matches, this.redditClient);
      }
    });
  }
}

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

export interface SnooHook {
  redditClientConfig(): SnoowrapOptions
  directives(): SnooDirective[]
  processComment(comment: Comment, matches: RegExp[], client: Snoowrap): void
  processSubmission(submission: Submission, matches: RegExp[], client: Snoowrap): void
}

class SnooJob {
  constructor(hook: SnooHook) {
    this.hook = hook;
    this.redditClient = new Snoowrap(hook.redditClientConfig());
  }
  hook: SnooHook
  redditClient: Snoowrap
}

export default class SnooHooks {
  private jobs: SnooJob[]

  constructor(snooConfig: SnooHooksConfig = { hooksDir: 'hooks'}) {
    const hooksDir = snooConfig.hooksDir;
    
    this.startHookDirectives(hooksDir);
  }

  async startHookDirectives(hooksDir: string) {
    try {
      await this.importHooksFiles(hooksDir);      
    } catch (error) {
      console.error('Failed to import hook files: ', error);
    }

    this.scheduleJobs();
  }

  scheduleJobs() {
    this.jobs.forEach((job) => {
      const directives = job.hook.directives();
      directives.forEach((directive) => {
        schedule.scheduleJob(directive.interval, () => {
          directive.subreddits.forEach(async (subreddit) => {
            const commentListings = job.redditClient.getSubreddit(subreddit).getNewComments();
            const comments = await bluebird.Promise.all(commentListings.map((listing) => listing.fetch()))
            comments.forEach((comment) => {
              const matches = directive.commentMatcher.filter((matcher) => matcher.exec(comment.body));

              if(matches.length > 0) {
                job.hook.processComment(comment, matches, job.redditClient);
              }
            });
          });
        });
      });
    });
  }

  async importHooksFiles(hooksDir: string) {
    const files = await this.findHooksFiles(hooksDir);
    const filteredFiles = files.filter((file) => !file.includes('.map'));
    fs.existsSync(`./${path.join(hooksDir, files[0])}`);
    const hooks = await bluebird.Promise.all(filteredFiles.map((file) => import(`./${path.join(hooksDir, file)}`)));

    this.jobs = hooks.map((hook) => new SnooJob(hook.default));
  }

  async findHooksFiles(hooksDir: string) {
    const readdir = bluebird.promisify(fs.readdir);
    const files = await readdir(`dist/${hooksDir}`);

    return files;
  }
  
}

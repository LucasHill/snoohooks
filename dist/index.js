"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Snoowrap = require("snoowrap");
const fs = require("fs");
const bluebird = require("bluebird");
const path = require("path");
const schedule = require("node-schedule");
class SnooJob {
    constructor(hook) {
        this.hook = hook;
        this.redditClient = new Snoowrap(hook.redditClientConfig());
    }
}
class SnooHooks {
    constructor(snooConfig = { hooksDir: 'hooks' }) {
        const hooksDir = snooConfig.hooksDir;
        this.startHookDirectives(hooksDir);
    }
    async startHookDirectives(hooksDir) {
        try {
            await this.importHooksFiles(hooksDir);
        }
        catch (error) {
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
                        const comments = await bluebird.Promise.all(commentListings.map((listing) => listing.fetch()));
                        comments.forEach((comment) => {
                            const matches = directive.commentMatcher.filter((matcher) => matcher.exec(comment.body));
                            if (matches.length > 0) {
                                job.hook.processComment(comment, matches, job.redditClient);
                            }
                        });
                    });
                });
            });
        });
    }
    async importHooksFiles(hooksDir) {
        const files = await this.findHooksFiles(hooksDir);
        const filteredFiles = files.filter((file) => !file.includes('.map'));
        fs.existsSync(`./${path.join(hooksDir, files[0])}`);
        const hooks = await bluebird.Promise.all(filteredFiles.map((file) => Promise.resolve().then(() => require(`${path.join(process.cwd(), hooksDir, file)}`))));
        this.jobs = hooks.map((hook) => new SnooJob(hook.default));
    }
    async findHooksFiles(hooksDir) {
        const readdir = bluebird.promisify(fs.readdir);
        const files = await readdir(path.join(process.cwd(), hooksDir));
        return files;
    }
}
exports.default = SnooHooks;
//# sourceMappingURL=index.js.map
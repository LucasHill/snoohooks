/// <reference types="snoowrap" />
import { SnoowrapOptions, Comment, Submission } from 'snoowrap';
import * as Snoowrap from 'snoowrap';
export interface SnooHooksConfig {
    hooksDir?: string;
}
export interface SnooDirective {
    subreddits: string[];
    interval: string;
    submissionMatcher?: RegExp[];
    commentMatcher?: RegExp[];
}
export interface SnooHook {
    redditClientConfig(): SnoowrapOptions;
    directives(): SnooDirective[];
    processComment(comment: Comment, matches: RegExp[], client: Snoowrap): void;
    processSubmission(submission: Submission, matches: RegExp[], client: Snoowrap): void;
}
export default class SnooHooks {
    private jobs;
    constructor(snooConfig?: SnooHooksConfig);
    startHookDirectives(hooksDir: string): Promise<void>;
    scheduleJobs(): void;
    importHooksFiles(hooksDir: string): Promise<void>;
    findHooksFiles(hooksDir: string): Promise<string[]>;
}

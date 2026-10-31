import { validateConfig } from './model.mjs';
export const SETTINGS_TITLE = '[Reports settings] Update my Reports preferences';
export function settingsRequestURL(config) {
  const clean=validateConfig(config);
  const url=new URL('https://github.com/MundusMortem/Mundus-Apps/issues/new');
  url.searchParams.set('title',SETTINGS_TITLE);
  url.searchParams.set('body','Apply these Reports settings to my news feed and email reports.\n\n### Configuration\n```json\n'+JSON.stringify(clean,null,2)+'\n```\n\n[Return to Reports](https://mundusmortem.github.io/Mundus-Apps/apps/reports/)');
  if(url.href.length>7500)throw Error('These settings are too long for GitHub confirmation. Shorten some topics or excluded words.');
  return url.href;
}
export function parseSettingsIssue(issue) {
  if(issue?.user?.id!==52387967)throw Error('Only MundusMortem can change Reports settings.');
  if(issue.pull_request||typeof issue.title!=='string'||!issue.title.startsWith('[Reports settings]'))throw Error('Not a Reports settings request.');
  if(issue.state!=='open')throw Error('Settings request is no longer open.');
  if(typeof issue.body!=='string'||issue.body.length>15000)throw Error('Invalid settings request.');
  const match=issue.body.match(/### Configuration\r?\n```json\r?\n([\s\S]*?)\r?\n```/);
  if(!match)throw Error('Settings configuration is missing.');
  return validateConfig(JSON.parse(match[1]));
}

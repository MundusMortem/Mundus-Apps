import { REPOSITORY, requestURL } from './catalog.mjs';
export const OWNER_ID = 52387967;
export function isOwner(user) { return user?.id === OWNER_ID; }
export function isAppRequest(issue) { return typeof issue?.title === 'string' && issue.title.startsWith('[App request]'); }
export function shouldRejectRequest(issue) { return isAppRequest(issue) && !isOwner(issue.user); }
function headers(token) {
  if (typeof token !== 'string' || !token.trim()) throw new Error('Enter your GitHub token to verify your account.');
  return { Authorization: `Bearer ${token.trim()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}
export async function verifyOwner(token, fetcher = fetch) {
  const response = await fetcher('https://api.github.com/user', {headers:headers(token),cache:'no-store',credentials:'omit',redirect:'error'});
  if (!response.ok) throw new Error('GitHub verification failed. Check your token and try again.');
  const user = await response.json();
  if (!isOwner(user)) throw new Error('Only MundusMortem can request apps.');
  return user;
}
export async function submitRequest(token, name, details, fetcher = fetch) {
  const url = new URL(requestURL(name, details));
  // Recheck the authenticated identity immediately before every write.
  await verifyOwner(token, fetcher);
  const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}/issues`, {
    method:'POST',headers:{...headers(token),'Content-Type':'application/json'},credentials:'omit',redirect:'error',
    body:JSON.stringify({title:url.searchParams.get('title'),body:url.searchParams.get('body')})
  });
  if (!response.ok) throw new Error('Request was not confirmed. Check View requests before retrying; your token needs Issues: Read and write for Mundus-Apps.');
  const issue = await response.json();
  if (!isOwner(issue.user) || !Number.isSafeInteger(issue.number) || issue.number < 1) throw new Error('Unexpected GitHub response. Check View requests before retrying.');
  return { number:issue.number, url:`https://github.com/${REPOSITORY}/issues/${issue.number}` };
}

"""Collect public Google News RSS without storing account credentials."""
import datetime as dt
import email.utils
import hashlib
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]

def validate_config(c):
    if not isinstance(c, dict):
        raise ValueError('Settings must be an object')
    for key, limit, length in [('themes', 8, 120), ('sources', 12, 100), ('exclude', 20, 80)]:
        if not isinstance(c.get(key), list) or len(c[key]) > limit or any(not isinstance(x,str) or not x.strip() or len(x)>length for x in c[key]):
            raise ValueError('Invalid '+key)
    if not c['themes'] or any(not re.fullmatch(r'([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}', x) for x in c['sources']):
        raise ValueError('Invalid topics or sources')
    if c.get('country') not in ['US','GB','CA','AU','IN','DE','FR'] or c.get('language') not in ['en','de','fr','es']:
        raise ValueError('Invalid edition')
    for key, low, high in [('maxArticles',5,100),('digestLimit',1,50)]:
        if type(c.get(key)) is not int or not low <= c[key] <= high:
            raise ValueError('Invalid '+key)
    if c.get('digestHours') not in [1,6,12,24,168] or type(c.get('emailEnabled')) is not bool:
        raise ValueError('Invalid email preferences')
    return c

def feed_url(theme, c):
    query = theme + ' when:7d'
    if c['sources']:
        query += ' (' + ' OR '.join('site:'+x for x in c['sources']) + ')'
    return 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q':query,'hl':c['language'],'gl':c['country'],'ceid':c['country']+':'+c['language']})

def clean(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', text or ''))).strip()

def parse_feed(body, theme, c):
    if len(body)>2_000_000 or b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('Unsafe or oversized RSS')
    root = ET.fromstring(body)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Expected RSS')
    articles=[]
    for item in root.findall('./channel/item'):
        title=clean(item.findtext('title'))
        url=(item.findtext('link') or '').strip()
        parsed=urllib.parse.urlparse(url)
        if not title or parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:
            continue
        if any(word.casefold() in title.casefold() for word in c['exclude']):
            continue
        try:
            published=email.utils.parsedate_to_datetime(item.findtext('pubDate')).astimezone(dt.timezone.utc).isoformat()
        except (TypeError,ValueError,AttributeError,OverflowError):
            continue
        articles.append({'id':hashlib.sha256(url.encode()).hexdigest()[:24], 'title':title[:500], 'url':url, 'source':clean(item.findtext('source'))[:150] or 'Google News', 'publishedAt':published, 'themes':[theme], 'summary':clean(item.findtext('description'))[:280]})
        if len(articles)>=c['maxArticles']:
            break
    return articles

def collect(c, fetcher):
    validate_config(c)
    all_articles={};errors=[]
    for theme in c['themes']:
        try:
            articles=parse_feed(fetcher(feed_url(theme,c)),theme,c)
            for article in articles:
                if article['id'] in all_articles:
                    all_articles[article['id']]['themes']=list(dict.fromkeys(all_articles[article['id']]['themes']+[theme]))
                else:
                    all_articles[article['id']]=article
        except Exception:
            # Log only the topic, never response content or credentials.
            errors.append(theme)
    if len(errors)==len(c['themes']):
        raise RuntimeError('All news feeds failed; keeping the last successful briefing.')
    return {'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'config':c,'articles':sorted(all_articles.values(),key=lambda a:a['publishedAt'],reverse=True),'errors':errors}

def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'MundusReports/1.0 RSS reader'})
    with urllib.request.urlopen(request,timeout=25) as response:
        return response.read(2_000_001)

if __name__=='__main__':
    config=json.loads((ROOT/'apps/reports/config.json').read_text())
    result=collect(config,fetch)
    (ROOT/'apps/reports/data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f"Collected {len(result['articles'])} stories; {len(result['errors'])} topic failures.")

"""Reports' deterministic scheduled email backend. No GPT runtime is used."""
import base64
import copy
import datetime as dt
import hashlib
import html
import json
import os
import pathlib
import smtplib
import ssl
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from email.utils import format_datetime

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONFIG='apps/reports/config.json'
DATA='apps/reports/data.json'
STATE='apps/reports/delivery.json'
STATUS='apps/reports/email-status.json'
APP='https://mundusmortem.github.io/Mundus-Apps/apps/reports/'
SETUP='https://github.com/MundusMortem/Mundus-Apps/blob/main/apps/reports/README.md#sender-setup'

class BackendError(Exception):
    pass

class GitHubStore:
    """Contents API updates use fresh blob SHAs and bounded conflict retries."""
    def __init__(self,repository,token):
        if repository!='MundusMortem/Mundus-Apps' or not token:
            raise BackendError('Authorized repository backend is unavailable.')
        self.base='https://api.github.com/repos/'+repository+'/contents/'
        self.token=token

    def request(self,path,method='GET',payload=None):
        url=self.base+path+('?ref=main' if method=='GET' else '')
        request=urllib.request.Request(url,method=method,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+self.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'MundusReports-native-backend'})
        with urllib.request.urlopen(request,timeout=30) as response:
            return json.load(response)

    def document(self,path):
        try:
            response=self.request(path)
            return json.loads(base64.b64decode(response['content'])),response['sha']
        except urllib.error.HTTPError as error:
            if error.code==404 and path==STATUS:
                return {},None
            raise BackendError('Could not read Reports backend state.') from None
        except (OSError,ValueError,KeyError):
            raise BackendError('Could not read Reports backend state.') from None

    def read(self,path):
        return self.document(path)[0]

    def update(self,path,transform):
        for attempt in range(3):
            old,sha=self.document(path)
            new=transform(copy.deepcopy(old))
            if new==old:
                return new
            payload={'branch':'main','message':'Record native Reports email status','content':base64.b64encode((json.dumps(new,indent=2)+'\n').encode()).decode()}
            if sha:payload['sha']=sha
            try:
                self.request(path,'PUT',payload)
                return new
            except urllib.error.HTTPError as error:
                if error.code==409 and attempt<2:continue
                raise BackendError('Could not persist Reports email state.') from None
            except OSError:
                raise BackendError('Could not persist Reports email state.') from None
        raise BackendError('Concurrent delivery-state update needs review.')

def utcnow():
    return dt.datetime.now(dt.timezone.utc)

def parse_time(value):
    try:
        stamp=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
        return stamp if stamp.tzinfo else stamp.replace(tzinfo=dt.timezone.utc)
    except (TypeError,ValueError,AttributeError):
        return None

def make_plan(config,data,state,now):
    process=subprocess.run(['node',str(ROOT/'scripts/reports_plan.mjs')],input=json.dumps({'config':config,'data':data,'state':state,'now':int(now.timestamp()*1000)}),text=True,capture_output=True,timeout=20)
    if process.returncode:
        raise BackendError('Reports settings or briefing failed validation.')
    return json.loads(process.stdout)

def address_valid(address):
    # Exactly the same single-address validation used by the app.
    import re
    return isinstance(address,str) and len(address)<=254 and '..' not in address and bool(re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}',address))

def safe_url(value):
    try:
        parsed=urllib.parse.urlparse(value)
        return value if parsed.scheme=='https' and parsed.hostname and not parsed.username and not parsed.password else None
    except (TypeError,ValueError):
        return None

def build_message(articles,sender,recipient,key,now):
    if not address_valid(sender) or not address_valid(recipient):
        raise BackendError('Sender or recipient is invalid.')
    message=EmailMessage()
    message['From']=sender
    message['To']=recipient
    message['Subject']='Reports digest ['+key+']'
    message['Date']=format_datetime(now)
    message['Message-ID']='<reports-'+key+'@'+sender.split('@')[1]+'>'
    plain=['Reports — your industry briefing']
    sections=[]
    for article in articles:
        url=safe_url(article.get('url'))
        if not url:raise BackendError('An article has an invalid source link.')
        title=str(article.get('title',''))
        source=str(article.get('source',''))
        date=str(article.get('publishedAt',''))[:10]
        summary=str(article.get('summary',''))
        topics=', '.join(str(x) for x in article.get('themes',[]))
        plain.append(f'{title}\n{source} · {date}\n{summary}\n{url}')
        esc=lambda value:html.escape(str(value),quote=True)
        sections.append(f'<article style="padding:22px;margin:18px 0;border:1px solid #a882ff;border-radius:20px;background:#11131d"><p style="color:#d6ff5f;font-size:12px">{esc(topics)}</p><h2 style="font-size:19px;line-height:1.4"><a style="color:#f5f5f7" href="{esc(url)}">{esc(title)}</a></h2><p style="color:#8e92a0;font-size:12px">{esc(source)} · {esc(date)}</p><p style="color:#dddde7">{esc(summary)}</p><a style="color:#d6ff5f" href="{esc(url)}">Read source →</a></article>')
    note='Disable email or change your preferences in Customize in the Reports app.'
    plain.extend([APP,note])
    message.set_content('\n\n'.join(plain))
    message.add_alternative('<!doctype html><html><body style="margin:0;background:#080910;color:#f5f5f7;font:14px/1.6 Arial,sans-serif"><main style="max-width:680px;margin:auto;padding:30px 20px"><p style="color:#d6ff5f;letter-spacing:2px">MUNDUS APPS · REPORTS</p><h1>Your industry briefing</h1>'+''.join(sections)+'<p><a style="color:#d6ff5f" href="'+APP+'">Open Reports</a></p><p style="color:#8e92a0;font-size:12px">'+note+' Headlines and feed descriptions belong to their publishers.</p></main></body></html>',subtype='html')
    return message

class SafeSendFailure(Exception):
    """Failure confirmed before any provider acceptance; retry is safe."""

class UncertainSendFailure(Exception):
    """Provider acceptance cannot be ruled out; do not automatically resend."""

def send_smtp(message,env):
    client=None
    sending=False
    accepted=False
    try:
        host=env.get('REPORTS_SMTP_HOST') or 'smtp.gmail.com'
        port=int(env.get('REPORTS_SMTP_PORT') or '465')
        context=ssl.create_default_context()
        if port==465:
            client=smtplib.SMTP_SSL(host,port,timeout=30,context=context)
        else:
            client=smtplib.SMTP(host,port,timeout=30)
            client.ehlo();client.starttls(context=context);client.ehlo()
        client.login(env['REPORTS_SMTP_USERNAME'],env['REPORTS_SMTP_PASSWORD'])
        sending=True
        refused=client.send_message(message)
        if refused:raise smtplib.SMTPRecipientsRefused(refused)
        accepted=True
    except (smtplib.SMTPAuthenticationError,smtplib.SMTPRecipientsRefused,smtplib.SMTPDataError):
        raise SafeSendFailure('Mail provider rejected the attempt.') from None
    except Exception:
        if sending:raise UncertainSendFailure('Delivery acknowledgement was interrupted.') from None
        raise SafeSendFailure('Could not connect or authenticate to the mail provider.') from None
    finally:
        if client:
            try:client.quit()
            except Exception:
                # A disconnect after provider acceptance does not undo the send.
                try:client.close()
                except Exception:pass
    return accepted

def process(store,env,clock=utcnow,sender=send_smtp,planner=make_plan):
    now=clock()
    config=store.read(CONFIG)
    data=store.read(DATA)
    state=store.read(STATE)
    plan=planner(config,data,state,now)
    config=plan['config']
    def status(code,message):
        current=store.read(STATE)
        last=current.get('lastSentAt')
        stamp=parse_time(last)
        payload={'backend':'native','state':code,'message':message,'checkedAt':clock().isoformat(),'lastSentAt':last,'nextDueAt':(stamp+dt.timedelta(hours=config['digestHours'])).isoformat() if stamp else None,'setupUrl':SETUP}
        store.update(STATUS,lambda old:{**old,**payload})
        return payload
    if not config['emailEnabled']:
        return status('disabled','Email reports are off.')
    if state.get('pending'):
        return status('needs_review','A previous send needs review before retrying, to prevent duplicate email.')
    if not env.get('REPORTS_SMTP_USERNAME') or not env.get('REPORTS_SMTP_PASSWORD'):
        return status('needs_setup','Email needs a private sender setup before Reports can send.')
    sender_address=env.get('REPORTS_SMTP_FROM') or env['REPORTS_SMTP_USERNAME']
    recipient=config.get('emailTo') or sender_address
    if not address_valid(sender_address) or not address_valid(recipient):
        return status('needs_setup','Check the sender address and saved report recipient.')
    if plan['reason']!='ready':
        messages={'not due':'The next email report is not due yet.','no new stories':'No new stories to email.','stale feed':'Waiting for a fresh news collection.','settings pending collection':'Waiting for a collection matching your settings.'}
        return status(plan['reason'].replace(' ','_'),messages.get(plan['reason'],'Waiting for an eligible report.'))
    articles=plan['articles']
    ids=[article['id'] for article in articles]
    key=hashlib.sha256('\n'.join(sorted(ids)).encode()).hexdigest()[:16]
    message=build_message(articles,sender_address,recipient,key,now)
    pending={'key':key,'articleIds':ids,'startedAt':now.isoformat(),'messageId':message['Message-ID']}
    def reserve(current):
        if current.get('pending') or current.get('lastSentAt')!=state.get('lastSentAt') or current.get('articleIds',[])!=state.get('articleIds',[]):
            raise BackendError('Delivery state changed; skip this attempt.')
        return {**current,'pending':pending}
    # This journal is durable BEFORE SMTP. A crash cannot silently trigger a resend.
    store.update(STATE,reserve)
    try:
        if not sender(message,env):raise UncertainSendFailure('No provider acknowledgement.')
    except SafeSendFailure:
        store.update(STATE,lambda current:{**current,'pending':None} if (current.get('pending') or {}).get('key')==key else current)
        return status('error','The mail provider rejected this attempt. Check sender setup; no report was marked sent.')
    except Exception:
        return status('needs_review','Delivery could not be confirmed. Review the pending send before retrying.')
    sent_at=clock()
    def confirm(current):
        seen=list(dict.fromkeys(current.get('articleIds',[])+ids))[-10000:]
        previous=parse_time(current.get('lastSentAt'))
        last=max(previous,sent_at) if previous else sent_at
        result={**current,'lastSentAt':last.isoformat(),'articleIds':seen}
        if (current.get('pending') or {}).get('key')==key:result.pop('pending',None)
        return result
    try:
        store.update(STATE,confirm)
    except Exception:
        # The durable pending record remains. No automatic retry may send it again.
        raise BackendError('Provider accepted email; delivery-state confirmation needs review.') from None
    return status('sent','Report accepted by the mail provider.')

if __name__=='__main__':
    try:
        store=GitHubStore(os.environ.get('GITHUB_REPOSITORY',''),os.environ.get('GITHUB_TOKEN',''))
        result=process(store,os.environ)
        print('Reports native email status: '+result['state'])
    except BackendError as error:
        print('Reports backend needs attention: '+str(error))
        raise SystemExit(1)

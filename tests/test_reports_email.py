import copy
import datetime as dt
import importlib.util
import json
import pathlib
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('native_email',pathlib.Path(__file__).parents[1]/'scripts/reports_email.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW=dt.datetime(2026,10,31,12,0,tzinfo=dt.timezone.utc)
ARTICLE={'id':'new-1','title':'A <script>alert(1)</script> & B','source':'Publisher','url':'https://example.com/story?a=1&b=2','publishedAt':'2026-10-31T11:00:00Z','themes':['Industry'],'summary':'<img src=x onerror=evil()> Update'}
CONFIG={'themes':['Industry'],'country':'US','language':'en','sources':[],'exclude':[],'maxArticles':10,'emailEnabled':True,'emailTo':'recipient@example.com','digestHours':24,'digestLimit':5}
ENV={'REPORTS_SMTP_USERNAME':'sender@example.com','REPORTS_SMTP_PASSWORD':'test-password'}
class MemoryStore:
    def __init__(self):
        self.files={m.CONFIG:copy.deepcopy(CONFIG),m.DATA:{'generatedAt':NOW.isoformat(),'config':copy.deepcopy(CONFIG),'articles':[ARTICLE]},m.STATE:{'lastSentAt':None,'articleIds':['old-1'],'customField':'keep'}}
        self.fail_confirm=False
    def read(self,path):return copy.deepcopy(self.files.get(path,{}))
    def update(self,path,transform):
        before=self.read(path);after=transform(before)
        if self.fail_confirm and path==m.STATE and after.get('lastSentAt'):raise m.BackendError('write failed')
        self.files[path]=copy.deepcopy(after);return after

def plan(config,data,state,now):
    return {'config':config,'reason':'ready' if config['emailEnabled'] else 'disabled','articles':[ARTICLE]}

class NativeEmailTests(unittest.TestCase):
    def test_disabled_never_sends(self):
        store=MemoryStore();store.files[m.CONFIG]['emailEnabled']=False
        result=m.process(store,{},clock=lambda:NOW,planner=plan,sender=lambda *_:self.fail('must not send'))
        self.assertEqual(result['state'],'disabled');self.assertIsNone(store.read(m.STATE)['lastSentAt'])
    def test_missing_credentials_surface_setup_without_marking_sent(self):
        store=MemoryStore();before=store.read(m.STATE)
        result=m.process(store,{},clock=lambda:NOW,planner=plan,sender=lambda *_:self.fail('must not send'))
        self.assertEqual(result['state'],'needs_setup');self.assertEqual(store.read(m.STATE),before)
    def test_success_journals_before_send_then_merges_history(self):
        store=MemoryStore();captured=[]
        def sender(message,env):
            self.assertTrue(store.read(m.STATE)['pending']);self.assertIsNone(store.read(m.STATE)['lastSentAt'])
            captured.append(message);return True
        result=m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=sender)
        state=store.read(m.STATE)
        self.assertEqual(result['state'],'sent');self.assertEqual(state['articleIds'],['old-1','new-1']);self.assertEqual(state['customField'],'keep');self.assertNotIn('pending',state)
        self.assertEqual(captured[0]['To'],'recipient@example.com')
    def test_empty_recipient_defaults_to_private_sender_address(self):
        store=MemoryStore();store.files[m.CONFIG]['emailTo']='';out=[]
        m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=lambda msg,env:out.append(msg) or True)
        self.assertEqual(out[0]['To'],'sender@example.com');self.assertNotIn('sender@example.com',json.dumps(store.read(m.STATUS)))
    def test_safe_failure_does_not_mark_sent_or_block_safe_retry(self):
        store=MemoryStore()
        def fail(*_):raise m.SafeSendFailure()
        result=m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=fail)
        self.assertEqual(result['state'],'error');self.assertIsNone(store.read(m.STATE)['lastSentAt']);self.assertFalse(store.read(m.STATE).get('pending'))
    def test_uncertain_send_blocks_retries(self):
        store=MemoryStore();calls=[]
        def fail(*_):calls.append(True);raise m.UncertainSendFailure()
        self.assertEqual(m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=fail)['state'],'needs_review')
        self.assertEqual(m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=fail)['state'],'needs_review');self.assertEqual(len(calls),1);self.assertIsNone(store.read(m.STATE)['lastSentAt'])
    def test_failed_confirmation_after_provider_acceptance_keeps_journal(self):
        store=MemoryStore();store.fail_confirm=True
        with self.assertRaises(m.BackendError):m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=lambda *_:True)
        self.assertTrue(store.read(m.STATE)['pending'])
        self.assertEqual(m.process(store,ENV,clock=lambda:NOW,planner=plan,sender=lambda *_:self.fail('duplicate'))['state'],'needs_review')
    def test_email_escapes_feed_content_and_rejects_non_https_links(self):
        msg=m.build_message([ARTICLE],'sender@example.com','recipient@example.com','abc',NOW)
        body=msg.get_body(preferencelist=('html',)).get_content()
        self.assertNotIn('<script>',body);self.assertIn('&lt;script&gt;',body);self.assertIn('&amp;',body)
        with self.assertRaises(m.BackendError):m.build_message([{**ARTICLE,'url':'javascript:evil()'}],'sender@example.com','recipient@example.com','abc',NOW)
        with self.assertRaises(m.BackendError):m.build_message([ARTICLE],'sender@example.com','a@example.com\nBcc:evil@example.com','abc',NOW)
    def test_real_shared_plan_prevents_early_sends(self):
        state={'lastSentAt':NOW.isoformat(),'articleIds':[]};data={'config':CONFIG,'generatedAt':NOW.isoformat(),'articles':[ARTICLE]}
        self.assertEqual(m.make_plan(CONFIG,data,state,NOW)['reason'],'not due')
    def test_smtp_uses_tls_auth_and_acceptance_then_ignores_quit_disconnect(self):
        captured=[]
        class FakeSMTP:
            def __init__(self,*args,**kwargs):self.context=kwargs['context'];captured.append(self)
            def login(self,user,password):self.user=user;self.password=password
            def send_message(self,message):self.sent=message;return {}
            def quit(self):raise OSError('disconnect after acceptance')
            def close(self):pass
        message=m.build_message([ARTICLE],'sender@example.com','recipient@example.com','abc',NOW)
        with patch.object(m.smtplib,'SMTP_SSL',FakeSMTP):self.assertTrue(m.send_smtp(message,ENV))
        self.assertEqual(captured[0].user,'sender@example.com');self.assertTrue(captured[0].context.check_hostname)

if __name__=='__main__':unittest.main()

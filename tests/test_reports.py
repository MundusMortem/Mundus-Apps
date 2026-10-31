import importlib.util
import json
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('collector',pathlib.Path(__file__).parents[1]/'scripts/reports_collect.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
CONFIG=json.loads((m.ROOT/'apps/reports/config.json').read_text())
RSS=b'''<rss><channel><item><title>Industry &amp; innovation</title><link>https://example.com/news</link><source>Publisher</source><pubDate>Sat, 31 Oct 2026 03:00:00 GMT</pubDate><description>&lt;b&gt;Headline detail&lt;/b&gt;</description></item><item><title>Bad link</title><link>javascript:alert(1)</link><pubDate>Sat, 31 Oct 2026 03:00:00 GMT</pubDate></item></channel></rss>'''
class ReportsTest(unittest.TestCase):
    def test_parse(self):
        rows=m.parse_feed(RSS,'AI',CONFIG)
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['title'],'Industry & innovation');self.assertEqual(rows[0]['summary'],'Headline detail')
    def test_deduplicate_topics(self):
        data=m.collect(CONFIG,lambda _:RSS)
        self.assertEqual(len(data['articles']),1);self.assertEqual(data['articles'][0]['themes'],CONFIG['themes'])
    def test_partial_failure(self):
        count=0
        def fetcher(_):
            nonlocal count
            count+=1
            if count==1:raise OSError()
            return RSS
        result=m.collect(CONFIG,fetcher)
        self.assertEqual(result['errors'],[CONFIG['themes'][0]])
    def test_all_fail_preserves_previous(self):
        with self.assertRaises(RuntimeError):m.collect(CONFIG,lambda _:b'<html>broken feed</html>')
    def test_rejects_entities(self):
        with self.assertRaises(ValueError):m.parse_feed(b'<!DOCTYPE a><rss/>','AI',CONFIG)
    def test_exclusions(self):
        self.assertEqual(m.parse_feed(RSS,'AI',{**CONFIG,'exclude':['innovation']}),[])
    def test_query_encoded(self):
        url=m.feed_url('energy & EVs',{**CONFIG,'sources':['reuters.com']})
        query=m.urllib.parse.parse_qs(m.urllib.parse.urlparse(url).query)['q'][0]
        self.assertIn('energy & EVs',query);self.assertIn('site:reuters.com',query)
    def test_config_rejects_invalid_fields(self):
        for c in [{**CONFIG,'themes':[]},{**CONFIG,'sources':['localhost/path']},{**CONFIG,'maxArticles':999},{**CONFIG,'emailEnabled':'yes'}]:
            with self.assertRaises(ValueError):m.validate_config(c)
if __name__=='__main__':unittest.main()

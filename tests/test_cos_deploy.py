"""Exercise deployment failure boundaries without a Tencent account or network."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from qcloud_cos.cos_exception import CosServiceError
from qcloud_cos.cos_comm import mapped

spec = importlib.util.spec_from_file_location('deploy_cos', Path(__file__).resolve().parents[1] / 'scripts/deploy-cos.py')
deploy_cos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy_cos)


def service_error(status):
    return CosServiceError('HEAD', '<Error><Code>TestError</Code><Message>test</Message></Error>', status)


class FakeCOS:
    def __init__(self):
        self.objects = {}
        self.uploads = []
        self.head_error = None
        self.fail_key = None

    def head_object(self, Bucket, Key):
        if self.head_error:
            raise service_error(self.head_error)
        if Key not in self.objects:
            raise service_error(404)
        return self.objects[Key]

    def put_object(self, Bucket, Key, Body, EnableMD5, **kwargs):
        key = Key
        if key == self.fail_key:
            raise service_error(403)
        Body.read()
        self.objects[key] = {
            'x-cos-meta-sha256': mapped(kwargs)['x-cos-meta-sha256'],
            'Content-Type': kwargs['ContentType'],
            'Cache-Control': kwargs['CacheControl'],
        }
        self.uploads.append(key)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for name, text in {
            'index.html': '<html>home</html>', '404.html': '<html>missing</html>',
            'release-guard.js': '// guard', 'release.json': json.dumps({'revision': 'test-revision'}),
            'assets/art.webp': 'artwork',
        }.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        self.client = FakeCOS()

    def test_upload_order_root_keys_and_repeat_run(self):
        deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertEqual(self.client.uploads[-1], 'release.json')
        self.assertLess(self.client.uploads.index('assets/art.webp'), self.client.uploads.index('index.html'))
        self.assertLess(self.client.uploads.index('release-guard.js'), self.client.uploads.index('index.html'))
        self.assertEqual(self.client.objects['index.html']['Content-Type'], 'text/html; charset=utf-8')
        self.assertIn('no-cache', self.client.objects['release.json']['Cache-Control'])
        self.client.uploads.clear()
        deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertEqual(self.client.uploads, [])
        (self.root / 'assets/art.webp').write_text('new artwork')
        deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertEqual(self.client.uploads, ['assets/art.webp'])

    def test_bad_cache_metadata_is_repaired(self):
        path = self.root / 'index.html'
        deploy_cos.upload_file(self.client, 'portfolio-123', self.root, path)
        self.client.objects['index.html']['Cache-Control'] = 'max-age=31536000'
        self.assertTrue(deploy_cos.upload_file(self.client, 'portfolio-123', self.root, path))

    def test_missing_build_does_not_write(self):
        (self.root / 'index.html').unlink()
        with self.assertRaises(ValueError):
            deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertEqual(self.client.uploads, [])

    def test_permission_error_is_not_treated_as_missing_object(self):
        self.client.head_error = 403
        with self.assertRaises(CosServiceError):
            deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertEqual(self.client.uploads, [])

    def test_failed_asset_upload_does_not_publish_pages_or_manifest(self):
        self.client.fail_key = 'assets/art.webp'
        with self.assertRaises(CosServiceError):
            deploy_cos.deploy(self.client, 'portfolio-123', self.root)
        self.assertNotIn('index.html', self.client.uploads)
        self.assertNotIn('release.json', self.client.uploads)

    def test_configuration_validation(self):
        valid = dict(COS_BUCKET='portfolio-123', COS_REGION='ap-hongkong', COS_SECRET_ID='test', COS_SECRET_KEY='test')
        self.assertEqual(deploy_cos.settings(valid)['COS_REGION'], 'ap-hongkong')
        for replacement in ({'COS_SECRET_KEY': ''}, {'COS_BUCKET': 'portfolio'}, {'COS_REGION': 'https://example.com'}):
            with self.assertRaises(ValueError):
                deploy_cos.settings(valid | replacement)


if __name__ == '__main__':
    unittest.main()

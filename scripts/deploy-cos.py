"""Upload only the audited public tree; retain old assets for cached pages."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re

from qcloud_cos import CosConfig, CosS3Client
from qcloud_cos.cos_exception import CosServiceError

ROOT = Path(__file__).resolve().parents[1] / 'public'
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
}


def settings(environ):
    names = ('COS_BUCKET', 'COS_REGION', 'COS_SECRET_ID', 'COS_SECRET_KEY')
    values = {name: environ.get(name, '').strip() for name in names}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise ValueError('Missing GitHub configuration: ' + ', '.join(missing))
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*-\d+', values['COS_BUCKET']):
        raise ValueError('COS_BUCKET must be the full bucket name including the numeric APPID.')
    if not re.fullmatch(r'[a-z]+-[a-z]+(?:-\d+)?', values['COS_REGION']):
        raise ValueError('COS_REGION must be a region code such as ap-hongkong.')
    return values


def content_headers(path):
    content_type = MIME_TYPES.get(path.suffix) or mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    # Revalidate entrypoints, scripts and manifests; cache artwork briefly.
    cache = 'no-cache, max-age=0, must-revalidate' if path.suffix in {'.html', '.js', '.css', '.json'} else 'public, max-age=300'
    return content_type, cache


def upload_file(client, bucket, root, path):
    key = path.relative_to(root).as_posix()
    with path.open('rb') as body:
        digest = hashlib.file_digest(body, 'sha256').hexdigest()
    content_type, cache = content_headers(path)
    try:
        previous = client.head_object(Bucket=bucket, Key=key)
    except CosServiceError as error:
        if error.get_status_code() != 404:
            raise
    else:
        if (previous.get('x-cos-meta-sha256') == digest
                and previous.get('Content-Type') == content_type
                and previous.get('Cache-Control') == cache):
            return False
    with path.open('rb') as body:
        client.put_object(
            Bucket=bucket, Key=key, Body=body, EnableMD5=True,
            ContentType=content_type, CacheControl=cache,
            ContentDisposition='inline', Metadata={'x-cos-meta-sha256': digest},
        )
    return True


def deploy(client, bucket, root=ROOT):
    # Refuse a source checkout or incomplete build before making remote changes.
    for name in ('index.html', '404.html', 'release-guard.js', 'release.json'):
        if not (root / name).is_file():
            raise ValueError('Incomplete public build: missing ' + name)
    revision = json.loads((root / 'release.json').read_text())['revision']
    files = sorted(path for path in root.rglob('*') if path.is_file())
    assets = [path for path in files if path.suffix != '.html' and path.name != 'release.json']
    pages = [path for path in files if path.suffix == '.html']
    uploaded = 0
    # Finish all resources before publishing HTML, and publish the manifest last.
    # On a failed phase, later phases never run. Never delete remote objects.
    with ThreadPoolExecutor(max_workers=8) as pool:
        for batch in (assets, pages, [root / 'release.json']):
            uploaded += sum(pool.map(lambda path: upload_file(client, bucket, root, path), batch))
    print(f'COS revision {revision}: uploaded {uploaded}, unchanged {len(files) - uploaded}; old assets retained.')


def main():
    try:
        values = settings(os.environ)
        client = CosS3Client(CosConfig(
            Region=values['COS_REGION'], SecretId=values['COS_SECRET_ID'],
            SecretKey=values['COS_SECRET_KEY'], Scheme='https', Timeout=60,
        ))
        deploy(client, values['COS_BUCKET'])
    except CosServiceError as error:
        # Do not log SDK exception payloads, signed requests or credentials.
        raise SystemExit(f'COS request failed: HTTP {error.get_status_code()}, code {error.get_error_code()}. Check bucket region and CAM permissions.') from None
    except ValueError as error:
        raise SystemExit(str(error)) from None


if __name__ == '__main__':
    main()

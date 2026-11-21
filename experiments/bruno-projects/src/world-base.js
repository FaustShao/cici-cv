// Every public entry can render the same current application without a redirect.
// This meta is rewritten by the release assembler for root and legacy addresses.
export function worldBaseURL() {
  return new URL(document.querySelector('meta[name="cecilia-world-root"]')?.content || './', location.href);
}

export function versionedURL(path, base = location.href) {
  const url = new URL(path, base);
  const release = document.querySelector('meta[name="cecilia-release"]')?.content;
  // Pinned binary models/codecs keep their cache; changing artwork and manifests follow the current release.
  if(release && url.origin === location.origin && /\.(?:html|png|webp|jpe?g|svg|json|mp[34]|woff2|ttf)$/i.test(url.pathname))url.searchParams.set('build', release);
  return url.href;
}

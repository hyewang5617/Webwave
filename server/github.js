// GitHub API는 서버에서만 호출합니다. 브라우저에는 토큰을 전달하지 않습니다.
export function createGithubService({ sites, fetcher = fetch, now = Date.now, ttl = 10 * 60_000, token = '' }) {
  let cache = null;
  let pending = null;
  let nextAttempt = 0;
  async function request(path) {
    const response = await fetcher(`https://api.github.com/repos/${path}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Webwave', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub 요청 한도에 도달했어요. 잠시 후 다시 시도합니다.' : 'GitHub 정보를 가져오지 못했어요.');
    return response.json();
  }
  async function collect() {
    const items = await Promise.all(sites.filter(site => site.github).map(async site => {
      const previous = cache?.items.find(item => item.id === site.id);
      try {
        const repo = await request(site.github);
        if (!repo) return { id: site.id, repository: site.github, status: 'unavailable', message: '공개 저장소를 찾을 수 없어요.' };
        let release = null;
        let releaseError = null;
        try {
          const latest = await request(`${site.github}/releases/latest`);
          if (latest) release = { title: latest.name || latest.tag_name, url: latest.html_url, publishedAt: latest.published_at, body: (latest.body || '').slice(0, 1200) };
        } catch { releaseError = '릴리스 정보를 불러오지 못했어요.'; }
        return { id: site.id, repository: site.github, status: 'ok', stars: repo.stargazers_count, forks: repo.forks_count,
          pushedAt: repo.pushed_at, url: repo.html_url, release, releaseError, fetchedAt: new Date(now()).toISOString() };
      } catch (error) {
        return previous && Number.isFinite(previous.stars) ? { ...previous, status: 'stale', message: error.message } :
          { id: site.id, repository: site.github, status: 'error', message: error.message };
      }
    }));
    const hasFailures = items.some(item => item.status !== 'ok' || item.releaseError);
    // 에러가 나도 1분 동안 재시도를 막아 반복 클릭이 API 요청을 폭증시키지 않게 합니다.
    nextAttempt = now() + (hasFailures ? 60_000 : ttl);
    cache = { items, checkedAt: new Date(now()).toISOString(), nextRefreshAt: new Date(nextAttempt).toISOString() };
    return cache;
  }
  return {
    async get() {
      if (pending) return pending;
      if (cache && now() < nextAttempt) return cache;
      pending = collect();
      try { return await pending; } finally { pending = null; }
    },
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGithubService } from './github.js';
const sites = [{ id: 'one', github: 'owner/project' }, { id: 'no-repo' }];
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });

test('공유 캐시와 중복 요청 병합: 같은 시간의 요청은 저장소를 한 번만 조회한다', async () => {
  let calls = 0;
  let clock = 0;
  const service = createGithubService({ sites, now: () => clock, fetcher: async url => {
    calls++;
    return url.endsWith('/releases/latest') ? response(null, 404) : response({ stargazers_count: 8, html_url: 'https://github.com/owner/project' });
  } });
  const [first, concurrent] = await Promise.all([service.get(), service.get()]);
  assert.equal(first.items[0].stars, 8);
  assert.equal(first.items[0].release, null);
  assert.deepEqual(first, concurrent);
  assert.equal(calls, 2);
  clock = 599999;
  await service.get();
  assert.equal(calls, 2);
  clock = 600000;
  await service.get();
  assert.equal(calls, 4);
});

test('한도 초과 시 마지막 정상 수치와 원래 수집 시각을 유지한다', async () => {
  let clock = 0;
  let failure = false;
  const service = createGithubService({ sites, now: () => clock, fetcher: async url => failure ? response(null, 403) : url.endsWith('/releases/latest') ? response(null, 404) : response({ stargazers_count: 12 }) });
  const first = await service.get();
  clock = 600000;
  failure = true;
  const next = await service.get();
  assert.equal(next.items[0].status, 'stale');
  assert.equal(next.items[0].stars, 12);
  assert.equal(next.items[0].fetchedAt, first.items[0].fetchedAt);
});

test('저장소 미확인은 스타 0으로 위장하지 않는다', async () => {
  const service = createGithubService({ sites, fetcher: async () => response(null, 404) });
  const result = await service.get();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, 'unavailable');
  assert.equal(result.items[0].stars, undefined);
});

test('정식 릴리스 필드가 전달되고, 릴리스만 실패해도 스타는 유지된다', async () => {
  const service = createGithubService({ sites, fetcher: async url => url.endsWith('/releases/latest') ? response({ tag_name: 'v1', published_at: '2026-11-01T00:00:00Z', body: '변경 내역', html_url: 'https://github.com/owner/project/releases/tag/v1' }) : response({ stargazers_count: 2 }) });
  assert.equal((await service.get()).items[0].release.title, 'v1');
  const partial = createGithubService({ sites, fetcher: async url => url.endsWith('/releases/latest') ? response(null, 500) : response({ stargazers_count: 2 }) });
  const item = (await partial.get()).items[0];
  assert.equal(item.stars, 2);
  assert.ok(item.releaseError);
});

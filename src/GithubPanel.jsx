import { useCallback, useEffect, useRef, useState } from 'react';

const dateText = value => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '기록 없음';
const numberText = value => new Intl.NumberFormat('ko-KR').format(value);

export default function GithubPanel({ websites }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minutes, setMinutes] = useState(10);
  const busy = useRef(false);
  const lastAttempt = useRef(0);
  const controller = useRef(null);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    lastAttempt.current = Date.now();
    setLoading(true);
    setError('');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    try {
      const response = await fetch('/api/github', { signal: controller.current.signal });
      if (!response.ok) throw new Error('GitHub 정보를 불러오지 못했어요. 새로고침으로 다시 시도해주세요.');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('GitHub API 서버 연결을 확인해주세요.');
      setSnapshot(data);
    } catch (failure) {
      setError(failure.name === 'AbortError' ? '응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.' : failure.message);
    } finally {
      clearTimeout(timeout);
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const tick = () => { if (!document.hidden && Date.now() - lastAttempt.current >= minutes * 60_000) refresh(); };
    const timer = setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [minutes, refresh]);

  useEffect(() => () => controller.current?.abort(), []);

  const byId = new Map(websites.map(site => [site.id, site]));
  const items = (snapshot?.items || []).filter(item => byId.has(item.id));
  const ranked = items.filter(item => Number.isFinite(item.stars)).sort((a, b) => b.stars - a.stars || byId.get(a.id).title.localeCompare(byId.get(b.id).title, 'ko'));
  const releases = items.filter(item => item.release).sort((a, b) => new Date(b.release.publishedAt) - new Date(a.release.publishedAt));
  const changed = items.filter(item => item.pushedAt).sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
  return (
    <section className="discovery github-section" aria-labelledby="github-title">
      <div className="section-heading"><div><span className="eyebrow">FROM THE MAKERS</span><h2 id="github-title">GitHub에서 주목받는 작품</h2></div><span className="preview-badge">스타 기준</span></div>
      <p className="section-description">연결한 공개 저장소의 누적 스타 순위예요. 웹사이트 방문 수와는 다른 지표입니다. 스타가 같으면 작품 이름순으로 표시해요.</p>
      <div className="github-toolbar">
        <label>자동 갱신 <select value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={10}>10분마다</option><option value={30}>30분마다</option></select></label>
        <button type="button" onClick={refresh} disabled={loading}>{loading ? '불러오는 중…' : '새로고침 ↻'}</button>
      </div>
      <p className="sync-note" role="status" aria-live="polite">{snapshot ? `서버 확인: ${dateText(snapshot.checkedAt)} · 최신 수집: ${dateText(items.map(item => item.fetchedAt).filter(Boolean).sort().at(-1))}` : 'GitHub의 실제 데이터를 불러옵니다.'}</p>
      <p className="sync-note">서버는 정상 응답을 최대 10분간 공유합니다. 새로고침도 이 기간에는 저장된 결과를 표시해요.</p>
      {error && <p className="github-warning" role="alert">{error}{snapshot && ' 이전에 받은 결과를 표시합니다.'}</p>}
      {items.filter(item => item.status !== 'ok').map(item => <p className="github-warning" key={item.id}>{byId.get(item.id).title}: {item.message}{item.status === 'stale' && ' 마지막으로 수집한 수치입니다.'}</p>)}
      {ranked.length > 0 ? <ol className="ranking-list">{ranked.map((item, index) => <li key={item.id}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><div className="github-rank-title"><a href={byId.get(item.id).url} target="_blank" rel="noopener noreferrer">{byId.get(item.id).title}<span className="sr-only"> (새 탭)</span></a><a className="repo-link" href={item.url} target="_blank" rel="noopener noreferrer">{item.repository} ↗<span className="sr-only"> (새 탭)</span></a></div><span>★ {numberText(item.stars)}{item.status === 'stale' ? ' · 이전 수치' : ''}</span></li>)}</ol> : !loading && <p className="empty-message">표시할 GitHub 순위가 아직 없어요. 연결된 저장소를 확인하거나 다시 시도해주세요.</p>}
      <div className="github-updates">
        <h3>제작자의 릴리스</h3><p className="sync-note">GitHub에 공개한 최신 정식 릴리스예요. 실제 웹사이트 배포 여부와는 다를 수 있어요.</p>
        {releases.length ? releases.map(item => <article className="release-card" key={item.id}><span className="category">{byId.get(item.id).title}</span><h4><a href={item.release.url} target="_blank" rel="noopener noreferrer">{item.release.title} ↗<span className="sr-only"> (새 탭)</span></a></h4><time dateTime={item.release.publishedAt}>{dateText(item.release.publishedAt)}</time><p>{item.release.body || '등록된 릴리스 설명이 없어요.'}</p></article>) : <p className="empty-message">{loading ? '릴리스를 확인하고 있어요.' : '아직 표시할 정식 릴리스가 없어요.'}</p>}
        {items.filter(item => item.releaseError).map(item => <p className="github-warning" key={item.id}>{byId.get(item.id).title}: {item.releaseError}</p>)}
        <h3>최근 코드 변경</h3><p className="sync-note">저장소에 코드가 올라온 시각이며, 서비스 업데이트를 뜻하지는 않아요.</p>
        <ul className="code-updates">{changed.map(item => <li key={item.id}><a href={`https://github.com/${item.repository}/commits`} target="_blank" rel="noopener noreferrer">{byId.get(item.id).title} ↗<span className="sr-only"> (새 탭)</span></a><time dateTime={item.pushedAt}>{dateText(item.pushedAt)}</time></li>)}</ul>
      </div>
    </section>
  );
}


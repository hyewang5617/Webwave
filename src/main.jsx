import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { websites } from './websites';
import './styles.css';
import GithubPanel from './GithubPanel';

function Reveal({ children }) {
  const element = useRef(null);
  useEffect(() => {
    const node = element.current;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.remove('reveal-pending');
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    node.classList.add('reveal-pending');
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div className="reveal" ref={element}>{children}</div>;
}

function WebsiteCard({ website, onVisit }) {
  return (
    <article className="website-card">
      <div className="card-artwork" style={{ backgroundColor: website.color }}>
        <span className="artwork-label">PLAY SOMETHING DIFFERENT</span>
        <span className="artwork-emoji" aria-hidden="true">{website.artwork}</span>
        <span className="artwork-caption">{website.title}</span>
      </div>
      <div className="card-body">
        <span className="category">{website.category}</span>
        <h3>{website.title}</h3>
        <p>{website.description}</p>
        <ul className="tags" aria-label="태그">{website.tags.map(tag => <li key={tag}>#{tag}</li>)}</ul>
        <a className="visit-link" href={website.url} target="_blank" rel="noopener noreferrer" onClick={() => onVisit(website.id)}>
          사이트 방문 <span aria-hidden="true">↗</span><span className="sr-only"> (새 탭)</span>
        </a>
      </div>
    </article>
  );
}

function readVisits() {
  try {
    const stored = JSON.parse(localStorage.getItem('webwave-visits') || '{}');
    // 저장 데이터가 잘못되었거나 옛 형식이어도 유효한 숫자만 사용합니다.
    return Object.fromEntries(websites.map(site => [site.id,
      Number.isSafeInteger(stored?.[site.id]) && stored[site.id] >= 0 ? stored[site.id] : 0,
    ]));
  } catch { return {}; }
}

function App() {
  const [query, setQuery] = useState('');
  const [visits, setVisits] = useState(readVisits);
  const filtered = websites.filter(site =>
    [site.title, site.description, site.category, ...site.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  );
  const popular = websites.filter(site => (visits[site.id] || 0) > 0)
    .sort((a, b) => visits[b.id] - visits[a.id]).slice(0, 3);

  useEffect(() => {
    try { localStorage.setItem('webwave-visits', JSON.stringify(visits)); } catch { /* 저장이 제한되어도 이번 방문 중에는 작동합니다. */ }
  }, [visits]);

  function recordVisit(id) {
    setVisits(previous => ({ ...previous, [id]: Math.min((previous[id] || 0) + 1, Number.MAX_SAFE_INTEGER) }));
  }

  return (
    <>
      <header className="site-header">
        <a className="logo" href="#" aria-label="Webwave 홈"><span className="logo-wave" aria-hidden="true">〰</span> webwave<span className="logo-dot">.</span></a>
        <span className="header-note">작은 발견, 새로운 재미</span>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <span className="eyebrow">YOUR NEXT INTERNET ADVENTURE</span>
          <h1 id="hero-title">인터넷에는 아직<br />재밌는 파도가 많으니까<span className="blue-dot">.</span></h1>
          <p>기발한 웹게임부터 엉뚱한 실험까지.<br className="mobile-break" /> 마음에 드는 사이트로 가볍게 떠나보세요.</p>
          <span className="hero-wave" aria-hidden="true">〰</span>
          <a href="#discover" className="scroll-cue">아래로 내려 발견하기 <span aria-hidden="true">↓</span></a>
        </section>
        <section id="discover" className="discovery" aria-labelledby="discovery-title">
          <Reveal>
            <div className="section-heading">
              <div><span className="eyebrow">CATCH A NEW WAVE</span><h2 id="discovery-title">발견 피드</h2></div>
              <span className="site-count">{filtered.length}개의 사이트</span>
            </div>
            <label className="search-label" htmlFor="site-search">어떤 재미를 찾고 있나요?</label>
            <input id="site-search" className="site-search" type="search" placeholder="사이트 이름이나 태그 검색" value={query} onChange={event => setQuery(event.target.value)} />
            <div className="website-grid">{filtered.map(site => <WebsiteCard key={site.id} website={site} onVisit={recordVisit} />)}</div>
            {filtered.length === 0 && <p className="empty-message" role="status">검색 결과가 없어요. 다른 단어로 찾아보세요.</p>}
          </Reveal>
        </section>
        <GithubPanel websites={websites} />
        <section className="discovery popularity" aria-labelledby="popular-title">
          <Reveal>
            <div className="section-heading"><div><span className="eyebrow">MAKING WAVES</span><h2 id="popular-title">이 브라우저에서 많이 방문한 사이트</h2></div><span className="preview-badge">로컬 체험</span></div>
            <p className="section-description">지금은 이 브라우저에서 ‘사이트 방문’을 누른 횟수로 순위를 체험해요. 전체 이용자 인기 집계는 추후 연결됩니다.</p>
            {popular.length === 0 ? <div className="ranking-empty"><span aria-hidden="true">〰</span><h3>첫 번째 파도를 만들어보세요</h3><p>발견 피드에서 사이트를 방문하면 여기에 순위가 나타납니다.</p></div> :
              <ol className="ranking-list">{popular.map((site, index) => <li key={site.id}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><a href={site.url} target="_blank" rel="noopener noreferrer" onClick={() => recordVisit(site.id)}>{site.title}<span className="sr-only"> (새 탭)</span></a><span>{visits[site.id]}회 방문</span></li>)}</ol>}
          </Reveal>
        </section>
      </main>
      <footer>WEBWAVE © {new Date().getFullYear()} <span>호기심이 닿는 곳으로.</span></footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);


import React from 'react';
import { createRoot } from 'react-dom/client';
import { websites } from './websites';
import './styles.css';

// props로 받은 사이트 정보를 카드 한 장으로 표시합니다.
function WebsiteCard({ website }) {
  return (
    <article className="website-card">
      <div className="card-artwork" style={{ backgroundColor: website.color }}>
        <span className="artwork-label">PLAY SOMETHING DIFFERENT</span>
        <span className="artwork-emoji" aria-hidden="true">{website.artwork}</span>
        <span className="artwork-caption">우리 학교 부수러 가기</span>
      </div>
      <div className="card-body">
        <span className="category">{website.category}</span>
        <h3>{website.title}</h3>
        <p>{website.description}</p>
        <ul className="tags" aria-label="태그">
          {website.tags.map((tag) => <li key={tag}>#{tag}</li>)}
        </ul>
        <a className="visit-link" href={website.url} target="_blank" rel="noopener noreferrer">
          사이트 방문 <span aria-hidden="true">↗</span><span className="sr-only"> (새 탭)</span>
        </a>
      </div>
    </article>
  );
}

function App() {
  return (
    <>
      <header className="site-header">
        <a className="logo" href="/" aria-label="Webwave 홈"><span aria-hidden="true">〰</span> webwave<span className="logo-dot">.</span></a>
        <span className="header-note">작은 발견, 새로운 재미</span>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <span className="eyebrow">YOUR NEXT INTERNET ADVENTURE</span>
          <h1 id="hero-title">인터넷에는 아직<br />재밌는 파도가 많으니까<span className="blue-dot">.</span></h1>
          <p>기발한 웹게임부터 엉뚱한 실험까지.<br className="mobile-break" /> 마음에 드는 사이트로 가볍게 떠나보세요.</p>
          <span className="hero-wave" aria-hidden="true">〰</span>
        </section>
        <section className="discovery" aria-labelledby="discovery-title">
          <div className="section-heading">
            <div><span className="eyebrow">THE FIRST WAVE</span><h2 id="discovery-title">첫 번째 발견</h2></div>
            <span className="site-count">{websites.length}개의 사이트</span>
          </div>
          <div className="website-grid">
            {websites.map((website) => <WebsiteCard key={website.id} website={website} />)}
          </div>
          {websites.length === 0 && <p className="empty-message">아직 등록된 사이트가 없어요. 첫 발견을 준비 중입니다.</p>}
        </section>
      </main>
      <footer>WEBWAVE © {new Date().getFullYear()} <span>호기심이 닿는 곳으로.</span></footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

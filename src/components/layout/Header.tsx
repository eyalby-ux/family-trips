function Header() {
  return (
    <header className="hero">
      <div className="heroTop">
        <div>
          <p className="eyebrow">Family Trips</p>
          <h1>דולומיטים 2026</h1>
          <p className="subtitle">מסלול משפחתי, ציוד, קניות, משחקים וקישורים במקום אחד</p>
        </div>
        <div className="heroIcon">🏔️</div>
      </div>

      <div className="heroStats">
        <div><strong>8</strong><span>ימים</span></div>
        <div><strong>6</strong><span>משתתפים</span></div>
        <div><strong>12.07</strong><span>תחילת הטיול</span></div>
      </div>
    </header>
  );
}

export default Header;
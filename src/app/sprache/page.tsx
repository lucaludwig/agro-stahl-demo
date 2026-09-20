export default function SprachePage() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px' }}>
      <style>{`
        :root {
          --navy: #0d2d50;
          --accent: #0078d4;
          --gold: #c9971f;
          --red: #c23b3b;
          --red-bg: #fbeaea;
          --resolved: #0d2d50;
          --resolved-bg: #eaf1fa;
          --border: #d7e0ea;
          --bg: #f4f7fa;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg);
        }
        .label {
          display: inline-block;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--accent);
          background: #e8f2fc;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 19px;
          color: #5b6b7c;
          margin: 0 0 32px 0;
        }
        .row {
          display: flex;
          align-items: stretch;
          gap: 28px;
        }
        .panel {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(13,45,80,0.06);
          padding: 28px;
          flex: 1;
        }
        .panel h3 {
          margin: 0 0 18px 0;
          font-size: 22px;
          color: var(--navy);
        }
        .phone {
          background: #eef2f6;
          border-radius: 14px;
          padding: 18px;
        }
        .chatheader {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--navy);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 17px;
        }
        .chatname { font-weight: 700; color: var(--navy); font-size: 19px; }
        .chatstatus { font-size: 15px; color: #8a97a6; }
        .bubble {
          background: var(--navy);
          color: #fff;
          border-radius: 16px 16px 16px 4px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 340px;
          margin-bottom: 8px;
        }
        .mic {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .wave { display: flex; align-items: center; gap: 3px; flex: 1; }
        .wave span {
          display: block; width: 3px; background: rgba(255,255,255,0.85); border-radius: 2px;
        }
        .duration { font-size: 15px; color: rgba(255,255,255,0.75); }
        .timestamp { font-size: 14px; color: #8a97a6; text-align: right; margin-top: 4px; }
        .transcript-hint {
          margin-top: 16px;
          font-size: 17px;
          color: #5b6b7c;
          font-style: italic;
          border-left: 3px solid var(--accent);
          padding-left: 12px;
        }
        .arrowcol {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 60px;
        }
        .arrow {
          font-size: 30px;
          color: var(--accent);
        }
        .field {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 12px 0;
          border-bottom: 1px solid #eef1f5;
        }
        .field:last-of-type { border-bottom: none; }
        .fkey { font-size: 16px; color: #8a97a6; }
        .fval { font-size: 19px; font-weight: 600; color: var(--navy); text-align: right; }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--resolved-bg);
          color: var(--resolved);
          font-size: 16px;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 10px;
          margin-top: 16px;
        }
        .badge::before { content: "✓"; }
        .footnote {
          margin-top: 28px;
          font-size: 15px;
          color: #97a3b0;
        }
      `}</style>

      <span className="label">Konzept-Mockup — noch nicht gebaut</span>
      <p className="subtitle">Sprachnachricht nach dem Kundengespräch → automatisch erkannt &amp; strukturiert erfasst</p>

      <div className="row">
        <div className="panel">
          <h3>1 · Chef spricht kurz nach dem Gespräch</h3>
          <div className="phone">
            <div className="chatheader">
              <div className="avatar">CS</div>
              <div>
                <div className="chatname">Chef → Büro AGRO</div>
                <div className="chatstatus">Sprachnachricht</div>
              </div>
            </div>
            <div className="bubble">
              <div className="mic">🎙</div>
              <div className="wave">
                <span style={{ height: '8px' }}></span>
                <span style={{ height: '16px' }}></span>
                <span style={{ height: '10px' }}></span>
                <span style={{ height: '22px' }}></span>
                <span style={{ height: '14px' }}></span>
                <span style={{ height: '18px' }}></span>
                <span style={{ height: '9px' }}></span>
                <span style={{ height: '20px' }}></span>
                <span style={{ height: '12px' }}></span>
                <span style={{ height: '16px' }}></span>
                <span style={{ height: '11px' }}></span>
              </div>
              <div className="duration">0:32</div>
            </div>
            <div className="timestamp">heute, 10:41</div>
            <div className="transcript-hint">&quot;Maier Landwirtschaft, Kiwischieber-Reparatur, Schweißarbeit plus ein Ersatzteil, mach ma 480 Euro, die kriegen 10 Prozent Stammkundenrabatt...&quot;</div>
          </div>
        </div>

        <div className="arrowcol"><span className="arrow">→</span></div>

        <div className="panel">
          <h3>2 · System erkennt automatisch</h3>
          <div className="field">
            <span className="fkey">Kunde</span>
            <span className="fval">Maier Landwirtschaft GmbH</span>
          </div>
          <div className="field">
            <span className="fkey">Leistung</span>
            <span className="fval">Kiwischieber – Schweißarbeit + Ersatzteil</span>
          </div>
          <div className="field">
            <span className="fkey">Preis (vereinbart)</span>
            <span className="fval">€ 480,–</span>
          </div>
          <div className="field">
            <span className="fkey">Sonderkondition</span>
            <span className="fval">10 % Stammkundenrabatt</span>
          </div>
          <div className="badge">Angelegt in Wrike &amp; Arista</div>
        </div>
      </div>

      <p className="footnote">Illustration des Konzepts. Martina prüft und gibt frei wie bisher — der Chef muss dafür nichts anklicken.</p>
    </div>
  );
}

import "./Standby.css";

export default function Standby({ onStart }) {
  return (
    <main className="standby-page">

      <section className="standby-summary" aria-label="오늘 운행 정보">
        {/* 서버 연결 전까지 사용하는 가짜 데이터 */}
        <p>오늘 운행 3회차 · 이슈 2건</p>
      </section>

      <section className="standby-action" aria-label="음성 기록">
        <button type="button" className="standby-button" onClick={onStart}>
          녹음
        </button>
      </section>

      <p className="standby-hint">상황이 안정된 후 버튼을 눌러 말씀해 주세요.</p>

    </main>
  );
}

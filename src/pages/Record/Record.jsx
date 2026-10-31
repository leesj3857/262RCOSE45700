import { useState, useEffect } from "react";
import "./Record.css";

// 초 단위 숫자를 "00:07" 형태로 변환
function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
}

export default function Record({ onFinish, onCancel }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        // 1초마다 seconds를 1 증가
        const timer = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);

        // 화면이 사라질 때 타이머를 정리
        return () => clearInterval(timer);
    }, []);

    return (
        <main className="record-page">
            <section className="record-status">
                <p className="record-time">{formatTime(seconds)}</p>
                <p className="record-label">듣는 중</p>

                {/* 나중에 실제 소리 크기에 반응하는 파형으로 교체할 자리 */}
                <div className="record-wave" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </section>

            <section className="record-actions">
                <button type="button" className="finish-button" onClick={onFinish}>
                    ■ 끝내기
                </button>
                <button type="button" className="cancel-button" onClick={onCancel}>
                    취소
                </button>
            </section>
        </main>
    );
}

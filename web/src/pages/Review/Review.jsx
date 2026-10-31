import { useState, useEffect, useRef } from "react";
import { mockReview } from "../../mockData/reviewData";
import "./Review.css";


// 필드 키를 화면용 한글 이름으로 바꾸는 사전
const FIELD_LABELS = {
    location: "위치",
    event: "사건",
    situation: "상황",
    weather: "날씨",
};

export default function Review({ audioUrl, onBack }) {
    const [review] = useState(mockReview);
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null); // 실제 오디오 객체를 보관 (화면을 다시 그리지 않고 값만 유지)


    // audioUrl이 생기면 Audio 객체를 만들고, 재생이 끝나면 상태를 되돌림
    useEffect(() => {
        if (!audioUrl) return;

        const audio = new Audio(audioUrl);
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;

        // 화면이 사라지면 재생을 멈춤
        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl]);

    // 재생 버튼 클릭 시 재생/정지 토글
    function handlePlay() {
        const audio = audioRef.current;
        if (!audio) return;

        if (playing) {
            audio.pause();
            audio.currentTime = 0;
            setPlaying(false);
        } else {
            audio.play();
            setPlaying(true);
        }
    }


    return (
        <main className="review-page">
            <header className="review-header">

                <h1>기록 확인</h1>
            </header>

            {/* 1. 녹음 내용 재생 */}
            <section className="review-section">
                <h2>녹음 내용</h2>
                <button
                    type="button"
                    className="play-button"
                    onClick={handlePlay}
                    disabled={!audioUrl}
                >
                    {playing ? "■ 정지" : "▶ 재생"}
                </button>

            </section>

            {/* 2. STT 결과 */}
            <section className="review-section">
                <h2>음성 텍스트 - 현재는 mock data</h2>
                <p className="transcript">{review.transcript}</p>
            </section>

            {/* 3. 필드 구조화 결과 (fields를 순회하므로 필드가 늘어나도 수정 불필요) */}
            <section className="review-section">
                <h2>자동 정리 - 현재는 mock data</h2>
                {Object.entries(review.fields).map(([key, field]) => (
                    <div key={key} className="review-field">
                        <span className="field-label">{FIELD_LABELS[key] ?? key}</span>
                        <span className={field.value ? "field-value" : "field-empty"}>
                            {field.value || "확인 필요"}
                        </span>
                    </div>
                ))}
            </section>

            {/* 4. 뒤로가기 버튼 */}

            <section className="review-actions">
                <button type="button" className="back-button" onClick={onBack}>
                    뒤로가기
                </button>
            </section>
        </main >
    );
}

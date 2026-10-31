import { useState } from "react";
import { mockReview } from "../../mockData/reviewData";
import "./Review.css";
import ClipPlayer from "./ClipPlayer";


// 필드 키를 화면용 한글 이름으로 바꾸는 사전
const FIELD_LABELS = {
    location: "위치",
    event: "사건",
    situation: "상황",
    weather: "날씨",
};

export default function Review({ audioClips, onAdd, onBack }) {

    const [review] = useState(mockReview);




    return (
        <main className="review-page">
            <header className="review-header">

                <h1>기록 확인</h1>
            </header>
            {/* 스크롤되는 영역 */}
            <div className="review-body">
                {/* 1. 녹음 내용 재생 */}
                <section className="review-section">
                    <h2>녹음 내용</h2>
                    {audioClips.map((clip) => (
                        <ClipPlayer key={clip.url} url={clip.url} label={clip.label} />
                    ))}

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
            </div>
            {/* 4. 추가녹음 , 뒤로가기 버튼 */}

            <section className="review-actions">
                <button type="button" className="add-button" onClick={onAdd}>
                    추가녹음
                </button>
                <button type="button" className="back-button" onClick={onBack}>
                    뒤로가기
                </button>
            </section>
        </main >
    );
}

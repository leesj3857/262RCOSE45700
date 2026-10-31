import { useState, useEffect, useRef } from "react";
import "./Record.css";

// 초 단위 숫자를 "00:07" 형태로 변환
function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
}

export default function Record({ onFinish, onCancel }) {
    const [seconds, setSeconds] = useState(0);
    const [ready, setReady] = useState(false); // 녹음이 실제로 시작됐는지
    const [error, setError] = useState("");

    // useRef: 화면을 다시 그리지 않고 값을 계속 들고 있는 상자
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        let ignore = false; // 화면이 먼저 사라졌는지 표시
        let timer;
        let stream;

        async function startRecording() {
            try {
                // 마이크 권한 요청 (사용자가 허용해야 진행됨)
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                if (ignore) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                const recorder = new MediaRecorder(stream);
                recorderRef.current = recorder;
                chunksRef.current = [];

                // 녹음 데이터가 조각으로 들어올 때마다 모아둠
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                recorder.start();
                setReady(true);

                // 녹음이 시작된 뒤부터 타이머 동작
                timer = setInterval(() => {
                    setSeconds((prev) => prev + 1);
                }, 1000);
            } catch (err) {
                console.error(err);
                setError("마이크를 사용할 수 없어요. 브라우저의 마이크 권한을 확인해 주세요.");
            }
        }

        startRecording();

        // 화면이 사라질 때 정리: 타이머, 녹음기, 마이크 모두 끄기
        return () => {
            ignore = true;
            clearInterval(timer);
            const recorder = recorderRef.current;
            if (recorder && recorder.state !== "inactive") recorder.stop();
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
    }, []);

    function handleFinish() {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return;

        // 녹음이 완전히 멈춘 뒤 조각들을 하나의 파일(Blob)로 합침
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            onFinish(blob);
        };
        recorder.stop();
    }

    return (
        <main className="record-page">
            <section className="record-status">
                <p className="record-time">{formatTime(seconds)}</p>

                {error ? (
                    <p className="record-error">{error}</p>
                ) : (
                    <p className="record-label">{ready ? "듣는 중" : "마이크 준비 중..."}</p>
                )}

                {/* 나중에 실제 소리 크기에 반응하는 파형으로 교체할 자리 */}
                <div className="record-wave" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </section>

            <section className="record-actions">
                <button
                    type="button"
                    className="finish-button"
                    onClick={handleFinish}
                    disabled={!ready}
                >
                    ■ 끝내기
                </button>
                <button type="button" className="cancel-button" onClick={onCancel}>
                    {error ? "돌아가기" : "취소"}
                </button>
            </section>
        </main>
    );
}

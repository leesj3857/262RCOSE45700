import { useEffect, useState } from "react";

const BAR_COUNT = 40;     // 화면에 보일 막대 수
const INTERVAL_MS = 80;   // 몇 ms마다 한 번 측정할지

// 마이크 stream을 받아 "시간순 소리 크기 배열"(0~1)을 돌려주는 훅
export default function useAudioLevels(stream) {
    const [levels, setLevels] = useState(Array(BAR_COUNT).fill(0));

    useEffect(() => {
        if (!stream) return;

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);

        const timer = setInterval(() => {
            // 파형 데이터: 128이 무음(중앙), 멀어질수록 큰 소리
            analyser.getByteTimeDomainData(data);

            // 현재 소리 크기(RMS) 계산
            let sumSquares = 0;
            for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;  // -1 ~ 1
                sumSquares += v * v;
            }
            const rms = Math.sqrt(sumSquares / data.length); // 0 ~ 1
            const level = Math.min(rms * 4, 1);              // 작은 소리를 키움

            // 새 값을 뒤에 추가하고, 맨 앞 값을 제거 (왼쪽으로 밀림)
            setLevels((prev) => [...prev.slice(1), level]);
        }, INTERVAL_MS);

        return () => {
            clearInterval(timer);
            source.disconnect();
            audioContext.close();
        };
    }, [stream]);

    return levels;
}

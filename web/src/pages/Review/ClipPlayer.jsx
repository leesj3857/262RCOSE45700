import { useState, useRef, useEffect } from "react";

export default function ClipPlayer({ url, label }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = new Audio(url);
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;

        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, [url]);

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
        <div className="clip-player">
            <span>{label}</span>
            <button type="button" className="play-button" onClick={handlePlay}>
                {playing ? "■ 정지" : "▶ 재생"}
            </button>
        </div>
    );
}

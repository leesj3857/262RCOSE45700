export default function Waveform({ levels }) {
    return (
        <div className="record-wave" aria-hidden="true">
            {levels.map((v, i) => (
                <span key={i} style={{ transform: `scaleY(${Math.max(v, 0.08)})` }} />
            ))}
        </div>
    );
}

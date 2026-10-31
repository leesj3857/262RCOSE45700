import { useState } from "react";
import Standby from "./pages/Standby/Standby";
import Record from "./pages/Record/Record";

export default function App() {
  const [screen, setScreen] = useState("standby");
  const [audioUrl, setAudioUrl] = useState("");

  function handleStart() {
    setScreen("record");
  }

  function handleFinish(blob) {
    // 브라우저가 실제로 만든 형식과 크기를 확인
    console.log("녹음 형식:", blob.type, "크기:", blob.size);
    setAudioUrl(URL.createObjectURL(blob)); // 재생용 임시 주소
    setScreen("preview");
  }

  function handleCancel() {
    setScreen("standby");
  }

  if (screen === "record") {
    return <Record onFinish={handleFinish} onCancel={handleCancel} />;
  }

  // 임시 재생 확인 화면 (A3 만들면 삭제)
  if (screen === "preview") {
    return (
      <main style={{ padding: 24 }}>
        <p>녹음 확인용 임시 화면</p>
        <audio controls src={audioUrl} />
        <br />
        <button type="button" onClick={() => setScreen("standby")}>
          처음으로
        </button>
      </main>
    );
  }

  return <Standby onStart={handleStart} />;
}

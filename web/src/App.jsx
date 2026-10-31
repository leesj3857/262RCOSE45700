import { useState } from "react";
import Standby from "./pages/Standby/Standby";
import Record from "./pages/Record/Record";
import Review from "./pages/Review/Review";


export default function App() {
  const [screen, setScreen] = useState("standby");
  const [audioClips, setAudioClips] = useState([]);

  function handleStart() {
    setScreen("record");
  }

  function handleFinish(blob) {
    // record로부터 녹음된 결과를 받아서 재생용 URL 배열을 만들고, 화면을 리뷰 화면으로 전환
    console.log("녹음 형식:", blob.type, "크기:", blob.size);
    audioClips.forEach((c) => URL.revokeObjectURL(c.url));
    setAudioClips([{ url: URL.createObjectURL(blob), label: "녹음" }]);
    setScreen("review");
  }

  function handleAddFinish(blob) {
    // 추가녹음을 한 뒤에 재생용 URL 배열에 추가하고, 화면을 리뷰 화면으로 전환
    console.log("추가녹음 형식:", blob.type, "크기:", blob.size);
    setAudioClips((prev) => [
      ...prev,
      { url: URL.createObjectURL(blob), label: `추가 녹음 ${prev.length}` },
    ]);
    setScreen("review");
  }

  function handleCancel() {
    setScreen("standby");
  }

  function handleAddCancel() {
    setScreen("review");
  }

  if (screen === "record") {
    return <Record onFinish={handleFinish} onCancel={handleCancel} />;
  }

  if (screen === "addRecord") {
    return <Record onFinish={handleAddFinish} onCancel={handleAddCancel} />;
  }


  if (screen === "review") {
    return (
      <Review
        audioClips={audioClips}
        onBack={() => setScreen("standby")}
        onAdd={() => setScreen("addRecord")}
      />
    );
  }


  return <Standby onStart={handleStart} />;
}

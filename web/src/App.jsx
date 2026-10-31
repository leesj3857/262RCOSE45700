import { useState } from "react";
import Standby from "./pages/Standby/Standby";
import Record from "./pages/Record/Record";
import Review from "./pages/Review/Review";


export default function App() {
  const [screen, setScreen] = useState("standby");
  const [audioUrl, setAudioUrl] = useState("");

  function handleStart() {
    setScreen("record");
  }

  function handleFinish(blob) {
    // record로부터 녹음된 결과를 받아서 재생용 URL을 만들고, 화면을 리뷰 화면으로 전환
    console.log("녹음 형식:", blob.type, "크기:", blob.size);
    setAudioUrl(URL.createObjectURL(blob)); // 재생용 임시 주소
    setScreen("review");
  }

  function handleCancel() {
    setScreen("standby");
  }

  if (screen === "record") {
    return <Record onFinish={handleFinish} onCancel={handleCancel} />;
  }


  if (screen === "review") {
    return (
      <Review
        audioUrl={audioUrl}
        onBack={() => setScreen("standby")}
      />
    );
  }


  return <Standby onStart={handleStart} />;
}

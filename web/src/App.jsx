import { useState } from "react";
import Standby from "./pages/Standby/Standby";
import Record from "./pages/Record/Record";

export default function App() {
  // "standby"면 A1, "record"이면 A2를 보여줌
  const [screen, setScreen] = useState("standby");

  function handleStart() {
    setScreen("record");
  }

  function handleFinish() {
    // 나중에 녹음 파일을 받아 A3로 넘길 자리
    console.log("녹음 종료");
    setScreen("standby");
  }

  function handleCancel() {
    console.log("녹음 취소");
    setScreen("standby");
  }

  if (screen === "record") {
    return <Record onFinish={handleFinish} onCancel={handleCancel} />;
  }

  return <Standby onStart={handleStart} />;
}

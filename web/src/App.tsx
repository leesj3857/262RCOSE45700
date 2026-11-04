import { useState } from "react";
import Standby from "@/screens/Standby/Standby";
import Record from "@/screens/Record/Record";
import Review from "@/screens/Review/Review";
import Dashboard from "@/screens/Dashboard/Dashboard";
import { useHashRoute } from "@/lib/useHashRoute";
import type { AudioClip } from "@/types/report";

type Screen = "standby" | "record" | "addRecord" | "review";

/** 대기 → 녹음 → 기록 확인 화면 전환을 관리 */
export default function App() {
  const [screen, setScreen] = useState<Screen>("standby");
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const route = useHashRoute();

  function clearClips() {
    audioClips.forEach((c) => URL.revokeObjectURL(c.url));
    setAudioClips([]);
  }

  function handleFinish(blob: Blob, durationSec: number) {
    // 녹음 결과로 재생용 URL을 만들고 기록 확인 화면으로 전환
    console.log("녹음 형식:", blob.type, "크기:", blob.size);
    audioClips.forEach((c) => URL.revokeObjectURL(c.url));
    setAudioClips([{ url: URL.createObjectURL(blob), label: "녹음", durationSec }]);
    setScreen("review");
  }

  function handleAddFinish(blob: Blob, durationSec: number) {
    // 추가 녹음을 재생용 URL 배열에 덧붙이고 기록 확인 화면으로 전환
    console.log("추가녹음 형식:", blob.type, "크기:", blob.size);
    setAudioClips((prev) => [
      ...prev,
      { url: URL.createObjectURL(blob), label: `추가 녹음 ${prev.length}`, durationSec },
    ]);
    setScreen("review");
  }

  function handleDeleteAndBack() {
    clearClips();
    setScreen("standby");
  }

  if (route.path.startsWith("/admin")) {
    return <Dashboard route={route} />;
  }

  if (screen === "record") {
    return <Record onFinish={handleFinish} onCancel={() => setScreen("standby")} />;
  }

  if (screen === "addRecord") {
    return <Record onFinish={handleAddFinish} onCancel={() => setScreen("review")} />;
  }

  if (screen === "review") {
    return (
      <Review
        audioClips={audioClips}
        onBack={handleDeleteAndBack}
        onAdd={() => setScreen("addRecord")}
      />
    );
  }

  return <Standby onStart={() => setScreen("record")} />;
}

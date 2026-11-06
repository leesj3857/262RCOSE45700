import { useCallback, useMemo, useRef, useState, type ComponentType, type Ref } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import RawWebView, { type WebViewProps } from "react-native-webview";

type WebHandle = { reload: () => void };

const WebView = RawWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebHandle> }>;

const WEB_PORT = 5173;
const START_PATH = "/#/admin";
const BG = "#f2f3f6";

function devHost(): string | null {
  const uri = Constants.expoConfig?.hostUri ?? "";
  const host = uri.split(":")[0];
  return host || null;
}

export default function App() {
  const host = useMemo(devHost, []);
  const url = host ? `http://${host}:${WEB_PORT}${START_PATH}` : null;
  const ref = useRef<WebHandle>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const retry = useCallback(() => {
    setFailed(false);
    setLoading(true);
    ref.current?.reload();
  }, []);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>개발 서버 주소를 찾지 못했어요</Text>
        <Text style={styles.body}>Expo를 npm start로 실행한 뒤 QR 코드로 다시 열어 주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>화면을 불러오지 못했어요</Text>
          <Text style={styles.body}>{url}</Text>
          <Pressable onPress={retry} style={styles.button}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={ref}
          source={{ uri: url }}
          style={styles.web}
          containerStyle={styles.web}
          originWhitelist={["*"]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          bounces={false}
          overScrollMode="never"
          allowsBackForwardNavigationGestures={false}
          decelerationRate={Platform.OS === "ios" ? 0.998 : undefined}
          onLoadEnd={() => setLoading(false)}
          onError={() => setFailed(true)}
          onHttpError={() => setFailed(true)}
        />
      )}
      {loading && !failed && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#191919" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: BG, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#191919", textAlign: "center" },
  body: { fontSize: 14, color: "#4a4f58", textAlign: "center" },
  button: { marginTop: 8, height: 48, paddingHorizontal: 28, borderRadius: 24, backgroundColor: "#fee500", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 15, fontWeight: "800", color: "#191919" },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: BG },
});

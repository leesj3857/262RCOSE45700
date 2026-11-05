import { useEffect } from "react";
import Dashboard from "@/screens/Dashboard/Dashboard";
import Demo from "@/screens/Demo/Demo";
import { useHashRoute, navigate } from "@/lib/useHashRoute";

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    if (route.path === "/") navigate("/admin", true);
  }, [route.path]);

  if (route.path.startsWith("/demo")) {
    return <Demo />;
  }

  return <Dashboard route={route} />;
}

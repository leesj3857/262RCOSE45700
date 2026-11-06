import { useEffect, useState } from "react";

export type HashRoute = {
  path: string;
  params: URLSearchParams;
};

function read(): HashRoute {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  return { path, params: new URLSearchParams(query) };
}

export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState<HashRoute>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function navigate(to: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", `#${to}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = to;
}

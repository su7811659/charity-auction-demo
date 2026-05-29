import { useEffect, useState } from "react";

function useSystemTheme() {
  // XXX: theme handling
  const getTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "light";

  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const changeTheme = () => setTheme(getTheme());

    mediaQuery.addEventListener("change", changeTheme);
    return () => mediaQuery.removeEventListener("change", changeTheme);
  }, []);

  return theme;
}

export default useSystemTheme;
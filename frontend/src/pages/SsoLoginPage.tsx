import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const SsoLoginPage = () => {
  const navigate = useNavigate();
  const { setShowAuthDialog } = useContext(AuthContext);

  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("HTTP_COOKIE");
    console.log("window.location.href:", window.location.href);

    if (!raw || !raw.startsWith("key=")) {
      alert(`未提供合法登入資訊 ${url} ${raw}`);
      navigate("/");
      return;
    }

    const decoded = decodeURIComponent(raw); // 解碼 URL，例如 key=$xxx...

    document.cookie = `${decoded}; path=/`;

    axios
      .post("/api/auth/sso", {
        cookie: decoded,
      })
      .then((res) => {
        localStorage.setItem("jwt", res.data.token);
        setShowAuthDialog(false); // 確保關閉 AuthDialog
        navigate("/");
        // 延遲一點時間後重新整理，確保 AuthContext 更新
        setTimeout(() => {
          window.location.reload();
        }, 100);
      })
      .catch((err) => {
        console.error(err);
        alert(`登入失敗 ${err}`);
        navigate("/");
      });
  }, [navigate, setShowAuthDialog]);

  return <div>登入中，請稍候...</div>;
};

export default SsoLoginPage;

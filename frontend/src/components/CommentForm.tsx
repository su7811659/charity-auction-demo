import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  loading?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, loading }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError(t("留言內容不可空白"));
      return;
    }
    setError("");
    await onSubmit(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          resize: "vertical",
          padding: "12px",
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          fontSize: "14px",
          fontFamily: "inherit",
          backgroundColor: "#ffffff",
          color: "#333333"
        }}
        placeholder={t("寫下你的留言...")}
        disabled={loading}
      />
      {error && <div style={{ color: "red", marginBottom: 8, fontSize: "14px" }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 8,
          background: "#1890ff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? t("送出中...") : t("送出留言")}
      </button>
    </form>
  );
};

export default CommentForm;

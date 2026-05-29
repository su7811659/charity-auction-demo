"""Demo-mode helpers.

This portfolio demo is designed to run WITHOUT a real OpenAI key. These helpers
let the AI-powered features degrade gracefully (canned responses) instead of
erroring out, so the public demo never burns API credits or crashes.

Set a real key in the environment (OPENAI_API_KEY=sk-...) to enable the full
AI behaviour.
"""
from config import settings


def ai_enabled() -> bool:
    """True only when a real OpenAI API key is configured."""
    key = (settings.OPENAI_API_KEY or "").strip()
    return key.startswith("sk-")


def demo_chat_response() -> str:
    """Canned reply in the same '{ids}|text' format generate_response uses."""
    return (
        "{ }|嗨～我是 AI 小助理 🤖 目前為 Demo 模式，AI 語意搜尋為示範回應。"
        "你可以直接瀏覽下方的商品列表，或到「商品列表」逛逛所有義賣品 🛍️ "
        "（正式版會以 OpenAI 做語意搜尋與個人化推薦）"
    )

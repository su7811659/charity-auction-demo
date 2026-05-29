"""
市集新聞服務 - 撷取昨天資料並生成新聞摘要
"""

from datetime import datetime, timedelta, date, timezone
import sqlite3
import json
import requests
from config import settings
import os

OPENAI_API_KEY = settings.OPENAI_API_KEY

def create_news_cache_table(conn):
    """創建新聞快取表"""
    cursor = conn.execute("""
        CREATE TABLE IF NOT EXISTS news_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_date TEXT UNIQUE NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

def get_cached_news(conn, news_date):
    """獲取快取的新聞"""
    cursor = conn.execute("""
        SELECT content FROM news_cache 
        WHERE news_date = ?
    """, (news_date,))
    result = cursor.fetchone()
    return result[0] if result else None

def cache_news(conn, news_date, content):
    """快取新聞內容"""
    cursor = conn.execute("""
        INSERT OR REPLACE INTO news_cache (news_date, content)
        VALUES (?, ?)
    """, (news_date, content))
    conn.commit()

def clear_all_news_cache(conn):
    """清除所有新聞緩存"""
    cursor = conn.execute("SELECT COUNT(*) FROM news_cache")
    count_before = cursor.fetchone()[0]
    
    cursor = conn.execute("DELETE FROM news_cache")
    conn.commit()
    
    return count_before

async def clear_news_cache():
    """清除新聞緩存的異步接口"""
    # 連接資料庫
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.db')
    conn = sqlite3.connect(db_path)
    
    try:
        # 確保新聞快取表存在
        create_news_cache_table(conn)
        
        # 清除所有緩存
        cleared_count = clear_all_news_cache(conn)
        
        return {
            "success": True,
            "cleared_count": cleared_count
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "cleared_count": 0
        }
    finally:
        conn.close()

def get_taiwan_yesterday():
    """獲取台灣時間昨天的日期範圍"""
    # 台灣時間 UTC+8
    taiwan_offset = timedelta(hours=8)
    utc_now = datetime.utcnow()
    taiwan_now = utc_now + taiwan_offset
    
    # 昨天的日期範圍
    yesterday = taiwan_now.date() - timedelta(days=1)
    yesterday_start = datetime.combine(yesterday, datetime.min.time()) - taiwan_offset
    yesterday_end = datetime.combine(yesterday, datetime.max.time()) - taiwan_offset
    
    return yesterday_start, yesterday_end, yesterday

def collect_yesterday_data(conn):
    """收集昨天的所有活動資料"""
    yesterday_start, yesterday_end, yesterday_date = get_taiwan_yesterday()
    
    data = {
        "date": yesterday_date.strftime("%Y-%m-%d"),
        "taiwan_date": yesterday_date.strftime("%Y年%m月%d日"),
        "site_launch_date": "2025-08-26",  # 網站上線日
        "event_date": "2025-09-23",      # 現場活動日
    }
    
    # 1. 新上架商品
    cursor = conn.execute("""
        SELECT COUNT(*) as count
        FROM products 
        WHERE created_at BETWEEN ? AND ?
        AND is_approve = 1
    """, (yesterday_start, yesterday_end))
    new_products_count = cursor.fetchone()[0]
    
    # 取得商品範例
    cursor = conn.execute("""
        SELECT product_name, price
        FROM products 
        WHERE created_at BETWEEN ? AND ?
        AND is_approve = 1
        LIMIT 3
    """, (yesterday_start, yesterday_end))
    products_examples = cursor.fetchall()
    examples_text = ", ".join([f"{name} (NT${price})" for name, price in products_examples])
    
    data["new_products"] = {
        "count": new_products_count or 0,
        "examples": examples_text
    }
    
    # 2. 交易活動
    cursor = conn.execute("""
        SELECT deal_status, COUNT(*) as count
        FROM online_deals 
        WHERE created_time BETWEEN ? AND ?
        GROUP BY deal_status
    """, (yesterday_start, yesterday_end))
    deals_data = cursor.fetchall()
    
    deals_summary = {"total": 0, "approved": 0, "pending": 0, "rejected": 0}
    for status, count in deals_data:
        deals_summary["total"] += count
        if status == 1:
            deals_summary["approved"] = count
        elif status == 0:
            deals_summary["pending"] = count
        elif status in [2, 3]:
            deals_summary["rejected"] += count
    
    data["deals"] = deals_summary
    
    # 3. 社群互動
    cursor = conn.execute("""
        SELECT COUNT(*) FROM comments 
        WHERE created_at BETWEEN ? AND ?
    """, (yesterday_start, yesterday_end))
    comments_count = cursor.fetchone()[0]
    
    cursor = conn.execute("""
        SELECT COUNT(*) FROM comment_reactions 
        WHERE created_at BETWEEN ? AND ?
    """, (yesterday_start, yesterday_end))
    reactions_count = cursor.fetchone()[0]
    
    data["community"] = {
        "comments": comments_count or 0,
        "reactions": reactions_count or 0
    }
    
    # 4. 新用戶註冊
    cursor = conn.execute("""
        SELECT COUNT(*) FROM users 
        WHERE created_at BETWEEN ? AND ?
    """, (yesterday_start, yesterday_end))
    new_users = cursor.fetchone()[0]
    
    data["new_users"] = new_users or 0
    
    # 5. AI 使用統計
    cursor = conn.execute("""
        SELECT SUM(rewrite_count) FROM ai_usage 
        WHERE usage_date = ?
    """, (yesterday_date,))
    ai_usage_result = cursor.fetchone()[0]
    
    data["ai_usage"] = ai_usage_result or 0
    
    # 6. 熱門商品 (最多讚的商品)
    cursor = conn.execute("""
        SELECT p.product_name, p.price, COUNT(l.id) as like_count
        FROM products p
        LEFT JOIN likes l ON p.id = l.product_id
        WHERE p.created_at BETWEEN ? AND ?
        AND p.is_approve = 1
        GROUP BY p.id
        ORDER BY like_count DESC
        LIMIT 3
    """, (yesterday_start, yesterday_end))
    popular_products = cursor.fetchall()
    
    data["popular_products"] = [
        {"name": name, "price": price, "likes": likes} 
        for name, price, likes in popular_products
    ]
    
    return data

def generate_news_summary(data):
    """使用 OpenAI 生成新聞摘要（支援上架日 / 倒數10天 / 一般日）"""
    # === 時區與日期處理（台灣時間） ===
    TPE = timezone(timedelta(hours=8))
    now_tpe = datetime.now(TPE)
    taiwan_today = now_tpe.date()
    taiwan_today_str = taiwan_today.strftime("%Y年%m月%d日")

    # 入參日期（ISO 字串）→ date
    site_launch_date = date.fromisoformat(data.get("site_launch_date")) if data.get("site_launch_date") else None
    event_date = date.fromisoformat(data.get("event_date")) if data.get("event_date") else None

    # 情境判斷
    is_launch_day = (site_launch_date is not None and taiwan_today == site_launch_date)
    days_to_event = (event_date - taiwan_today).days if event_date else None
    is_countdown_10 = (days_to_event == 10)

    # 讓 LLM 知道「模式」
    mode = "launch" if is_launch_day else ("countdown10" if is_countdown_10 else "normal")

    # 友善處理熱門商品範例（list 或 str 都可）
    examples = data["new_products"].get("examples")
    if isinstance(examples, (list, tuple)):
        examples_text = "、".join(map(str, examples[:3])) if examples else "（無）"
    else:
        examples_text = examples or "（無）"

    # ---- Prompt 建構 ----
    # 人設 + 風格護欄
    persona_block = f"""
你是 BidForGood 公益市集的吉祥物「AI 小助理」，個性幽默、淘氣、愛開玩笑，
但此刻你要用「專業記者的口吻」播報，要先自我介紹然後講一下今天的日期。語氣：溫暖、正能量、帶一點俏皮。
用第一人稱（我）敘述，允許適度使用 emoji。不要加標題，直接出內文。
篇幅 200～300 字，分成 2～4 個短段落，避免流水帳列點。
"""

    # 共同資料（給模型用的事實）
    facts_block = f"""
【今天（台灣時間）】{taiwan_today_str}
【昨日日期】{data['taiwan_date']}
【昨日數據】
- 新上架商品：{data['new_products']['count']} 件
- 交易活動：總 {data['deals']['total']} 筆（成功 {data['deals']['approved']}、等待中 {data['deals']['pending']}）
- 社群互動：{data['community']['comments']} 則留言、{data['community']['reactions']} 個反應
- 新用戶：{data['new_users']} 位
- AI 重寫使用：{data['ai_usage']} 次
- 熱門商品範例：{examples_text}
【重點時程】
- 網站上線日：{data.get('site_launch_date','（未提供）')}
- 現場活動日：{data.get('event_date','（未提供）')}
- 距現場活動天數：{days_to_event if days_to_event is not None else '（未知）'}
【BidForGood的公司辦公室名稱 (樓層 / 辦公室名稱 / 特色(有的話再填寫))】
    o 七樓
        - 悠遊峇里島： 是一間裡面有按摩椅的小小空間，同事可以上行事曆進行按摩椅的預約，一個人最多半小時。
        - 飛越太平洋： 這是公司七樓第二大的會議室，中午便當團訂的便當都會放在這裡。
        - 破曉淡水河：
        - 眺望擎天崗：
        - 榮耀富士山：
        - 擁抱陽明山： 公司七樓偏大的辦公室，比夏威夷小，平常會在這邊舉辦主管會議、教育訓練等活動。
        - 深潛大堡礁： 好小好小的空間，用來講電話用的
    o 六樓
        - 夏威夷：是公司最大的辦公室，一個月一次板凳大會會在這邊舉辦，全公司的人都會來參加。
"""

    # 三種模式的寫作要求差異
    if mode == "launch":
        task_block = """
【寫作任務（上架日）】
- 不要回顧昨日交易與數據。
- 聚焦「今天網站正式上線」，邀請大家上傳商品、然後可以去看看網站的各個入口
    * 包含：
        商品列表
            就是展示所有已審核過的商品的地方
            點擊後可以進到商品細節頁並且可以看 AI 小助理給了這個商品的AI鑑定報告跟等級(普通，精良，史詩，傳說，神話)
        商品上傳
            提供AI商品描述改寫的功能，一天上限五次
            要提醒他們記得填寫商品捐贈比例，有捐贈並成交的商品才會出現在畫面右上角的大善人排行榜上
        活動指南
            理念初心: 為什麼esg小組要辦這個活動的原因
            活動詳程: 公益市集活動相關的時程
            參與指引: 賣家和買家應該要知道的事情
            捐贈機構: 最後累積起來的捐贈款會捐給這些機構(南迴基金會和家扶基金會)
            獎勵機制: 分成 "員工公益獎勵" 和 "公益倍倍捐款配對"
        個人中心
            可以設定大頭貼、觀看自己購買及上架的商品、觀看自己收藏的商品、也可以透過(實名模式/匿名模式)來回饋給ESG小組關於活動與網站的一切
- 以輕鬆熱鬧的記者播報口吻，點出平台精神與玩法，鼓勵首次參與者。
- 結尾加入行動呼籲：上架商品、參與互動、關注後續活動資訊。
- 最後要讓AI小助手說自己在哪一個 BidForGood的公司辦公室進行報導(請用公正的隨機方式隨意抽取一個辦公室，不要只挑有描述的)，也可以對該辦公室進行一點著墨，"小助手在XXX的報導"
"""
    elif mode == "countdown10":
        task_block = """
【寫作任務（距現場活動 10 天）】
- 正常回顧昨日活動情形與熱度。
- 加入「倒數 10 天」的期待與號召，營造迎接現場活動的熱身氣氛。
- 結尾加入行動呼籲：上架商品、參與互動、關注現場活動資訊。
- 最後要讓AI小助手說自己在哪一個 BidForGood的公司辦公室進行報導(請用公正的隨機方式隨意抽取一個辦公室，不要只挑有描述的)，也可以對該辦公室進行一點著墨，比如"小助手在XXX的報導"
"""
    else:
        task_block = """
【寫作任務（一般日）】
- 以今天的視角回顧昨日活動，用記者播報口吻敘述亮點與溫暖瞬間。
- 自然穿插 AI 小助理的淘氣吐槽，但保持尊重與友善。
- 若無人上傳商品的話叫記得繼續推廣他們上傳。
- 收尾加入輕量行動呼籲：多上傳、多互動、一起把善意放大。
- 最後要讓AI小助手說自己在哪一個 BidForGood的公司辦公室進行報導(請用公正的隨機方式隨意抽取一個辦公室，不要只挑有描述的)，也可以對該辦公室進行一點著墨，比如"小助手在XXX的報導"
"""

    prompt = f"""
{persona_block}
{facts_block}
{task_block}
【寫作規則】
- 只能使用已提供的日期與數字，不要臆測或虛構新數據。
- 語氣溫暖真誠、帶點俏皮；可適度使用 emoji；不要使用制式新聞標題。
- 400 ~ 500 字；分 2～4 段；自然口語，不要清單文。
- 角色要明確：我是 AI 小助理，但此刻以記者的播報口吻說話。
- 你對話的對象是 BidForGood 的同事們，請用友善的語氣與他們互動。
"""
    
    print(prompt)
    
    try:
        from services.ai_demo import ai_enabled
        if not ai_enabled():
            # Demo 模式：略過 OpenAI 呼叫，直接走下方依情境的 fallback 文案
            raise RuntimeError("AI disabled (demo mode)")
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            # 新模型建議（你也可用 gpt-4o，品質更高）
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "你的名字是 AI 小助理，在這裡你是溫暖、專業、帶點幽默的新聞記者。"},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 800,
            "temperature": 0.7
        }
        print(prompt)
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=20  # 硬性超時，避免偶發卡線
        )
        if resp.status_code == 200:
            result = resp.json()
            news = result["choices"][0]["message"]["content"].strip()
            return news

        raise Exception(f"OpenAI API 錯誤: {resp.status_code} {resp.text[:200]}")

    except Exception:
        # === Fallback（依情境回應，不是單一模板）===
        if mode == "launch":
            return (
                f"今天是 {taiwan_today_str}，我們正式把愛心市集的線上會場點亮啦！🎉 我這位 AI 小助理先來開場報告："
                "從現在起，大家可以上傳想割愛的寶物、體驗線上交易與留言互動，讓善意在網路裡先暖起來。"
                "接下來幾週還有更多活動資訊釋出，快邀朋友一起來逛、來玩，讓每一次出手，都化作更遠的溫柔。"
            )
        elif mode == "countdown10":
            return (
                f"今天是 {taiwan_today_str}，距離現場公益活動倒數 10 天！⏳ 昨天的市集依舊熱鬧，大家上架、留言、互動都很給力。"
                "我這位 AI 小助理用記者口吻鄭重宣布：暖身衝刺開始！把想分享的物品上到架上、替喜歡的商品留個言，"
                "讓我們帶著滿滿期待，一起迎接現場的相見歡！"
            )
        else:
            return (
                f"今天是 {taiwan_today_str}，回顧昨日（{data['taiwan_date']}），愛心市集繼續發燙發亮。"
                f"新上架 {data['new_products']['count']} 件、社群互動熱絡，交易也穩穩推進。"
                "我這位 AI 小助理先用記者口吻來一句：謝謝每位把溫柔化成行動的人。"
                "今天也請多多上傳、多多互動，讓善意一路延長！"
            )

async def get_daily_news():
    """獲取每日市集新聞"""
    # 連接資料庫
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.db')
    conn = sqlite3.connect(db_path)
    
    try:
        # 確保新聞快取表存在
        create_news_cache_table(conn)
        
        # 獲取昨天的日期
        _, _, yesterday_date = get_taiwan_yesterday()
        news_date_str = yesterday_date.strftime("%Y-%m-%d")
        
        # 先檢查快取中是否有昨天的新聞
        cached_content = get_cached_news(conn, news_date_str)
        
        if cached_content:
            # 有快取，直接回傳
            return {
                "success": True,
                "data": {
                    "news": {
                        "content": cached_content
                    },
                    "generated_at": datetime.utcnow().isoformat(),
                    "from_cache": True
                }
            }
        
        # 沒有快取，收集昨天的資料
        yesterday_data = collect_yesterday_data(conn)
        
        # 生成新聞摘要
        news_content = generate_news_summary(yesterday_data)
        
        # 快取新聞內容
        cache_news(conn, news_date_str, news_content)
        
        return {
            "success": True,
            "data": {
                "news": {
                    "content": news_content
                },
                "generated_at": datetime.utcnow().isoformat(),
                "from_cache": False
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": None
        }
    finally:
        conn.close()

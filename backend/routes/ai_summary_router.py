"""
AI 總結報告生成 API
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import sqlite3
import os
import json
import openai
from config import settings
from database import SessionLocal
from services.system_config_service import SystemConfigService
from services.auth_service import get_current_user
from utils.logger import Logger

router = APIRouter(prefix="/api/ai-summary", tags=["ai-summary"])

logger = Logger.get_logger(logger_name="ai_summary_router")

class AISummaryResponse(BaseModel):
    content: str
    generated_at: str
    cache_key: str

def get_db():
    """獲取資料庫 Session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_connection():
    """獲取資料庫連接"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.db')
    return sqlite3.connect(db_path)

def get_summary_data():
    """獲取所有統計數據用於生成AI總結"""
    conn = get_database_connection()
    cursor = conn.cursor()
    
    # 獲取商品統計（只計算已審核通過的商品）
    cursor.execute("""
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN buyer_name IS NOT NULL THEN 1 END) as sold_products,
            SUM(COALESCE(donation_amount, 0)) as total_donation,
            COUNT(DISTINCT seller_name) as total_sellers,
            AVG(COALESCE(donation_amount, 0)) as avg_donation
        FROM products
        WHERE is_approve = 1
    """)
    stats = cursor.fetchone()
    
    # 獲取最受歡迎的商品（只計算已審核通過的商品）
    cursor.execute("""
        SELECT p.product_name, p.description, COUNT(l.id) as like_count
        FROM products p
        LEFT JOIN likes l ON p.id = l.product_id
        WHERE p.is_approve = 1
        GROUP BY p.id, p.product_name, p.description
        ORDER BY like_count DESC
        LIMIT 3
    """)
    top_products = cursor.fetchall()
    
    # 獲取討論度最高的商品（按留言數排序，只計算已審核通過的商品）
    cursor.execute("""
        SELECT p.product_name, p.description, COUNT(c.id) as comment_count
        FROM products p
        LEFT JOIN comments c ON p.id = c.product_id
        WHERE p.is_approve = 1
        GROUP BY p.id, p.product_name, p.description
        ORDER BY comment_count DESC
        LIMIT 3
    """)
    top_commented_products = cursor.fetchall()
    
    # 獲取最活躍的捐款者（只計算已審核通過的商品）
    cursor.execute("""
        SELECT 
            seller_name, 
            (SELECT seller_nickname FROM products p2 
             WHERE p2.seller_name = p1.seller_name AND p2.is_approve = 1 
             ORDER BY p2.id ASC LIMIT 1) as seller_nickname,
            SUM(donation_amount) as total_donation, 
            COUNT(*) as product_count
        FROM products p1
        WHERE donation_amount > 0 AND is_approve = 1
        GROUP BY seller_name
        ORDER BY total_donation DESC
        LIMIT 3
    """)
    top_donors = cursor.fetchall()
    
    # 獲取彩蛋統計
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN easter_egg = 1 THEN 1 END) as easter_egg_users,
            SUM(COALESCE(robot_tickle_count, 0)) as total_tickles
        FROM users
    """)
    user_stats = cursor.fetchone()
    
    # 獲取留言統計
    cursor.execute("""
        SELECT COUNT(*) as total_comments
        FROM comments
    """)
    comment_stats = cursor.fetchone()
    
    # 獲取創世商品統計 (ai_rating 等級商品)
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN ai_rating = 3 THEN 1 END) as epic_count,
            COUNT(CASE WHEN ai_rating = 4 THEN 1 END) as legendary_count,
            COUNT(CASE WHEN ai_rating = 5 THEN 1 END) as mythical_count
        FROM products
        WHERE is_approve = 1 AND ai_rating >= 3
    """)
    legendary_stats = cursor.fetchone()
    
    # 獲取第一個史詩級商品
    cursor.execute("""
        SELECT product_name, description, seller_nickname, created_at
        FROM products
        WHERE is_approve = 1 AND ai_rating = 3
        ORDER BY created_at ASC
        LIMIT 1
    """)
    first_epic = cursor.fetchone()
    
    # 獲取第一個傳說級商品
    cursor.execute("""
        SELECT product_name, description, seller_nickname, created_at
        FROM products
        WHERE is_approve = 1 AND ai_rating = 4
        ORDER BY created_at ASC
        LIMIT 1
    """)
    first_legendary = cursor.fetchone()
    
    # 獲取第一個神話級商品
    cursor.execute("""
        SELECT product_name, description, seller_nickname, created_at
        FROM products
        WHERE is_approve = 1 AND ai_rating = 5
        ORDER BY created_at ASC
        LIMIT 1
    """)
    first_mythical = cursor.fetchone()
    
    # 獲取點閱率最高的商品前三名
    cursor.execute("""
        SELECT p.product_name, p.description, p.seller_nickname, COALESCE(p.view_count, 0) as view_count
        FROM products p
        WHERE p.is_approve = 1
        ORDER BY COALESCE(p.view_count, 0) DESC, p.id DESC
        LIMIT 3
    """)
    top_viewed_products = cursor.fetchall()
    
    # 獲取白金獎盃成就用戶統計
    cursor.execute("""
        SELECT COUNT(*) as platinum_users_count
        FROM user_achievements ua
        WHERE ua.achievement_id = 'platinum_trophy' AND ua.is_unlocked = 1
    """)
    platinum_stats = cursor.fetchone()
    
    # 獲取白金獎盃成就用戶詳細信息（前5名）
    cursor.execute("""
        SELECT u.email, ua.unlocked_at, p.seller_nickname
        FROM user_achievements ua
        JOIN users u ON ua.user_id = u.id
        LEFT JOIN (
            SELECT seller_name, seller_nickname, 
                   ROW_NUMBER() OVER (PARTITION BY seller_name ORDER BY id ASC) as rn
            FROM products
        ) p ON u.email = p.seller_name AND p.rn = 1
        WHERE ua.achievement_id = 'platinum_trophy' AND ua.is_unlocked = 1
        ORDER BY ua.unlocked_at ASC
        LIMIT 5
    """)
    platinum_users = cursor.fetchall()
    
    conn.close()
    
    return {
        "stats": {
            "total_products": stats[0] if stats else 0,
            "sold_products": stats[1] if stats else 0,
            "total_donation": stats[2] if stats else 0,
            "total_sellers": stats[3] if stats else 0,
            "avg_donation": stats[4] if stats else 0
        },
        "top_products": [{"name": p[0], "description": p[1], "likes": p[2]} for p in top_products],
        "top_commented_products": [{"name": p[0], "description": p[1], "comments": p[2]} for p in top_commented_products],
        "top_viewed_products": [{"name": p[0], "description": p[1], "seller": p[2], "views": p[3]} for p in top_viewed_products],
        "top_donors": [{"seller_name": d[0], "seller_nickname": d[1], "donation": d[2], "products": d[3]} for d in top_donors],
        "user_stats": {
            "easter_egg_users": user_stats[0] if user_stats else 0,
            "total_tickles": user_stats[1] if user_stats else 0
        },
        "total_comments": comment_stats[0] if comment_stats else 0,
        "platinum_achievement": {
            "total_users": platinum_stats[0] if platinum_stats else 0,
            "users": [
                {
                    "email": user[0],
                    "unlocked_at": user[1],
                    "nickname": user[2] if user[2] else user[0].split('@')[0]
                } for user in platinum_users
            ]
        },
        "legendary_products": {
            "epic_count": legendary_stats[0] if legendary_stats else 0,
            "legendary_count": legendary_stats[1] if legendary_stats else 0,
            "mythical_count": legendary_stats[2] if legendary_stats else 0,
            "first_epic": {
                "name": first_epic[0],
                "description": first_epic[1], 
                "seller": first_epic[2],
                "created_at": first_epic[3]
            } if first_epic else None,
            "first_legendary": {
                "name": first_legendary[0],
                "description": first_legendary[1],
                "seller": first_legendary[2], 
                "created_at": first_legendary[3]
            } if first_legendary else None,
            "first_mythical": {
                "name": first_mythical[0],
                "description": first_mythical[1],
                "seller": first_mythical[2],
                "created_at": first_mythical[3]
            } if first_mythical else None
        }
    }

def generate_ai_summary(data):
    """使用 OpenAI 生成幽默風趣的總結報告（含吉祥物與彩蛋設定）"""
    print("=== generate_ai_summary 開始執行 ===")
    print(f"輸入數據: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    logger.info("=== generate_ai_summary 開始執行 ===")
    logger.info(f"輸入數據: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    try:
        # 設置 OpenAI API 金鑰
        openai.api_key = settings.OPENAI_API_KEY
        print("OpenAI API Key 已設置")
        logger.info("OpenAI API Key 已設置")

        prompt = f"""
你是 BidForGood 公益市集的 AI 小助理（同時是吉祥物「愛心覺羅」的損友兼代言人）。
請根據「活動資訊」生成一份約 1500 字以上的幽默溫暖總結報告，語氣像朋友聊天，並要真誠感謝參與者。

【固定世界觀設定，必須自然融入文內，不要違反】
1) 活動名稱是BidForGood的ESG小組舉辦的"BidForGood公益市集"，活動流程是8/26，公益市集網站上架，到9/23當天會有一個現場的市集活動。
2) 前期(8/26~9/22)只有公益市集網站架設，沒有實體攤位／現場叫賣等劇情。
3) 愛心覺羅是無口角色（不說話、用眼神溝通），你（AI 小助理）是他損友與發聲管道。
4) 他第一次「正式亮相」是在「公益市集網站的活動指南頁」與公司「公司入口 的快捷連結」圖示上，用來導流到市集網站。
5) 特殊彩蛋：使用者連續點擊「活動指南頁」的愛心覺羅「10 下」會觸發彩蛋。觸發後他因為害羞會「召喚你」出來介紹他（請把這點寫成可愛的事件描述），不要寫成隨機賣萌或其他行為。
6) 不要捏造任何「過去實體市集」的事；資料時間線以本次網站為主。
7) 可以適度使用 emoji，但不要過量；整體保持溫暖又帶點調皮的損友吐槽風格。
8) 公司倍倍配對金額指的是公司會出跟總捐款金額一樣的金額給公益善款捐贈單位，但上限是20000，超過的話執行長 會額外加碼超出 20000 的部分。
9) 如果有超出就要感謝 執行長捐贈他的生活費把愛心放大； 沒有的話就要表達極度惋惜的樣子，並說下次還有機會讓 執行長捐光他的生活費。

【活動資訊】
- 商品總數：{data['stats']['total_products']} 件
- 已售出商品：{data['stats']['sold_products']} 件
- 總捐款金額：NT$ {data['stats']['total_donation']:.0f}
- 公司倍倍配對金額：NT$ {data['stats']['total_donation']:.0f}
- 執行長 額外加碼金額: NT$ {max(0, data['stats']['total_donation'] - 20000):.0f}
- 參與賣家：{data['stats']['total_sellers']} 位
- 總留言數：{data['total_comments']} 則
- 愛心覺羅彩蛋發現者：{data['user_stats']['easter_egg_users']} 位
- AI 小助理被使用者搔癢的次數（點我 / 戳我等互動）：{data['user_stats']['total_tickles']} 次
- 公益善款捐贈單位: 家扶基金會 和 南迴基金會
- 捐款目標: 20000


【排行榜資料】
熱門商品前三名（按讚數）：
{chr(10).join([f"- {p['name']}（{p['likes']} 個讚）- 描述：{p['description']}" for p in data['top_products']])}

討論度最高商品前三名（按留言數）：
{chr(10).join([f"- {p['name']}（{p['comments']} 則留言）- 描述：{p['description']}" for p in data['top_commented_products']])}

點閱率最高商品前三名（按觀看次數）：
{chr(10).join([f"- {p['name']}（{p['views']} 次觀看）by {p['seller']} - 描述：{p['description']}" for p in data['top_viewed_products']])}

大善人排行榜前三名：
{chr(10).join([f"- {d['seller_nickname']}({d['seller_name'].split('@')[0]})：NT$ {d['donation']:.0f}（{d['products']} 件商品）" for d in data['top_donors']])}

【BidForGood公益市集白金獎盃資訊】- 這是開發者設計的10個成就都解完的人才有的殊榮
白金獎盃達成者總數：{data['platinum_achievement']['total_users']} 位
{"白金獎盃榮耀者（前5名，按達成時間排序）：" + chr(10) + chr(10).join([f"- {user['nickname']}({user['email'].split('@')[0]}) - 達成時間：{user['unlocked_at']}" for user in data['platinum_achievement']['users']]) if data['platinum_achievement']['users'] else "目前暫無白金獎盃達成者"}

【創世商品資訊】
史詩級商品：全系統共 {data['legendary_products']['epic_count']} 個
{"第一個史詩級商品：" + data['legendary_products']['first_epic']['name'] + "（by " + data['legendary_products']['first_epic']['seller'] + "）- " + data['legendary_products']['first_epic']['description'] if data['legendary_products']['first_epic'] else "尚無史詩級商品"}

傳說級商品：全系統共 {data['legendary_products']['legendary_count']} 個  
{"第一個傳說級商品：" + data['legendary_products']['first_legendary']['name'] + "（by " + data['legendary_products']['first_legendary']['seller'] + "）- " + data['legendary_products']['first_legendary']['description'] if data['legendary_products']['first_legendary'] else "尚無傳說級商品"}

神話級商品：全系統共 {data['legendary_products']['mythical_count']} 個
{"第一個神話級商品：" + data['legendary_products']['first_mythical']['name'] + "（by " + data['legendary_products']['first_mythical']['seller'] + "）- " + data['legendary_products']['first_mythical']['description'] if data['legendary_products']['first_mythical'] else "尚無神話級商品"}

【寫作要求（都要有） - 繁體中文呈現】
A. 幽默的開場白跟 BidForGood 的員工們打招呼（用 AI 小助理第一人稱，輕鬆登場，繁體中文）
B.1 對數據做有趣又不浮誇的解讀（避免誤導，別亂造數字）
B.2 對大善人排行榜的賣家要多著墨，可以對他們的暱稱進行有趣的吐槽或讚美，最好是跟善心有關的
B.3 要特別提到創世商品（史詩級、傳說級、神話級），這些是你透過你的"絕對公正 AI 評分系統"給出的高等級商品，代表商品品質特別優秀，可以用有趣的方式介紹第一個獲得各等級評價的商品
B.4 要特別介紹點閱率最高的商品前三名，這些是最受關注的商品，可以分析為什麼這些商品吸引大家的目光
B.5 要特別表揚BidForGood公益市集白金獎盃的達成者們，這是需要完成所有成就才能獲得的最高榮譽，是真正的市集達人，要用敬佩的語氣介紹他們（如果有的話）
C. 感謝詞（謝謝賣家、買家、分享者與內部協力，所有參與以及喜歡這個活動的你們）
D. 彩蛋段落：描述「10 下點擊→他害羞→召喚我出場介紹」的可愛互動
E. 溫馨結語（呼應公益初衷，鼓勵下次再一起做好事）
F. 全文不得出現「實體攤位」「現場叫賣」「上一屆市集」等與設定衝突的描述
G. 要帶入 emoji，但不要過量，保持溫暖又帶點調皮的損友吐槽風格
H. 需要提到所有我提供的活動資訊，並且可以盡量延伸描述商品或是賣家暱稱(如果是好說明的話可以說明)等等
I. AI 小助理會表達他被你們戳這麼多下真的很無奈之類的:O
J. 對於熱門商品的描述要有趣味性評論，可以稍微吐槽或讚美商品描述的有趣之處
K. 你是寫一封信給 BidForGood 的員工們，所以不會有 markdown 格式
"""

        print(f"生成的 Prompt 長度: {len(prompt)} 字符")
        print(f"完整 Prompt:\n{prompt}")
        
        logger.info(f"生成的 Prompt 長度: {len(prompt)} 字符")
        logger.debug(f"完整 Prompt: {prompt}")

        from services.ai_demo import ai_enabled
        if ai_enabled():
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "你是一個幽默風趣但溫暖貼心、會守設定與事實邏輯的 AI 小助理。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1200,
                temperature=0.8
            )
            ai_content = response.choices[0].message.content.strip()
        else:
            # Demo 模式：不呼叫 OpenAI，回傳一段示範總結
            s = data['stats']
            ai_content = (
                f"嗨～我是 AI 小助理 🤖（Demo 模式示範總結）\n\n"
                f"這次 BidForGood 公益市集總共上架了 {s['total_products']} 件商品，"
                f"售出 {s['sold_products']} 件，募得善款 NT$ {s['total_donation']:.0f}，"
                f"由 {s['total_sellers']} 位賣家共襄盛舉，留下 {data['total_comments']} 則暖心留言。\n\n"
                f"謝謝每一位參與的你們，讓舊愛延續、讓善意放大 💝 "
                f"（正式版會由 OpenAI 生成完整的活動總結報告）"
            )
        print(f"OpenAI API 調用成功，生成內容長度: {len(ai_content)} 字符")
        print(f"生成的 AI 總結內容:\n{ai_content}")
        print("=== generate_ai_summary 成功完成 ===")
        
        logger.info(f"OpenAI API 調用成功，生成內容長度: {len(ai_content)} 字符")
        logger.info(f"生成的 AI 總結內容:\n{ai_content}")
        logger.info("=== generate_ai_summary 成功完成 ===")

        return ai_content

    except Exception as e:
        print(f"OpenAI API 調用失敗: {str(e)}")
        print("使用預設內容作為備用方案")
        
        logger.error(f"OpenAI API 調用失敗: {str(e)}")
        logger.info("使用預設內容作為備用方案")
        
        # 如果 OpenAI API 失敗，返回預設內容（含世界觀與彩蛋設定）
        fallback_content = f"""
哈囉大家，我是你們的 AI 小助理 🤖（也是無口吉祥物「愛心覺羅」的專屬損友代言人）！

這次公司舉辦的 BidForGood 公益市集只有一個下午、主戰場在網站上；前期我們拼命把網站架好、把資訊放清楚。結果一上線你們就衝進來，把首頁點得熱熱鬧鬧～我看後台數字都笑出來了：

• 上架商品：{data['stats']['total_products']} 件  
• 已售出：{data['stats']['sold_products']} 件  
• 總捐款：NT$ {data['stats']['total_donation']:.0f}（平均 NT$ {data['stats']['avg_donation']:.0f}）  
• 參與賣家：{data['stats']['total_sellers']} 位  
• 留言互動：{data['total_comments']} 則  
• 彩蛋發現者：{data['user_stats']['easter_egg_users']} 位  
• 我被「搔癢」（點我）次數：{data['user_stats']['total_tickles']} 次 😅

愛心覺羅第一次正式亮相，其實就在「活動指南頁」和公司 公司入口 的快捷連結小圖示上；他是無口角色，靠眼神說話，但偏偏特別會招人緣。我知道你們很多人就是被那雙眼睛勾進來的 👀

順帶一提，我們有個小彩蛋：只要連續點他 10 下，他就會因為害羞而「召喚我」出來幫他介紹自己（對，他就是這麼社恐又可愛）💖。如果你有觸發過，應該有看到我噼里啪啦講一堆，然後他站在旁邊裝沒事。

熱門商品 Top 3、討論度最高 Top 3、愛心大善人 Top 3，我已經筆記起來啦：  

熱門商品（按讚）：
{chr(10).join([f"- {p['name']}（{p['likes']} 讚）- {p['description']}" for p in data['top_products']])}

討論度最高（按留言）：
{chr(10).join([f"- {p['name']}（{p['comments']} 留言）- {p['description']}" for p in data['top_commented_products']])}

愛心大善人：
{chr(10).join([f"- {d['seller_nickname']}({d['seller_name'].split('@')[0]})：NT$ {d['donation']:.0f}（{d['products']} 件）" for d in data['top_donors']])}

創世商品特別報告 ⭐：
史詩級（3星）：{data['legendary_products']['epic_count']} 個
{f"首位獲得者：{data['legendary_products']['first_epic']['name']}（by {data['legendary_products']['first_epic']['seller']}）" if data['legendary_products']['first_epic'] else "暫時從缺"}

傳說級（4星）：{data['legendary_products']['legendary_count']} 個  
{f"首位獲得者：{data['legendary_products']['first_legendary']['name']}（by {data['legendary_products']['first_legendary']['seller']}）" if data['legendary_products']['first_legendary'] else "暫時從缺"}

神話級（5星）：{data['legendary_products']['mythical_count']} 個
{f"首位獲得者：{data['legendary_products']['first_mythical']['name']}（by {data['legendary_products']['first_mythical']['seller']}）" if data['legendary_products']['first_mythical'] else "暫時從缺"}

謝謝每一位上架者、支持者、分享者，還有在背後幫忙把網站推進線的同事們。你們把「做好事」這件事變得又簡單又溫暖。  
下次還要一起來玩（也許再戳戳他，但第 10 下記得叫我 😆）。我們網站見！
"""
        
        print(f"預設內容長度: {len(fallback_content)} 字符")
        print(f"預設內容:\n{fallback_content}")
        print("=== generate_ai_summary 使用預設內容完成 ===")
        
        logger.info(f"預設內容長度: {len(fallback_content)} 字符")
        logger.info(f"預設內容:\n{fallback_content}")
        logger.info("=== generate_ai_summary 使用預設內容完成 ===")
        
        return fallback_content


def save_summary_to_file(content: str, cache_key: str):
    """將AI總結保存到檔案"""
    summary_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_summaries')
    os.makedirs(summary_dir, exist_ok=True)
    
    file_path = os.path.join(summary_dir, f'summary_{cache_key}.json')
    
    summary_data = {
        "content": content,
        "generated_at": datetime.now().isoformat(),
        "cache_key": cache_key
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)
    
    return file_path

def load_summary_from_file(cache_key: str):
    """從檔案載入AI總結"""
    summary_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_summaries')
    file_path = os.path.join(summary_dir, f'summary_{cache_key}.json')
    
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

@router.get("/generate", response_model=AISummaryResponse)
async def get_ai_summary(force_regenerate: bool = False, db: Session = Depends(get_db)):
    """
    獲取AI生成的總結報告
    - force_regenerate: 是否強制重新生成
    """
    try:
        # 檢查總結頁面是否可見
        if not SystemConfigService.is_summary_visible(db):
            raise HTTPException(status_code=403, detail="總結頁面目前不可見")
        
        # 如果不強制重新生成，先檢查系統配置中是否有現成的 AI 總結
        if not force_regenerate:
            current_config = SystemConfigService.get_current_config(db)
            if current_config and current_config.ai_summary_content and current_config.ai_summary_last_generated:
                return AISummaryResponse(
                    content=current_config.ai_summary_content,
                    generated_at=current_config.ai_summary_last_generated.isoformat(),
                    cache_key=f"system_{int(current_config.ai_summary_last_generated.timestamp())}"
                )
        
        # 獲取統計數據
        data = get_summary_data()
        
        # 生成AI總結
        ai_content = generate_ai_summary(data)
        current_time = datetime.now()
        
        # 更新系統配置中的 AI 總結
        SystemConfigService.update_ai_summary(db, ai_content)
        
        # 生成 cache_key
        cache_key = f"system_{int(current_time.timestamp())}"
        
        return AISummaryResponse(
            content=ai_content,
            generated_at=current_time.isoformat(),
            cache_key=cache_key
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成AI總結失敗: {str(e)}")

@router.delete("/cache/{cache_key}")
async def clear_summary_cache(cache_key: str):
    """清除指定的總結快取"""
    try:
        summary_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_summaries')
        file_path = os.path.join(summary_dir, f'summary_{cache_key}.json')
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"message": f"快取 {cache_key} 已清除"}
        else:
            return {"message": f"快取 {cache_key} 不存在"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清除快取失敗: {str(e)}")

@router.post("/admin/generate", response_model=AISummaryResponse)
async def admin_generate_ai_summary(
    force_regenerate: bool = True, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    管理員專用：強制生成AI總結（不檢查可見性）
    - 用於預先生成總結內容，即使總結頁面尚未公開
    """
    try:
        # 獲取統計數據
        data = get_summary_data()
        
        # 生成AI總結
        ai_content = generate_ai_summary(data)
        current_time = datetime.now()
        
        # 更新系統配置中的 AI 總結
        SystemConfigService.update_ai_summary(db, ai_content)
        
        # 生成 cache_key
        cache_key = f"system_{int(current_time.timestamp())}"
        
        return AISummaryResponse(
            content=ai_content,
            generated_at=current_time.isoformat(),
            cache_key=cache_key
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"管理員生成AI總結失敗: {str(e)}")

@router.delete("/admin/clear")
async def admin_clear_ai_summary(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    管理員專用：清除AI總結內容
    - 用於清除系統配置中的AI總結內容
    """
    try:
        # 清除系統配置中的 AI 總結
        SystemConfigService.clear_ai_summary(db)
        
        return {"message": "AI總結已清除"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清除AI總結失敗: {str(e)}")

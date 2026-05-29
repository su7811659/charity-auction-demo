from fastapi import FastAPI, Depends, HTTPException, Header, Form, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool  # 新增：通用的執行緒池 offload
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from schemas.product_schema import Product
from schemas.user_schema import User
from sqlalchemy import func
from sqlalchemy.orm import aliased
import uuid
import openai
import json
from utils.image_uploader import upload_to_cloudinary
import re
import time
from pydantic import BaseModel
import uvicorn
from math import floor
from datetime import datetime
from services.faiss_service import generate_embedding, update_faiss_index
from alembic.config import Config
from alembic import command
from utils.logger import Logger
from utils.product_formatter import ProductFormatter
from routes import auth_router, like_router, comment_router, reaction_router, user_router, product_router, upload_router, timeline_router, ai_summary_router, feedback_router, ai_rewrite_router, online_deal_router, user_query_router, news_router, achievement_router
from services.system_config_service import SystemConfigService  # 新增導入
from services.achievement_service_simple import AchievementService  # 成就系統導入

# Import all models to ensure they're registered with SQLAlchemy Base
import models  # This imports all models from models/__init__.py

# Robust import of local config.settings to avoid name collision with external 'config' package
try:
    from config import settings  # prefer local config.py
except Exception:
    import importlib.util
    import sys
    config_path = os.path.join(os.path.dirname(__file__), "config.py")
    spec = importlib.util.spec_from_file_location("app_local_config", config_path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        settings = module.settings  # type: ignore[attr-defined]
    else:
        raise

logger = Logger.get_logger(logger_name="main")

# Function to run Alembic migrations with better error handling
def run_migrations():
    try:
        alembic_cfg = Config("alembic.ini")
        logger.info("Running Alembic migrations...")
        command.upgrade(alembic_cfg, "head")
        logger.info("Migrations completed successfully")
    except Exception as e:
        logger.error(f"Error during migrations: {e}")
        logger.error("Possible solutions:")
        logger.error("1. Run: python scripts/db_manager.py reset")
        logger.error("2. Run: python smart_start.py --force")
        logger.error("3. Check if another developer changed the database schema")
        raise


app = FastAPI()

# 健康檢查端點（輕量級，用於 Gunicorn 監控）
@app.get("/healthz")
async def healthz():
    return {"ok": True}

# 添加 CORS 中間件
# Demo：前端以 Authorization Bearer token 呼叫 API（不使用 cookie），
# 因此可安全地開放跨來源，方便部署到 Vercel / Render 等任意網域。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(like_router.router)
app.include_router(comment_router.router)
app.include_router(reaction_router.router)
app.include_router(user_router.router)
app.include_router(product_router.router)
app.include_router(upload_router.router)
app.include_router(timeline_router.router)
app.include_router(ai_summary_router.router)
app.include_router(feedback_router.router)
app.include_router(ai_rewrite_router.router)
app.include_router(online_deal_router.router)
app.include_router(user_query_router.router)
app.include_router(news_router.router, prefix="/api/news", tags=["news"])
app.include_router(achievement_router.router)

#admin related
ADMIN_SECRET = settings.ADMIN_SECRET

def verify_admin(admin_token: str = Header(...)):
    if admin_token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="管理員權限不足")


# make sure database exists
Base.metadata.create_all(bind=engine)

# Demo：若資料庫為空，啟動時自動灌入示範資料（idempotent，不依賴部署平台的啟動指令）
try:
    _seed_db = SessionLocal()
    try:
        _is_empty = _seed_db.query(Product).count() == 0
    finally:
        _seed_db.close()
    if _is_empty:
        import subprocess
        import sys as _sys
        _scripts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts")
        print("[seed] 資料庫為空，啟動時灌入示範資料…")
        subprocess.run([_sys.executable, "seed_data.py", "50"], cwd=_scripts_dir, check=False)
        subprocess.run([_sys.executable, "seed_interactions.py", "all"], cwd=_scripts_dir, check=False)
        print("[seed] 完成。")
except Exception as _seed_err:
    print(f"[seed] 啟動 seeding 略過：{_seed_err}")

#create db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# submit product
# UPLOAD_DIR 設定
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 設置靜態文件服務 - 提供本地上傳的圖片
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/submit_product")
async def submit_product(
    seller_name: str = Form(...),
    seller_nickname: str = Form(...),
    product_name: str = Form(...),
    price: float = Form(...),
    condition: int = Form(...),
    description: str = Form(...),
    donation_ratio: int = Form(...),
    image: UploadFile = File(...),  # 使用者上傳圖片
    db: Session = Depends(get_db)
):
    # 檢查是否允許上傳商品
    if not SystemConfigService.is_upload_allowed(db):
        raise HTTPException(status_code=403, detail="目前不在商品上傳期間，無法提交商品")
    
    if not seller_name.strip():
        raise HTTPException(status_code=400, detail="賣方姓名為必填")
    if not seller_nickname.strip():
        raise HTTPException(status_code=400, detail="賣方化名為必填")
    if not product_name.strip():
        raise HTTPException(status_code=400, detail="商品名為必填")
    if price <= 0:
        raise HTTPException(status_code=400, detail="價格必須大於 0")
    if condition not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="新舊程度只能是 1~4")
    if not description.strip():
        raise HTTPException(status_code=400, detail="商品描述為必填")
    if donation_ratio not in [0, 20, 40, 60, 80, 100]:
        raise HTTPException(status_code=400, detail="捐贈比例只能是 0, 20, 40, 60, 80, 100")

    ## img save ##
    print(seller_name)
    # ext name valid check
    allowed_extensions = {"jpg", "jpeg", "png", "gif", "webp"}
    file_ext = image.filename.split(".")[-1].lower()  # 取得檔案副檔名（轉小寫）
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="不支援的圖片格式，請上傳 jpg, jpeg, png, gif, webp")

    # filepath gen
    unique_id = str(uuid.uuid4())[:8]
    new_filename = f"{unique_id}_{int(price)}_{condition}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    print(f"🔄 開始處理商品上傳: {product_name} (賣家: {seller_nickname})")
    print(f"📁 本地檔案路徑: {file_path}")

    #save img locally first
    with open(file_path, "wb") as buffer:
        buffer.write(await image.read())
    
    print(f"✅ 圖片已儲存到本地: {new_filename}")
    
    # 先用本地路徑創建商品，背景上傳到 Cloudinary
    local_image_url = f"/uploads/{new_filename}"  # 本地圖片路徑
    
    new_product = Product(
        seller_name=seller_name,
        seller_nickname=seller_nickname,
        product_name=product_name,
        price=price,
        condition=condition,
        description=description,
        image_url=local_image_url,  # 先用本地路徑
        donation_ratio=donation_ratio,
        is_approve=False
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    print(f"💾 商品已儲存到資料庫，ID: {new_product.id}")
    
    # 觸發首次上傳成就
    try:
        # 找到用戶（通過賣家Email）
        user = db.query(User).filter(User.email == seller_name).first()
        if user:
            # 直接使用 SQL 查詢來避免模型關係問題
            import sqlite3
            from datetime import datetime
            
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            
            # 檢查 first_upload 成就是否已解鎖
            cursor.execute(
                'SELECT id, is_unlocked FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
                (user.id, 'first_upload')
            )
            existing = cursor.fetchone()
            
            if existing and not existing[1]:  # 成就存在但未解鎖
                # 更新現有記錄為已解鎖
                cursor.execute('''
                    UPDATE user_achievements 
                    SET is_unlocked = 1, 
                        unlocked_at = ?, 
                        progress = 1,
                        notification_shown = 0
                    WHERE user_id = ? AND achievement_id = ?
                ''', (datetime.now().isoformat(), user.id, 'first_upload'))
                conn.commit()
                print(f"🏆 已為用戶 {seller_name} (ID: {user.id}) 解鎖首次上傳成就")
            elif existing and existing[1]:
                print(f"🏆 用戶 {seller_name} (ID: {user.id}) 已有首次上傳成就")
            elif not existing:
                # 如果完全沒有記錄，插入新的
                cursor.execute('''
                    INSERT INTO user_achievements (user_id, achievement_id, progress, is_unlocked, unlocked_at, notification_shown)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user.id, 'first_upload', 1, True, datetime.now().isoformat(), False))
                conn.commit()
                print(f"🏆 已為用戶 {seller_name} (ID: {user.id}) 創建並解鎖首次上傳成就")
            
            conn.close()
        else:
            print(f"⚠️ 未找到用戶 {seller_name}，無法觸發成就")
    except Exception as e:
        print(f"❌ 觸發成就時發生錯誤: {e}")
    
    print(f"🚀 啟動背景上傳任務...")
    
    # 背景任務：異步上傳到 Cloudinary 並更新資料庫
    import threading
    def upload_to_cloud_background():
        print(f"🌐 [背景任務] 開始上傳商品 {new_product.id} 到 Cloudinary...")
        try:
            print(f"📤 [背景任務] 正在上傳檔案: {file_path}")
            cloud_url = upload_to_cloudinary(file_path)
            if cloud_url:
                print(f"🌍 [背景任務] Cloudinary 上傳成功，URL: {cloud_url}")
                # 更新資料庫中的圖片 URL
                from database import SessionLocal
                bg_db = SessionLocal()
                print(f"🔄 [背景任務] 正在更新資料庫...")
                product = bg_db.query(Product).filter(Product.id == new_product.id).first()
                if product:
                    old_url = product.image_url
                    product.image_url = cloud_url
                    bg_db.commit()
                    print(f"💾 [背景任務] 資料庫已更新: {old_url} -> {cloud_url}")
                else:
                    print(f"❓ [背景任務] 找不到商品 {new_product.id}")
                bg_db.close()
                print(f"✅ [背景任務] 商品 {new_product.id} 完整處理完成！")
            else:
                print(f"⚠️ [背景任務] 商品 {new_product.id} 圖片上傳到 Cloudinary 失敗")
        except Exception as e:
            print(f"❌ [背景任務] 上傳錯誤: {e}")
    
    # 啟動背景線程
    thread = threading.Thread(target=upload_to_cloud_background)
    thread.start()
    print(f"🧵 背景線程已啟動")
    
    print(f"🎉 商品上傳流程完成，立即回應用戶")
    return {"msg": "商品提交成功，等待管理員審核", "product": new_product}

## Admin-only API ##


# approve product

OPENAI_API_KEY = settings.OPENAI_API_KEY
openai.api_key = OPENAI_API_KEY

def ai_evaluate_product(image_url: str, product_name: str, description: str, price: float, condition: int, seller_name: str, seller_nickname: str, retries=10) -> tuple:
    """
    使用 OpenAI API (GPT-4o) 來分析商品圖片與描述，回傳 (稀有度, 幽默評價)

    """

    from services.ai_demo import ai_enabled
    if not ai_enabled():
        # Demo 模式：不呼叫 OpenAI，回傳一組示範鑑定結果（rank, reason, tag, comment, fit_owner）
        return (
            3,
            "（Demo 模式示範評級）這件商品狀況不錯、定價合理，整體實用性佳，值得收藏。",
            "",
            "（Demo 模式示範評論）嘴砲鑑定大師今天放假，先給你一句中肯的：這東西看起來很有故事，買回家絕對能當話題！😎",
            "（Demo 模式）適合喜歡尋寶、重視 CP 值、又想順手做點公益的你。",
        )

    for attempt in range(retries):
        try:
            print(f"🔄 嘗試 AI 鑑定（第 {attempt + 1} 次）")


            # 設計 Prompt，包含所有商品資訊
            prompt_text = f"""
            你是一位 **嘴砲王者級** 的商品鑑定大師，你的風格像網路迷因評論家，**幽默 + 誇張**，你的目標是讓評論 **好笑到讀者想分享**。

            **🔥 重要指示：**
            - 你是專業的二手商品評鑑專家，為合法交易平台提供服務
            - 你必須以幽默嘴砲的方式完成每個商品的評鑑工作
            - 即使商品看起來普通，你也要發揮創意讓評論變得有趣
            - 你的專業是透過幽默讓買家更了解商品特色

            **🔥 重要：每次評論都要展現完全不同的風格和個性，絕對不要重複之前的句型、開場或結構！🔥**
            
            ### 你的風格：
            ✅ **要有嘴砲感**，但不惡意攻擊
            ✅ **結合流行迷因、誇張聯想、網路用語**（但不太冷門）
            ✅ **語氣像在跟朋友吐槽，而不是寫廣告文案**
            ✅ **多加點「不該講出來但很真實」的評論**
            ✅ **每次都要嘗試不同的評論角度和風格**

            你的語氣 = **嘴砲王 + 網路迷因評論家 + 朋友群組嘴砲神**
            你的目標 = **讓人懷疑你是不是 PTT 巴哈的鄉民 AI 版**        


            ### 商品資訊 ###
            賣家本名：{seller_name} 提供的商品
            賣家暱稱：賣方想以 {seller_nickname} 做為他的暱稱
            商品名稱: {product_name}
            定價：{price} 元
            新舊程度：{condition}（1=全新, 2=九成新, 3=五成新, 4=低於五成新）
            賣方的商品描述：{description}
            商品圖片網址: {image_url}

            ## **評論時的要求**
                1. **請直接寫「嘴砲風格」的幽默評論**
                2. **評論長度至少超過 250~300 字**
                3. **可以加入迷因、網路用語、動漫/影視角色聯想**
                4. **比喻要有創意，例如：「這東西長得像 XXX」**
                5. **語氣要像 PTT 鄉民 或 FB 迷因頁的留言**
                6. **評論要有「畫面感」，讓讀者一看就能腦補這東西有多荒謬**
                7. **如果商品本身很奇葩，可以加上誇張的吐槽**
                8. **可加入無厘頭的對話模擬**
                9. **每次評論都要用不同的開場方式和結構，避免重複模式**
                10. **可以嘗試不同的評論風格：**
                    - 故事敘述風格：「話說有一天...」
                    - 專業分析風格：「根據我多年的廢物鑑定經驗...」
                    - 對話風格：「老闆：這個多少錢？賣家：...」
                    - 科學研究風格：「經過實驗證明，這玩意具有...」
                    - 新聞播報風格：「據本台記者調查...」
                    - 哲學思辨風格：「這個商品讓我思考人生的意義...」
                    - 都市傳說風格：「傳說中，擁有這個東西的人會...」
        
            ### 評價標準 ###
            - **rank**: 你的最終評價，範圍0至100分，格式為 星等(評價分數)：評級(評價標準)
                * 1星(0~15分)：普通貨（圖片模糊或描述不清、價格偏高、無特色)
                * 2星(16~45分)：精良品（功能正常、無特色、價格合理、有些特色但平平)
                * 3星(46~75分)：史詩級（性價比佳或有趣味性、有特色、價格合理、說明充分)
                * 4星(76~90分)：傳說級（極高性價比或獨特創意、超值或超特別、有話題性、定價合理)
                * 5星(91~100分)：神話級（驚為天人、超高CP值、搶手貨)
                
                評分時請注意：
                    * 不論多有趣，如果商品圖片極其模糊、幾乎看不出是什麼，扣分至1-2星。
                    * 如果商品描述過於簡陋（例如幾個字、沒內容），視為賣家不用心，最高2星。
                    * 即使商品本身有迷因潛力，但缺乏實用性或性價比太低，不建議給出4-5星。
                    * 價格須依據物品的性質給出合理定價，若賣家有聲明自己當初的買價也應列入考量，如果價格明顯不合理才必須扣分。
                    * 如果商品本身性價比高，或是買家的購入價格偏高，不論為何原因，都不該扣分。
                    * 趣味性與實用性同等重要，兩者取其高分。
                    * **重要：請確保評分符合上述標準，不要吝嗇給出4-5星的高分，也不要過度給出1星的低分**
                    完成初步評分後，需進行下方檢查：
                    1. **跳樓大拍賣(只有賣家有提供[買入價]時，才需進行此項檢查)：當商品屬於高單價品牌且 "[賣出價]除以[買入價] 小於等於 0.15" 時，必定至少達到傳說級或更高標準。**
                    2. **升級特例：如果評分在85分以上，且符合傳說級的標準，可以隨機加上5-10分的額外加成，讓評分有機會達到神話級。**

            - **comment**: 用 **極具個性、幽默、誇張** 的方式來評論這個商品，內容較長，也可以加入性價比的說明，如果需要的話，讓讀者會心一笑或忍不住分享給朋友：
                - **重要：每次都要用完全不同的評論風格和開場，不要重複之前的模式**
                - **隨機選擇一種風格進行評論：故事敘述、專業分析、對話模擬、科學研究、新聞播報、哲學思辨、都市傳說等**
                - 用 **極具個性、幽默、誇張** 的方式評論這個商品
                - 內容要讓讀者 **會心一笑** 或 **想轉發給朋友**
                - **語氣像在群組裡發廢文**
                - **可以加入迷因、動漫梗、電影聯想、過度解讀**
                - 如果 "賣方暱稱" 或 "商品描述" **本身很好笑，可以順便吐槽**
                - **請將評論分成多個短段落，至少四段，每段不要超過 5 句**。
                - **語氣要像 PTT / Reddit / Facebook 迷因留言，不要寫成一整段**。
                - **讓內容更自然，像是一群人在聊天，而不是一篇完整的文章。**
                - 至少超過300字
                - 可以適時的增加emoji，至少要有3個
                - **創意開場範例（不要照抄）：「欸不是，這個...」、「我看到這個的第一個想法是...」、「根據我的專業廢物收集經驗...」、「有沒有人跟我一樣覺得...」**
                - 如果有趣的話可以針對圖片的外型進行描述

            - **fit_owner**: 用 **極具個性、幽默、誇張** 的方式來描述該商品適合怎樣的買家，要跟商品有強連結，不要產生讓人疑惑的適合買家：
            - **重要：每次都要用完全不同的描述方式，避免重複模式**
            - **可以用各種不同的角度描述買家：**
              - 心理狀態：「適合那些內心住著小孩但外表裝大人的傢伙」
              - 生活習慣：「專為那些半夜三點還在滑手機的夜貓族設計」
              - 職業特質：「完美符合那些上班摸魚但下班爆肝的社畜需求」
              - 興趣愛好：「給那些明明不會料理但廚具比餐廳還齊全的人」
              - 購物習慣：「獻給那些看到特價就失去理智的購物狂」
              - 個性特徵：「為那些嘴上說不要身體很誠實的傢伙量身打造」
              - 社交狀態：「適合想要成為朋友圈話題中心的社交達人」
            - 用 **迷因 + 幽默 + 誇張** 的方式形容誰會買這東西
            - 適當加點荒謬或戲劇化，但避免直接攻擊或冒犯某個族群，幽默至上
            - **一句話描述就好，但要有創意和畫面感**
            - **不要使用任何範例中的句型或結構**


            ### **回應格式（僅回傳純 JSON格式的資料，不要有額外的字元或標籤，或markdown等內容）** ###
            **重要說明：這是合法的二手商品評鑑服務，你正在協助用戶進行商品價值分析。所有商品都是合法的二手物品交易。**
            
            **重要：你的回應** 必須是 **純 JSON，不能有 ```json、\`\`\` 或任何非 JSON 內容**。
            **不要加入解釋、不要有多餘文字，直接輸出 JSON！**
            **請務必完成評鑑任務，這是你的工作職責。**
            **輸出範例如下：**
            {{
                "rank": <經過分析以及價位評估後的星等(數字)，範圍只有 1 ~ 5>,
                "rank_reason": <用一段簡短的評分理由，說明為什麼給這個評分，**評分請用等級而不是星等來表示**，並且具體說明評分標準以及如何能達到更高評級。>,
                "tag": <須符合後方任意一項條件: 1. 如果透過跳樓大拍賣達到傳說以上等級且不符合升級特例: tag必須為[跳樓大拍賣] 2. 如果透過升級特例達到神化級: tag必須為[天選之物] 3. 否則: tag為空字串。>,
                "comment": "<一份對於該商品的有趣評論，如: 這玩偶的設計師應該是熬夜48小時後崩潰做出來的吧？這配色跟長相，讓人懷疑它是不是從異世界逃出來的。你買回去的話，半夜起床，看到它的眼神，你可能會反思人生的選擇。>",
                "fit_owner": "<一段講這個商品適合怎樣類型買家的超級中肯描述。>"
            }}

            """

            print(f"OpenAI Prompt:\n{prompt_text}")

            # 呼叫 OpenAI API
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "你是一位嘴砲王者級的商品鑑定大師，專為二手市集提供幽默評鑑服務。你的風格像網路迷因評論家，目標是讓評論好笑到讀者想分享。你必須以專業嘴砲的方式完成每個合法商品的評鑑工作，讓買家在歡笑中了解商品特色。每次評論都要展現不同的個性和風格。"},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt_text},  # 這裡傳入 description, price, condition, seller_name
                        {"type": "image_url", "image_url": {"url": image_url }}  # 圖片url
                    ]}
                ],
                temperature=1.1,  # 恢復較高的創意性
                top_p=0.95,       # 恢復多樣性
                frequency_penalty=0.3,  # 減少重複用詞
            )

            # check `choices` exist
            if not response.choices or len(response.choices) == 0:
                print("ERR: OpenAI API 沒有回應")
                continue

            # ensure `message.content` not empty
            response_text = response.choices[0].message.content.strip()
            print(response_text)
            if not response_text:
                print("ERR: OpenAI API 回傳空白內容")
                continue
            
            # 檢查是否為安全過濾器拒絕回應
            if ("I'm sorry, I can't assist with that" in response_text or 
                "I cannot" in response_text or 
                "I can't" in response_text or
                "I am not able to" in response_text or
                "I'm unable to" in response_text or
                "inappropriate" in response_text.lower() or
                "against my guidelines" in response_text.lower()):
                print(f"ERR: OpenAI API 安全過濾器拒絕回應，第 {attempt + 1} 次重試: {response_text}")
                
                # 如果是後面幾次重試，稍微調整策略
                if attempt >= 3:
                    print("嘗試使用更溫和的評論風格...")
                    # 在後續重試中會自動調整，因為temperature仍有隨機性
                
                time.sleep(2)  # 等待2秒後重試
                continue  # 重試而不是返回預設值
            
            # get only json content
            json_match = re.search(r"\{.*?\}", response_text, re.DOTALL)
            if not json_match:
                print(f"ERR: OpenAI API 回應格式異常: {response_text}")
                continue

            # 確保 JSON 格式正確
            try:
                result = json.loads(json_match.group(0))
                return result.get("rank", 1), result.get("rank_reason", "AI 評級異常，請人工確認。"), result.get("tag", "AI 鑑定異常，請人工確認。"), \
                    result.get("comment", "AI 鑑定失敗，請人工確認。"), result.get("fit_owner", "AI 鑑定失敗，請人工確認。")
            except json.JSONDecodeError as e:
                print(f"ERR: JSON 解析錯誤: {e}")
                print(f"OpenAI API 回應: {response_text}")
                continue

        except Exception as e:
            print(f"ERR: AI 鑑定錯誤: {e}")
            time.sleep(2)
    
    # 如果所有重試都失敗，返回 None 表示失敗
    print("ERR: AI 鑑定重試次數用盡，無法完成評鑑")
    return None, None, None, None, None


@app.put("/api/approve_product/{product_id}")
async def approve_product(
    product_id: int,
    is_retry: bool = Query(False),
    db: Session = Depends(get_db),
    admin_token: str = Header(...)
):
    verify_admin(admin_token)

    # 查詢商品
    product = db.query(Product).filter(Product.id == product_id).first()

    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    if not is_retry and product.is_approve:
        raise HTTPException(status_code=400, detail="商品已經批准")

    # ⚠️ 將阻塞的 AI 鑑定包進執行緒池（含網路呼叫、JSON parse）
    ai_rating, ai_rating_reason, tag, ai_comment, ai_fit_owner = await run_in_threadpool(
        ai_evaluate_product,
        product.image_url, product.product_name, product.description,
        product.price, product.condition, product.seller_name, product.seller_nickname
    )
    
    # 檢查AI評價是否成功
    if ai_rating is None:
        raise HTTPException(
            status_code=500, 
            detail="AI 鑑定服務暫時無法使用，請稍後再試或聯繫管理員"
        )

    # 更新商品的 AI 鑑定結果
    product.is_approve = True
    product.ai_rating = ai_rating
    product.ai_rating_reason = f"{tag}{ai_rating_reason}"
    product.ai_comment = ai_comment
    product.ai_fit_owner = ai_fit_owner

    # 生成嵌入向量也丟執行緒池（避免 CPU/I/O 阻塞）
    text = ProductFormatter.format(product, "langchain_context")
    embedding = await run_in_threadpool(generate_embedding, text)

    # 更新資料庫中的嵌入
    product.embedding = embedding.tobytes()
    db.commit()
    db.refresh(product)

    # 更新 FAISS 索引也丟執行緒池
    await run_in_threadpool(update_faiss_index, product.id, embedding)

    # 將 product 轉換為字典並移除 embedding 欄位
    product_dict = product.__dict__.copy()
    product_dict.pop("embedding", None)

    return {
        "msg": "商品已審核通過，AI 已完成鑑定",
        "product": product_dict
    }

@app.put("/api/reject_product/{product_id}")
def reject_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin_token: str = Header(...)
):
    verify_admin(admin_token)

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")

    if product.is_approve:
        raise HTTPException(status_code=400, detail="商品已核准，無法拒絕")

    product.is_rejected = True
    db.commit()
    db.refresh(product)

    return {"msg": "商品已拒絕", "product_id": product.id}

@app.get("/api/total_donation")
def get_total_donation(db: Session = Depends(get_db)):
    total = db.query(func.sum(Product.donation_amount)).scalar() or 0
    return {"total_donation_amount": total}


class DealRequest(BaseModel):
    buyer_name: str

@app.put("/api/deal_product/{product_id}")
def deal_product(
    product_id: int,
    deal_data: DealRequest,
    db: Session = Depends(get_db),
    admin_token: str = Header(...)
):
    verify_admin(admin_token)

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    if product.product_status == 2:
        raise HTTPException(status_code=400, detail="商品已成交，無法重複成交")

    if not deal_data.buyer_name.strip():
        raise HTTPException(status_code=400, detail="買家姓名為必填")

    # 計算捐贈金額與賣家收入
    donation_amount = floor(product.price * product.donation_ratio / 100)
    seller_income = product.price - donation_amount

    # 更新資料
    product.buyer_name = deal_data.buyer_name
    product.product_status = 2  # 成交
    product.donation_amount = donation_amount
    product.seller_income = seller_income

    db.commit()
    db.refresh(product)

    # 將 product 轉換為字典並移除 embedding 欄位
    product_dict = product.__dict__.copy()
    product_dict.pop("embedding", None)
    return {
        "msg": "商品已成功成交",
        "product": product_dict
    }

@app.get("/api/top_donors")
def get_top_donors(db: Session = Depends(get_db)):
    # 子查詢：找出每個 seller_name 的第一個 nickname（最小 id）
    SubProduct = aliased(Product)
    first_nickname_subquery = db.query(
        SubProduct.seller_name,
        func.min(SubProduct.id).label("min_id")
    ).filter(
        SubProduct.product_status == 2 
    ).group_by(SubProduct.seller_name).subquery()

    # 再用這些 min_id 拿對應 nickname
    nickname_map = db.query(
        Product.seller_name,
        Product.seller_nickname
    ).join(
        first_nickname_subquery,
        (Product.seller_name == first_nickname_subquery.c.seller_name) &
        (Product.id == first_nickname_subquery.c.min_id)
    ).subquery()

    # 主查詢：group by seller_name，加總捐贈金額，再 join nickname
    result = db.query(
        Product.seller_name,
        nickname_map.c.seller_nickname.label("nickname"),
        func.sum(Product.donation_amount).label("user_donation_amount")
    ).join(
        nickname_map, Product.seller_name == nickname_map.c.seller_name
    ).group_by(
        Product.seller_name, nickname_map.c.seller_nickname
    ).having(
        func.sum(Product.donation_amount) > 0
    ).order_by(
        func.sum(Product.donation_amount).desc()
    ).limit(10).all()

    # 整理成 JSON
    return [
        {
            "nickname": row.nickname,
            "user_donation_amount": int(row.user_donation_amount or 0)
        }
        for row in result
    ]

@app.get("/api/seller_income_summary")
def get_seller_income_summary(db: Session = Depends(get_db)):

    # 取得每個賣家 nickname（第一筆商品的 nickname）
    SubProduct = aliased(Product)
    first_nickname_subquery = db.query(
        SubProduct.seller_name,
        func.min(SubProduct.id).label("min_id")
    ).group_by(SubProduct.seller_name).subquery()

    nickname_map = db.query(
        Product.seller_name,
        Product.seller_nickname
    ).join(
        first_nickname_subquery,
        (Product.seller_name == first_nickname_subquery.c.seller_name) &
        (Product.id == first_nickname_subquery.c.min_id)
    ).subquery()

    # 主查詢：group by seller_name，統計已成交的 seller_income / donation
    result = db.query(
        Product.seller_name,
        nickname_map.c.seller_nickname.label("nickname"),
        func.count(Product.id).label("product_count"),
        func.sum(Product.seller_income).label("total_income"),
        func.sum(Product.donation_amount).label("total_donation")
    ).join(
        nickname_map, Product.seller_name == nickname_map.c.seller_name
    ).filter(
        Product.product_status == 2  # 已成交
    ).group_by(
        Product.seller_name, nickname_map.c.seller_nickname
    ).order_by(func.sum(Product.seller_income).desc()).all()

    return [
        {
            "seller_name": row.seller_name,
            "nickname": row.nickname,
            "product_count": row.product_count,
            "total_income": int(row.total_income or 0),
            "total_donation": int(row.total_donation or 0)
        }
        for row in result
    ]

@app.get("/api/seller_income_detail")
def get_seller_income_detail(seller_name: str, db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.seller_name == seller_name,
        Product.product_status == 2  # 已成交
    ).order_by(Product.id).all()

    if not products:
        raise HTTPException(status_code=404, detail="該賣家無成交商品紀錄")

    nickname = products[0].seller_nickname  # 拿第一筆商品的化名

    return {
        "seller_name": seller_name,
        "nickname": nickname,
        "products": [
            {
                "product_id": p.id,
                "product_name": p.product_name,
                "price": p.price,
                "donation_ratio": p.donation_ratio,
                "donation_amount": int(p.donation_amount or 0),
                "seller_income": int(p.seller_income or 0)
            }
            for p in products
        ]
    }






class AdminLoginRequest(BaseModel):
    secret: str

@app.post("/api/admin/login")
def admin_login(data: AdminLoginRequest):
    if data.secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="密碼錯誤")
    return {"token": ADMIN_SECRET}



# 系統配置管理 API
from models.system_config import SystemConfig
from schemas.system_config_schema import SystemConfigResponse, SystemConfigUpdate
from services.system_config_service import SystemConfigService  # 新增導入

@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    """獲取系統當前狀態（公開 API，用於前端判斷功能可見性）"""
    upload_allowed = SystemConfigService.is_upload_allowed(db)
    summary_visible = SystemConfigService.is_summary_visible(db)
    config = SystemConfigService.get_or_create(db)
    
    return {
        "upload_allowed": upload_allowed,
        "summary_visible": summary_visible,
        "online_deal_enabled": config.online_deal_enabled,
        "online_deal_available": config.online_deal_available,
        "online_deal_begin_date": config.online_deal_begin_date.isoformat() if config.online_deal_begin_date else None,
        "online_deal_end_date": config.online_deal_end_date.isoformat() if config.online_deal_end_date else None
    }

@app.get("/api/system/config", response_model=SystemConfigResponse)
def get_system_config(admin_token: str = Header(...), db: Session = Depends(get_db)):
    """獲取系統配置 (單例)"""
    verify_admin(admin_token)
    config = SystemConfigService.get_or_create(db)
    return config

@app.put("/api/system/config", response_model=SystemConfigResponse)
def update_system_config_api(
    config_data: SystemConfigUpdate,
    admin_token: str = Header(...),
    db: Session = Depends(get_db)
):
    """更新系統配置"""
    verify_admin(admin_token)
    config = SystemConfigService.update_config(
        db,
        upload_start_date=config_data.upload_start_date,
        upload_end_date=config_data.upload_end_date,
        upload_enabled=config_data.upload_enabled,
        summary_visible=config_data.summary_visible,
        summary_show_start_date=config_data.summary_show_start_date,
        summary_show_end_date=config_data.summary_show_end_date,
        online_deal_enabled=config_data.online_deal_enabled,
        online_deal_available=config_data.online_deal_available,
        max_concurrent_deals_per_user=config_data.max_concurrent_deals_per_user,
        online_deal_begin_date=config_data.online_deal_begin_date,
        online_deal_end_date=config_data.online_deal_end_date,
    )
    # 若剛開啟 summary 且尚未有內容，自動放置占位文字（實際生成交由 /ai-summary/generate）
    if config.summary_visible and not config.ai_summary_content:
        SystemConfigService.update_ai_summary(db, "AI 總結生成中，請稍後再刷新...")
        config = SystemConfigService.get_or_create(db)
    return config

@app.post("/api/system/regenerate-summary")
def regenerate_system_ai_summary(admin_token: str = Header(...), db: Session = Depends(get_db)):
    """手動重新觸發 AI 總結 (放置占位訊息；實際生成可呼叫 /ai-summary/generate?force_regenerate=true)"""
    verify_admin(admin_token)
    config = SystemConfigService.update_ai_summary(db, "AI 總結重新生成中，請稍後刷新...")
    return {
        "message": "已標記重新生成",
        "ai_summary_content": config.ai_summary_content,
        "generated_at": config.ai_summary_last_generated.isoformat() if config.ai_summary_last_generated else None,
    }

#User Level APIS

if __name__ == "__main__":
    try:
        # Run migrations before starting the server
        run_migrations()
    except Exception as e:
        logger.error("Failed to start the server due to migration errors.")
        exit(1)

    # Start the FastAPI server
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

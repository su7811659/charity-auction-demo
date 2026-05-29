"""
AI 商品描述改寫 API
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Optional
import openai
import asyncio
import threading
from config import settings
from utils.logger import Logger
from sqlalchemy.orm import Session
from repositories.ai_usage_repository import AIUsageRepository
import uuid
from datetime import datetime, timedelta

# Database session dependency
def get_db():
    from database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/api/ai", tags=["ai-rewrite"])

logger = Logger.get_logger(logger_name="ai_rewrite_router")

# 新增：任務狀態追蹤
task_status: Dict[str, Dict] = {}

# 清理過期任務（避免內存洩漏）
def cleanup_expired_tasks():
    current_time = datetime.now()
    expired_keys = [
        task_id for task_id, task_info in task_status.items()
        if current_time - task_info.get('created_at', current_time) > timedelta(hours=1)
    ]
    for key in expired_keys:
        del task_status[key]

def parse_ai_response_manually(content: str) -> Dict[str, str]:
    """
    手動解析AI回應，當JSON解析失敗時使用
    """
    descriptions = {}
    required_keys = ["professional", "warm", "domineering", "chuuni", "ancient"]
    
    # 嘗試用正則表達式提取每個部分
    import re
    
    for key in required_keys:
        # 嘗試找到對應的內容
        pattern = rf'"{key}"\s*:\s*"([^"]*(?:[^"\\]|\\.)*)"'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            value = match.group(1)
            # 反轉義字符
            value = value.replace('\\"', '"')
            value = value.replace('\\n', '\n')
            value = value.replace('\\r', '\r')
            value = value.replace('\\t', '\t')
            descriptions[key] = value
        else:
            # 如果找不到，提供預設值
            fallback_map = {
                "professional": "這是一件優質商品，值得您的信賴選擇。",
                "warm": "這件商品承載著美好的回憶，希望能延續這份溫暖。",
                "domineering": "這是品味的象徵，給識貨之人的專屬機會！",
                "chuuni": "傳說級寶物現世！擁有它將獲得神秘力量！",
                "ancient": "此物不凡，乃雅士之選，誠為佳作也。"
            }
            descriptions[key] = fallback_map[key]
    
    return descriptions

# 新增：從 LLM 回應中以寬鬆方式抽取五個欄位的內容，避免整段被吃到單一 key 的問題
def extract_descriptions_relaxed(raw: str) -> Dict[str, str]:
    import re
    def strip_code_fences(s: str) -> str:
        s = s.strip()
        # 去掉 ```json ... ``` 或 ``` ... ```
        if s.startswith("```"):
            s = re.sub(r"^```[a-zA-Z]*\n", "", s)
            s = re.sub(r"\n```$", "", s)
        return s

    def find_value_end(s: str, start_idx: int) -> int | None:
        # 從第一個字元開始掃描，尋找結束雙引號，其後只能接逗號或右大括號（忽略空白）
        i = start_idx
        escaped = False
        while i < len(s):
            ch = s[i]
            if ch == "\\" and not escaped:
                escaped = True
                i += 1
                continue
            if ch == '"' and not escaped:
                j = i + 1
                while j < len(s) and s[j].isspace():
                    j += 1
                if j >= len(s) or s[j] in [',', '}']:
                    return i
            escaped = False
            i += 1
        return None

    text = strip_code_fences(raw)
    # 嘗試只取第一個 { 到最後一個 } 之間的內容
    l = text.find('{')
    r = text.rfind('}')
    if l != -1 and r != -1 and r > l:
        text = text[l:r+1]

    keys = ["professional", "warm", "domineering", "chuuni", "ancient"]
    result: Dict[str, str] = {}

    for key in keys:
        key_pos = text.find(f'"{key}"')
        if key_pos == -1:
            continue
        colon_pos = text.find(':', key_pos)
        if colon_pos == -1:
            continue
        # 找到值的起始雙引號
        quote_start = text.find('"', colon_pos)
        if quote_start == -1:
            continue
        # 尋找值的結束雙引號
        quote_end = find_value_end(text, quote_start + 1)
        if quote_end is None:
            continue
        raw_val = text[quote_start + 1:quote_end]
        # 還原常見跳脫字元
        val = (raw_val
               .replace('\\n', '\n')
               .replace('\\r', '\r')
               .replace('\\t', '\t')
               .replace('\\"', '"'))
        result[key] = val.strip()

    return result

class RewriteRequest(BaseModel):
    productName: str
    sellerNickname: str
    price: int
    condition: str
    originalDescription: str
    userId: int  # 新增使用者ID

class RewriteResponse(BaseModel):
    success: bool
    descriptions: Dict[str, str] = None
    message: str = ""
    remaining_usage: int = None  # 剩餘使用次數
    task_id: str = None  # 新增：異步任務ID

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str  # pending, processing, completed, failed
    descriptions: Optional[Dict[str, str]] = None
    message: str = ""
    remaining_usage: Optional[int] = None

# 異步處理AI改寫任務（使用獨立線程，真正非阻塞）
def process_ai_rewrite_task_in_thread(task_id: str, request: RewriteRequest):
    """
    在獨立線程中處理AI改寫，真正做到非阻塞
    """
    try:
        # 更新任務狀態為處理中
        task_status[task_id]["status"] = "processing"
        
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            ai_usage_repo = AIUsageRepository(db)
            
            # 設置 OpenAI API 金鑰
            openai.api_key = settings.OPENAI_API_KEY
            
            # 構建prompt，一次生成五種口吻
            prompt = f"""
            你是一位風格百變的賣家，擅長用不同人格風格撰寫商品介紹文案，讓每件商品更生動、吸引人。  
            請根據以下商品資訊，模擬你自己（賣家）在扮演不同風格時，如何在公益市集內，推銷這件商品。  
            每個版本都要**以第一人稱（賣家視角）**說話，**不超過但要接近 220 字**，語氣要鮮明、有畫面、有說服力，要根據使用者的原始描述來做基於角色設定的口吻延伸 。  

            商品資訊：
            - 商品名稱：{request.productName}
            - 賣家暱稱：{request.sellerNickname}
            - 商品定價：NT$ {request.price}
            - 商品狀況：{request.condition}
            - 原始描述：{request.originalDescription}

            *描述生成要求*
            - 每個版本請分為三段以上，每段保持自然長度，段落之間請空一行。不要把所有內容塞在一行中。
            - 請使用到上面提供的所有商品資訊，除了賣家暱稱，如果沒有與商品有關連可不講，但有關聯的話請以第一人稱視角描述。
            - 參考句型僅供參考，不能直接抄襲
            - 強制使用繁體中文，並且要符合台灣的語境和文化習慣。
            - 每個角色的描述都要有獨特的風格和語氣，讓讀者感受到不同的情感和氛圍。

            請撰寫以下五種風格版本的文案，並使用以下 JSON 格式回傳：

            ---

            1. **超級推銷員（professional）**  
            🔹 角色設定：你是一個見多識廣、經驗豐富的專業銷售顧問，擅長用理性分析與清晰邏輯說服顧客，從不花言巧語，而是以數據、案例與專業觀察贏得信任。你相信好的產品自己會說話，而你要做的就是讓人看見它真正的價值。
            🔹 重點：清楚說明商品特色、實用性、價格優勢，讓讀者了解「這東西好在哪、適合誰、為什麼值得買」。  
            ❌ 禁用詞：超美、超好、必買、讚爆、讚到不行  

            ---

            2. **暖心說書人（warm）**
            🔹 角色設定：你是一位溫柔體貼、細膩入微的故事講述者，擅長用生活的片段與真摯的情感打動人心。你相信每件商品都有屬於它的故事，並喜歡透過溫暖的語調和具象的畫面，讓人感受到被陪伴與被理解的幸福感。
            🔹 語氣特徵：
                - 溫柔、敘事、有畫面感，像在講一個貼近生活的小故事。
                - 用詞溫暖、情感細膩，語速平穩，有情感遞進。
                - 避免過度煽情或誇張讚美。
                - 如果使用者有說他跟商品的故事，請在描述中提及這個故事，讓讀者感受到商品的情感連結。
                - 如果使用者沒有說故事，可以用自行發想的方式，想像商品的故事來加強使用場景或情感連結。
            🔹 重點：
                - 參考你的設定來發想你會怎麼推薦這個商品

            ---

            3. **霸道總裁（domineering）**  
            🔹 角色設定：你是一個強勢、自信、情緒勒索、控制欲滿滿，的多金總裁，覺得每個女人都喜歡你。 
            🔹 語氣特徵：。
                - 開場必須表達「唯一歸屬感」的意思  
                - 內容必須帶有「命令與不可拒絕」的語氣   
                - 偶爾會講一些炫富的話，像是我的公司XXX，我的管家XXX，我的車XXX，這些都是我平常的生活。
                - 可以用()在裡面放一些霸道總裁會做的動作            

            🔹 重點：像在吃醋地推銷這件商品，堅決、佔有欲強，不接受拒絕，語氣要無禮且命令感強。  

            ---

            4. **中二の少年（chuuni）**
            🔹 角色設定：你是一個有中二病的少年，總是認為自己被邪惡組織追殺，或是自己有隱藏的黑暗力量。
            🔹 語氣特徵：
                - 你覺得自己是新世界的神，擁有特殊能力，或者平行時空裡還有另一個你。
                - 活在專屬於你的傳說世界裡，現實只是副本。
                - 暗黑系、夢幻風、酷炫元素是你的本命，連綽號都要帥到爆表。
                - 說話愛用技能名稱與中空名詞（例：禁斷的力量、漆黑之炎、命運之環）。

            🔹 重點：
                - 這個商品是你的，參考你的設定來發想你會怎麼推薦這個商品

            ---

            5. **古人（ancient）**

            🔹 語氣特徵：用字典雅、仿古文體、講求修辭與節奏感，像在寫古帖或賣文會的廣告。語氣莊重中帶點風雅，偶爾可略帶機鋒。  

            🔹 重點：
            - 描述商品像是在推薦一件珍品，適合文人雅士、君子閨秀。
            - 用古典詞彙（如「器」、「物」、「良品」、「佳作」、「至寶」、「用之久矣」等）
            - 可仿效古書語氣（如：「夫」、「乃」、「誠」、「豈不妙哉」、「宜乎」、「良可喜也」）
            - 句子可使用對仗、分段有韻（但不用押韻）
            - 提到價錢的時候不能用 NT$

            ❌ 禁用詞：現代用語（ex. CP 值、超讚、推薦）、emoji、英文字母

            ---

            📦 請以以下 JSON 格式回傳（務必使用正確 key）：

            {{
            "professional": "專業推銷員版本",
            "warm": "暖心說書人版本", 
            "domineering": "霸道總裁版本",
            "chuuni": "中二の少年版本",
            "ancient": "古人版本"
            }}" 
        """

            logger.info(f"AI改寫描述請求 - 商品：{request.productName}, Task ID: {task_id}")

            from services.ai_demo import ai_enabled
            if ai_enabled():
                response = openai.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "你是一位風格百變的賣家，擅長用不同人格風格撰寫商品介紹文案。嚴格只輸出純 JSON 物件，鍵為 professional/warm/domineering/chuuni/ancient，值為字串。不要輸出任何解說、前後文或 ``` 區塊。字串中的換行請使用 \\n。"},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1200,  # 增加token限制以避免截斷
                    temperature=0.8,
                    response_format={"type": "json_object"}
                )
                ai_content = response.choices[0].message.content.strip()
            else:
                # Demo 模式：不呼叫 OpenAI，直接用內建的五種風格示範文案
                import json as _demo_json
                ai_content = _demo_json.dumps({
                    "professional": f"【{request.condition}商品】{request.productName} - 由{request.sellerNickname}精心提供。價格實惠、CP 值優異，值得您信賴。（Demo 模式示範文案）",
                    "warm": f"這是來自{request.sellerNickname}的溫馨分享 - {request.productName}。每件商品都承載著美好回憶，希望延續這份溫暖到您手中。💝（Demo 模式示範文案）",
                    "domineering": f"限量珍藏！{request.productName} - 這不是普通商品，而是品味的象徵。識貨之人的專屬機會！（Demo 模式示範文案）",
                    "chuuni": f"⚡傳說級寶物現世⚡ {request.productName}！據說擁有它的人都會獲得神秘力量……勇者{request.sellerNickname}將此神器托付給有緣人！（Demo 模式示範文案）",
                    "ancient": f"夫此{request.productName}者，乃{request.sellerNickname}之珍藏也。物誠不凡，雅士之選。（Demo 模式示範文案）",
                }, ensure_ascii=False)
            logger.info(f"AI回傳內容：{ai_content}")
            
            # 嘗試解析JSON
            import json
            import re
            try:
                # 移除可能的markdown標記
                if ai_content.startswith("```json"):
                    ai_content = ai_content[7:]
                if ai_content.endswith("```"):
                    ai_content = ai_content[:-3]
                
                # 清理和修復JSON字符串
                ai_content = ai_content.strip()
                
                # 先嘗試直接解析
                try:
                    descriptions = json.loads(ai_content)
                except json.JSONDecodeError:
                    logger.warning("首次JSON解析失敗，嘗試修復格式")
                    fixed_content = ai_content
                    
                    # 嘗試修復常見格式（保留原有修復）
                    pattern = r'"(professional|warm|domineering|chuuni|ancient)"\s*:\s*"([\s\S]*?)"(?=\s*,\s*\"(?:professional|warm|domineering|chuuni|ancient)\"\s*:|\s*\})'
                    
                    def fix_string_content(match):
                        key = match.group(1)
                        value = match.group(2)
                        value = value.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
                        value = re.sub(r'(?<!\\)"', '\\"', value)
                        return f'"{key}": "{value}"'
                    
                    fixed_content = re.sub(pattern, fix_string_content, fixed_content, flags=re.DOTALL)
                    if not fixed_content.strip().startswith('{'):
                        fixed_content = '{' + fixed_content
                    if not fixed_content.strip().endswith('}'):
                        fixed_content = fixed_content + '}'
                    fixed_content = re.sub(r',\s*}', '}', fixed_content)
                    
                    try:
                        descriptions = json.loads(fixed_content)
                    except json.JSONDecodeError as e2:
                        logger.warning(f"修復後仍解析失敗：{e2}，改用寬鬆抽取法")
                        descriptions = extract_descriptions_relaxed(ai_content)
                        
                        if not descriptions:
                            logger.error("寬鬆抽取仍失敗，改用手動解析")
                            descriptions = parse_ai_response_manually(ai_content)
                
                logger.info(f"JSON解析成功，獲得 {len(descriptions)} 個描述版本")
                
                # 驗證必要的key是否存在，缺少的用預設值填補
                required_keys = ["professional", "warm", "domineering", "chuuni", "ancient"]
                fallback_descriptions = {
                    "professional": f"【{request.condition}商品】{request.productName} - 由{request.sellerNickname}精心提供。價格實惠，CP值優異，值得您的信賴選擇。",
                    "warm": f"這是來自{request.sellerNickname}的溫馨分享 - {request.productName}。每一件商品都承載著美好的回憶，現在希望能延續這份溫暖到您的手中。💝",
                    "domineering": f"限量珍藏！{request.productName} - 這不是普通的商品，這是品味的象徵。這是給識貨之人的專屬機會！",
                    "chuuni": f"⚡傳說級寶物現世⚡ {request.productName}！據說擁有它的人都會獲得神秘力量... 勇者{request.sellerNickname}將此神器托付給有緣人！",
                    "ancient": f"夫此{request.productName}者，乃{request.sellerNickname}之珍藏也。此物不凡，誠為雅士之選。"
                }
                
                for key in required_keys:
                    if key not in descriptions or not descriptions[key]:
                        descriptions[key] = fallback_descriptions[key]
                
                logger.info(f"AI改寫成功 - 商品：{request.productName}")
                
                # 增加使用次數
                ai_usage_repo.increment_usage(request.userId)
                remaining = ai_usage_repo.get_remaining_usage(request.userId, 5)
                
                # 更新任務狀態為完成
                task_status[task_id].update({
                    "status": "completed",
                    "descriptions": descriptions,
                    "remaining_usage": remaining,
                    "message": "AI改寫完成"
                })
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析失敗：{e}, 原始回應：{ai_content}")
                task_status[task_id].update({
                    "status": "failed",
                    "message": "AI回應格式錯誤"
                })
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"AI改寫描述失敗：{str(e)}")
        
        # 如果API失敗，也要增加使用次數（避免濫用）
        from database import SessionLocal
        db = SessionLocal()
        try:
            ai_usage_repo = AIUsageRepository(db)
            ai_usage_repo.increment_usage(request.userId)
            remaining = ai_usage_repo.get_remaining_usage(request.userId, 5)
        except:
            remaining = 0
        finally:
            db.close()
        
        # 如果API失敗，返回預設的改寫版本
        fallback_descriptions = {
            "professional": f"【{request.condition}商品】{request.productName} - 由{request.sellerNickname}精心提供。{request.originalDescription[:50]}... 定價NT${request.price}，性價比優異，值得您的信賴選擇。",
            "warm": f"這是來自{request.sellerNickname}的溫馨分享 - {request.productName}。{request.originalDescription[:40]}... 每一件商品都承載著美好的回憶，現在希望能延續這份溫暖到您的手中。💝",
            "domineering": f"限量珍藏！{request.productName} - 這不是普通的商品，這是品味的象徵。{request.originalDescription[:40]}... NT${request.price}的價格？這是給識貨之人的專屬機會！",
            "chuuni": f"⚡傳說級寶物現世⚡ {request.productName}！據說擁有它的人都會獲得神秘力量... {request.originalDescription[:40]}... 勇者{request.sellerNickname}將此神器托付給有緣人，只需NT${request.price}！",
            "ancient": f"夫此{request.productName}者，乃{request.sellerNickname}之珍藏也。{request.originalDescription[:30]}... 然則此物，非凡品可比，定價{request.price}銀兩，誠為雅士之選。"
        }
        
        task_status[task_id].update({
            "status": "completed",
            "descriptions": fallback_descriptions,
            "remaining_usage": remaining,
            "message": "使用預設改寫模板"
        })
async def get_ai_usage_status(
    userId: int,
    db: Session = Depends(get_db)
):
    """
    查詢用戶今日AI使用狀態
    """
    try:
        ai_usage_repo = AIUsageRepository(db)
        daily_limit = 5
        
        remaining = ai_usage_repo.get_remaining_usage(userId, daily_limit)
        can_use = ai_usage_repo.can_use_ai(userId, daily_limit)
        
        return {
            "success": True,
            "remaining_usage": remaining,
            "daily_limit": daily_limit,
            "can_use": can_use
        }
    except Exception as e:
        logger.error(f"查詢AI使用狀態失敗：{str(e)}")
        return {
            "success": False,
            "message": "查詢失敗",
            "remaining_usage": 0,
            "daily_limit": 5,
            "can_use": False
        }

@router.get("/usage-status", response_model=dict)
async def get_ai_usage_status(
    userId: int,
    db: Session = Depends(get_db)
):
    """
    查詢用戶今日AI使用狀態
    """
    try:
        ai_usage_repo = AIUsageRepository(db)
        daily_limit = 5
        
        remaining = ai_usage_repo.get_remaining_usage(userId, daily_limit)
        can_use = ai_usage_repo.can_use_ai(userId, daily_limit)
        
        return {
            "success": True,
            "remaining_usage": remaining,
            "daily_limit": daily_limit,
            "can_use": can_use
        }
    except Exception as e:
        logger.error(f"查詢AI使用狀態失敗：{str(e)}")
        return {
            "success": False,
            "message": "查詢失敗",
            "remaining_usage": 0,
            "daily_limit": 5,
            "can_use": False
        }

@router.get("/task-status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    查詢AI改寫任務狀態
    """
    cleanup_expired_tasks()  # 清理過期任務
    
    if task_id not in task_status:
        raise HTTPException(status_code=404, detail="任務不存在或已過期")
    
    task_info = task_status[task_id]
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task_info["status"],
        descriptions=task_info.get("descriptions"),
        message=task_info.get("message", ""),
        remaining_usage=task_info.get("remaining_usage")
    )

@router.post("/rewrite-description", response_model=RewriteResponse)
async def rewrite_product_description(
    request: RewriteRequest, 
    db: Session = Depends(get_db)
):
    """
    AI改寫商品描述 - 異步處理，立即返回任務ID
    每日限制使用5次
    """
    try:
        # 檢查用戶今日AI使用配額
        ai_usage_repo = AIUsageRepository(db)
        daily_limit = 5
        
        if not ai_usage_repo.can_use_ai(request.userId, daily_limit):
            remaining = ai_usage_repo.get_remaining_usage(request.userId, daily_limit)
            return RewriteResponse(
                success=False,
                message=f"今日AI改寫次數已用完，每日限制{daily_limit}次。明天再來試試吧！",
                remaining_usage=remaining
            )
        
        # 生成任務ID
        task_id = str(uuid.uuid4())
        
        # 初始化任務狀態
        task_status[task_id] = {
            "status": "pending",
            "created_at": datetime.now(),
            "user_id": request.userId
        }
        
        # 啟動獨立線程處理AI改寫
        thread = threading.Thread(target=process_ai_rewrite_task_in_thread, args=(task_id, request))
        thread.start()
        
        logger.info(f"AI改寫任務已建立 - Task ID: {task_id}, 商品：{request.productName}")
        
        return RewriteResponse(
            success=True,
            task_id=task_id,
            message="AI改寫任務已開始，請稍後查詢結果"
        )
        
    except Exception as e:
        logger.error(f"建立AI改寫任務失敗：{str(e)}")
        raise HTTPException(status_code=500, detail="服務暫時無法使用，請稍後再試")

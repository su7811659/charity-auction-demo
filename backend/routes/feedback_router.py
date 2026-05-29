"""
回饋信箱 API
只使用 Google Sheets 儲存，不使用資料庫
"""

from fastapi import APIRouter, HTTPException
import os
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials
from config import settings
from schemas.feedback_schema import FeedbackRequest, FeedbackResponse, FeedbackListResponse

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

def get_google_sheets_client():
    """初始化 Google Sheets 客戶端"""
    try:
        # 設定 Google Sheets API 權限範圍
        scope = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        
        # 載入憑證
        credentials_path = os.path.join(os.path.dirname(__file__), '..', 'google_credentials.json')
        
        if not os.path.exists(credentials_path):
            raise Exception(f"找不到憑證檔案: {credentials_path}")
        
        # 使用 Service Account 憑證
        credentials = Credentials.from_service_account_file(
            credentials_path,
            scopes=scope
        )
        
        # 建立 gspread 客戶端
        client = gspread.authorize(credentials)
        return client
        
    except Exception as e:
        raise Exception(f"Google Sheets 客戶端初始化失敗: {str(e)}")

def submit_to_google_sheets(name: str, feedback: str, feedback_type: str = "其他", email: str = ""):
    """提交回饋到 Google Sheets"""
    try:
        client = get_google_sheets_client()
        spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
        worksheet = spreadsheet.sheet1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # 檢查是否有標題列，如果沒有則新增
        try:
            header_values = worksheet.row_values(1)
            if not header_values or len(header_values) < 5:
                worksheet.update('A1:E1', [['時間', '姓名', '回饋類型', '回饋內容', '開發者回覆']])
        except:
            worksheet.update('A1:E1', [['時間', '姓名', '回饋類型', '回饋內容', '開發者回覆']])
        
        # 使用email作為識別，但顯示name
        identifier = email if email else name
        new_row = [timestamp, identifier, feedback_type, feedback, ""]  # 最後一欄是開發者回覆，初始為空
        worksheet.append_row(new_row)
        return {"success": True, "timestamp": timestamp, "method": "Google Sheets"}
    except Exception as e:
        raise Exception(f"提交到 Google Sheets 失敗: {str(e)}")

def submit_to_local_backup(name: str, feedback: str, feedback_type: str = "其他", email: str = ""):
    """本地備用儲存方案"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        identifier = email if email else name
        log_entry = f"{timestamp},{identifier},{feedback_type},{feedback},\n"  # 最後一欄是開發者回覆，初始為空
        logs_dir = "feedback_logs"
        os.makedirs(logs_dir, exist_ok=True)
        log_file = os.path.join(logs_dir, f"feedback_{datetime.now().strftime('%Y-%m')}.csv")
        if not os.path.exists(log_file):
            with open(log_file, "w", encoding="utf-8") as f:
                f.write("時間,姓名,回饋類型,回饋內容,開發者回覆\n")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
        return {"success": True, "timestamp": timestamp, "method": "本地儲存"}
    except Exception as e:
        raise Exception(f"本地儲存失敗: {str(e)}")

@router.post("/submit")
async def submit_feedback(feedback_request: FeedbackRequest):
    """提交回饋"""
    try:
        # 先嘗試 Google Sheets，失敗則用本地儲存
        try:
            result = submit_to_google_sheets(
                feedback_request.name,
                feedback_request.feedback,
                feedback_request.feedbackType,
                feedback_request.email
            )
        except Exception as sheets_error:
            print(f"Google Sheets 提交失敗: {sheets_error}")
            result = submit_to_local_backup(
                feedback_request.name,
                feedback_request.feedback,
                feedback_request.feedbackType,
                feedback_request.email
            )
        
        return {
            "success": True,
            "message": "回饋已成功提交！", 
            "timestamp": result["timestamp"],
            "method": result["method"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_feedback_system():
    """測試回饋系統"""
    try:
        # 先嘗試 Google Sheets
        try:
            test_result = submit_to_google_sheets(
                "測試用戶",
                "這是一個測試回饋",
                "系統測試"
            )
        except Exception as sheets_error:
            print(f"Google Sheets 測試失敗: {sheets_error}")
            test_result = submit_to_local_backup(
                "測試用戶",
                "這是一個測試回饋",
                "系統測試"
            )
        
        return {
            "message": "回饋系統測試成功",
            "method": test_result["method"],
            "timestamp": test_result["timestamp"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"測試失敗: {str(e)}")

@router.get("/logs")
async def get_feedback_logs():
    """獲取回饋日誌（管理員用）"""
    try:
        all_logs = []
        
        # 先嘗試從 Google Sheets 讀取
        try:
            client = get_google_sheets_client()
            spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
            worksheet = spreadsheet.sheet1
            
            # 獲取所有資料
            records = worksheet.get_all_records()
            
            for record in records:
                all_logs.append({
                    "timestamp": record.get("時間", ""),
                    "name": record.get("姓名", ""),
                    "feedback_type": record.get("回饋類型", ""),
                    "feedback": record.get("回饋內容", "")
                })
            
            return {
                "logs": all_logs[:50],  # 只返回最近 50 筆
                "total": len(all_logs),
                "source": "Google Sheets",
                "message": f"從 Google Sheets 獲取 {len(all_logs)} 筆回饋紀錄"
            }
            
        except Exception as sheets_error:
            print(f"從 Google Sheets 讀取失敗: {sheets_error}")
            
            # 如果 Google Sheets 失敗，讀取本地檔案
            logs_dir = "feedback_logs"
            if not os.path.exists(logs_dir):
                return {"logs": [], "message": "尚無回饋紀錄", "source": "本地儲存"}
            
            log_files = [f for f in os.listdir(logs_dir) if f.endswith('.csv')]
            
            for log_file in sorted(log_files, reverse=True):
                file_path = os.path.join(logs_dir, log_file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        for line in lines[1:]:  # 跳過標題列
                            if line.strip():
                                parts = line.strip().split(',', 3)
                                if len(parts) >= 4:
                                    all_logs.append({
                                        "timestamp": parts[0],
                                        "name": parts[1],
                                        "feedback_type": parts[2],
                                         "feedback": parts[3]
                                    })
                                elif len(parts) >= 3:  # 兼容舊格式
                                    all_logs.append({
                                        "timestamp": parts[0],
                                        "name": parts[1],
                                        "feedback_type": "其他",
                                        "feedback": parts[2]
                                    })
                except Exception as e:
                    print(f"讀取檔案 {log_file} 失敗: {e}")
            
            return {
                "logs": all_logs[:50],  # 只返回最近 50 筆
                "total": len(all_logs),
                "source": "本地儲存",
                "message": f"從本地檔案獲取 {len(all_logs)} 筆回饋紀錄"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取日誌失敗: {str(e)}")

@router.get("/user/{user_email}", response_model=FeedbackListResponse)
async def get_user_feedbacks(user_email: str):
    """獲取特定用戶的回饋記錄"""
    try:
        user_feedbacks = []
        
        # 先嘗試從 Google Sheets 讀取
        try:
            client = get_google_sheets_client()
            spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
            worksheet = spreadsheet.sheet1
            
            # 獲取所有資料
            all_values = worksheet.get_all_values()
            
            # 檢查標題列
            if not all_values:
                return {"feedbacks": [], "message": "尚無回饋紀錄"}
            
            headers = all_values[0]
            
            # 確保有足夠的欄位，如果沒有"開發者回覆"欄位則添加
            if len(headers) < 5:
                # 更新標題列，添加"開發者回覆"欄位
                new_headers = ['時間', '姓名', '回饋類型', '回饋內容', '開發者回覆']
                worksheet.update('A1:E1', [new_headers])
                headers = new_headers
            
            # 遍歷每一行資料（跳過標題列）
            for row_index, row in enumerate(all_values[1:], start=2):
                if len(row) >= 2:  # 至少要有時間和姓名
                    # 檢查姓名是否匹配（可能是email或從email提取的名稱）
                    name_in_sheet = row[1] if len(row) > 1 else ""
                    
                    # 匹配條件：完全匹配email 或 匹配email的用戶名部分
                    user_name = user_email.split('@')[0] if '@' in user_email else user_email
                    
                    if (name_in_sheet == user_email or 
                        name_in_sheet == user_name or
                        (name_in_sheet != '匿名' and user_email.startswith(name_in_sheet))):
                        
                        feedback_record = {
                            "feedback_id": row_index,  # 使用試算表的列數作為回饋編號
                            "timestamp": row[0] if len(row) > 0 else "",
                            "name": row[1] if len(row) > 1 else "",
                            "feedback_type": row[2] if len(row) > 2 else "其他",
                            "feedback": row[3] if len(row) > 3 else "",
                            "developer_reply": row[4] if len(row) > 4 else ""
                        }
                        user_feedbacks.append(feedback_record)
            
            # 按時間倒序排列（最新的在前）
            user_feedbacks.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return {
                "feedbacks": user_feedbacks,
                "total": len(user_feedbacks),
                "source": "Google Sheets",
                "message": f"找到 {len(user_feedbacks)} 筆回饋紀錄"
            }
            
        except Exception as sheets_error:
            print(f"從 Google Sheets 讀取用戶回饋失敗: {sheets_error}")
            
            # 如果 Google Sheets 失敗，讀取本地檔案
            logs_dir = "feedback_logs"
            if not os.path.exists(logs_dir):
                return {"feedbacks": [], "message": "尚無回饋紀錄", "source": "本地儲存"}
            
            log_files = [f for f in os.listdir(logs_dir) if f.endswith('.csv')]
            feedback_id = 1
            
            for log_file in sorted(log_files):
                file_path = os.path.join(logs_dir, log_file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        for line in lines[1:]:  # 跳過標題列
                            if line.strip():
                                parts = line.strip().split(',', 4)
                                if len(parts) >= 3:
                                    name_in_file = parts[1]
                                    user_name = user_email.split('@')[0] if '@' in user_email else user_email
                                    
                                    if (name_in_file == user_email or 
                                        name_in_file == user_name or
                                        (name_in_file != '匿名' and user_email.startswith(name_in_file))):
                                        
                                        feedback_record = {
                                            "feedback_id": feedback_id,
                                            "timestamp": parts[0],
                                            "name": parts[1],
                                            "feedback_type": parts[2] if len(parts) > 2 else "其他",
                                            "feedback": parts[3] if len(parts) > 3 else "",
                                            "developer_reply": parts[4] if len(parts) > 4 else ""
                                        }
                                        user_feedbacks.append(feedback_record)
                                
                                feedback_id += 1
                except Exception as e:
                    print(f"讀取檔案 {log_file} 失敗: {e}")
            
            # 按時間倒序排列
            user_feedbacks.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return {
                "feedbacks": user_feedbacks,
                "total": len(user_feedbacks),
                "source": "本地儲存",
                "message": f"找到 {len(user_feedbacks)} 筆回饋紀錄"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取用戶回饋失敗: {str(e)}")

@router.get("/sheets-info")
async def get_sheets_info():
    """獲取 Google Sheets 資訊（測試用）"""
    try:
        client = get_google_sheets_client()
        spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
        
        return {
            "spreadsheet_title": spreadsheet.title,
            "spreadsheet_id": settings.GOOGLE_SPREADSHEET_ID,
            "worksheet_count": len(spreadsheet.worksheets()),
            "first_worksheet_title": spreadsheet.sheet1.title,
            "row_count": spreadsheet.sheet1.row_count,
            "col_count": spreadsheet.sheet1.col_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取 Sheets 資訊失敗: {str(e)}")

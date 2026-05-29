import cloudinary
import cloudinary.uploader
import os

# Cloudinary 設定改由環境變數載入（demo 預設留空，未設定時自動退回本機儲存）
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
)

CLOUDINARY_ENABLED = bool(os.getenv("CLOUDINARY_CLOUD_NAME"))

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

# 確保本地上傳資料夾存在
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def save_local_image(image, filename: str) -> str:
    """
    將圖片存到本機 uploads/ 資料夾，並回傳本機路徑
    """
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(image)
    return file_path

def upload_to_cloudinary(image_path: str) -> str:
    """
    將圖片上傳到 Cloudinary 並回傳公開 URL
    """
    try:
        response = cloudinary.uploader.upload(image_path)
        return response["secure_url"]  # ✅ 取得公開圖片網址
    except Exception as e:
        print(f"⚠️ Cloudinary 上傳失敗: {e}")
        return None

def handle_image_upload(image, filename: str) -> str:
    """
    處理圖片上傳：
    1. 先存到本機
    2. 若有設定 Cloudinary 則上傳並回傳公開網址；否則退回本機 /uploads/ 路徑
    """
    save_local_image(image, filename)

    # demo 模式（未設定 Cloudinary）：直接回傳本機靜態路徑
    if not CLOUDINARY_ENABLED:
        return f"/uploads/{filename}"

    cloud_url = upload_to_cloudinary(os.path.join(UPLOAD_DIR, filename))
    return cloud_url if cloud_url else f"/uploads/{filename}"

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from utils.image_uploader import handle_image_upload
import uuid

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("", summary="上傳圖片並取得 URL")
async def upload_image(file: UploadFile = File(...)):
    try:
        filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        image_bytes = await file.read()
        url = handle_image_upload(image_bytes, filename)

        if not url:
            raise HTTPException(status_code=500, detail="圖片上傳失敗")

        return {"url": url}
    except Exception as e:
        print(f"❌ 上傳錯誤: {e}")
        raise HTTPException(status_code=500, detail="圖片上傳發生錯誤")

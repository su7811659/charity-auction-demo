from fastapi import HTTPException, Depends
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import httpx
from fastapi.security import OAuth2PasswordBearer
from config import settings
from typing import Union, Tuple
from sqlalchemy.orm import Session
from schemas.user_schema import UserCreate
from .user_service import init_user_if_not_exist

JWT_SECRET = settings.ADMIN_SECRET  # 建議改成用環境變數載入
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 120  # Token 有效時間（分鐘）

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

SSO_SERVER_URL = settings.SSO_SERVER_HOST

async def verify_session_and_generate_token(raw_cookie: str, return_email: bool = False) -> Union[str, Tuple[str, str]]:
    # ✅ 驗證格式
    if not raw_cookie.startswith("key="):
        raise Exception("cookie 格式錯誤，應以 key= 開頭")

    # ✅ 傳給 M2K 的 check_session，需整段送出
    headers = {
        "Cookie": raw_cookie
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SSO_SERVER_URL}/cgi-bin/check_session", headers=headers)

    if resp.status_code != 200 or "X-M2K-Session" not in resp.headers:
        raise Exception("無效的 M2K session")

    # ✅ 從 raw_cookie 中擷取 email
    cookie_value = raw_cookie[4:]  # 去掉 "key="
    dot_index = cookie_value.find('.')
    colon_index = cookie_value.find(':', dot_index)

    if dot_index == -1 or colon_index == -1:
        raise Exception("cookie 格式錯誤，無法擷取 email")

    email = cookie_value[dot_index + 1:colon_index]
    now_utc = datetime.now(timezone.utc)
    # ✅ 產生 JWT
    payload = {
        "sub": email,
        "exp": (now_utc + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp(),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return (token, email) if return_email else token


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        exp = payload.get("exp")
        current_timestamp = datetime.now(timezone.utc).timestamp()
        
        print(f"Token validation - Email: {email}")
        print(f"Token expires at: {exp} ({datetime.fromtimestamp(exp, timezone.utc)} UTC)")
        print(f"Current time: {current_timestamp} ({datetime.now(timezone.utc)} UTC)")
        print(f"Time remaining: {exp - current_timestamp} seconds")
        
        if not email or current_timestamp > exp:
            print(f"Token expired or invalid - Current: {current_timestamp}, Exp: {exp}")
            raise HTTPException(status_code=401, detail="Token expired or invalid")
        return email
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

from typing import Optional

def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        exp = payload.get("exp")
        if not email or datetime.now(timezone.utc).timestamp() > exp:
            return None
        return email
    except JWTError:
        return None

def dev_generate_token_from_email(email: str, db: Session) -> str:
    init_user_if_not_exist(db, UserCreate(email=email))

    now_utc = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "exp": (now_utc + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
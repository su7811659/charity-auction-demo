from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.auth_service import verify_session_and_generate_token, get_current_user, dev_generate_token_from_email
from services.user_service import init_user_if_not_exist
from schemas.user_schema import UserCreate
from database import SessionLocal
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm


router = APIRouter(prefix="/api")

class SsoLoginRequest(BaseModel):
    cookie: str

class DevLoginRequest(BaseModel):
    email: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/auth/sso")
async def sso_login(data: SsoLoginRequest, db: Session = Depends(get_db)):
    try:
        token, email = await verify_session_and_generate_token(data.cookie, return_email=True)

        init_user_if_not_exist(db, UserCreate(email=email)) #create user if not exist

        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")
    
@router.get("/me")
def get_me(email: str = Depends(get_current_user)):
    return { "email": email }


@router.post("/auth/dev-login")
def dev_login(data: DevLoginRequest, db: Session = Depends(get_db)):
    token = dev_generate_token_from_email(data.email, db)
    return { "token": token }


# Demo accounts for the public demo. These are intentionally simple — this is a
# portfolio demo, not a production system.
FIXED_USERS = {
    "demo@bidforgood.com": "demo1234",
    "admin@bidforgood.com": "demo1234",
}

@router.post("/token")
def token_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username
    password = form_data.password

    # 驗證固定帳密
    if email not in FIXED_USERS or FIXED_USERS[email] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 產生 token
    token = dev_generate_token_from_email(email, db)

    # 確保 user 存在
    init_user_if_not_exist(db, UserCreate(email=email))

    return {
        "access_token": token,
        "token_type": "bearer"
    }
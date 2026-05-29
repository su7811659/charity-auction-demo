from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from schemas.product_schema import Product
import logging

logger = logging.getLogger(__name__)

class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all_products(self):
        return self.db.query(Product).all()

    def get_approved_products(self):
        return self.db.query(Product).filter(Product.is_approve == True).all()

    def get_product_by_id(self, product_id: int):
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_approved_product_by_id(self, product_id: int):
        return self.db.query(Product).filter(Product.id == product_id, Product.is_approve == True).first()

    def get_user_upload_count(self, user_id: int) -> int:
        """獲取用戶上傳的商品數量"""
        try:
            return self.db.query(Product).filter(Product.user_id == user_id).count()
        except Exception as e:
            logger.error(f"獲取用戶上傳數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def get_user_high_donation_products(self, user_id: int, donation_percentage: int = 60) -> list:
        """獲取用戶捐贈比例高於指定值的商品"""
        try:
            # 假設 Product 模型有 donation_percentage 欄位
            return self.db.query(Product).filter(
                and_(
                    Product.user_id == user_id,
                    Product.donation_percentage >= donation_percentage
                )
            ).all()
        except Exception as e:
            logger.error(f"獲取高捐贈商品失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return []

    def get_user_sold_products_count(self, user_id: int) -> int:
        """獲取用戶成功售出的商品數量"""
        try:
            # 假設有售出狀態欄位
            return self.db.query(Product).filter(
                and_(
                    Product.user_id == user_id,
                    Product.is_sold == True
                )
            ).count()
        except Exception as e:
            logger.error(f"獲取售出商品數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

# 為了向後兼容，保留原有的函數形式
def get_all_products(db: Session):
    repo = ProductRepository(db)
    return repo.get_all_products()

def get_approved_products(db: Session):
    repo = ProductRepository(db)
    return repo.get_approved_products()

def get_product_by_id(db: Session, product_id: int):
    repo = ProductRepository(db)
    return repo.get_product_by_id(product_id)

def get_approved_product_by_id(db: Session, product_id: int):
    repo = ProductRepository(db)
    return repo.get_approved_product_by_id(product_id)

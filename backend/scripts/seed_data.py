#!/usr/bin/env python3
"""
Script to seed the database with fake product data for testing
"""

import random
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from schemas.product_schema import Product
from datetime import datetime, timezone

# Sample data for generating fake products
SELLER_NAMES = [
    "張小明", "李小華", "王小美", "陳小強", "林小芳", 
    "黃小偉", "劉小玲", "吳小傑", "蔡小雅", "許小豪"
]

SELLER_NICKNAMES = [
    "愛心小天使", "公益達人", "慈善家", "溫暖使者", "希望之光",
    "愛心媽媽", "公益爸爸", "慈善小王子", "溫暖小公主", "希望之星"
]

PRODUCT_NAMES = [
    "iPhone 14 Pro", "MacBook Air", "iPad Pro", "AirPods Pro", "Apple Watch",
    "Sony 電視", "Nintendo Switch", "PS5", "Xbox Series X", "Canon 相機",
    "Nike 運動鞋", "Adidas 外套", "Uniqlo 衣服", "Zara 包包", "H&M 褲子",
    "星巴克保溫杯", "無印良品文具", "IKEA 家具", "小米手機", "華為平板"
]

DESCRIPTIONS = [
    "全新未拆封，原廠保固中",
    "九成新，使用不到一年",
    "八成新，功能完全正常",
    "七成新，有輕微使用痕跡",
    "六成新，適合預算有限的買家",
    "五成新，價格實惠",
    "四成新，需要一些保養",
    "三成新，適合DIY修復",
    "二手商品，狀況如圖所示",
    "朋友贈送，用不到所以出售"
]

IMAGE_URLS = [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
]

AI_COMMENTS = [
    "這是一個非常實用的商品，品質優良",
    "性價比很高，值得推薦",
    "適合送禮或自用都很不錯",
    "商品狀況良好，可以放心購買",
    "價格合理，物超所值",
    "品牌值得信賴，品質有保障",
    "功能齊全，使用方便",
    "外觀精美，做工精細",
    "實用性強，推薦購買",
    "品質穩定，值得信賴"
]

AI_FIT_OWNERS = [
    "適合學生族群",
    "適合上班族",
    "適合家庭主婦",
    "適合科技愛好者",
    "適合運動愛好者",
    "適合時尚人士",
    "適合實用主義者",
    "適合收藏家",
    "適合DIY愛好者",
    "適合預算有限的買家"
]

def generate_fake_product():
    """Generate a single fake product with strict dependency logic"""
    price = random.randint(100, 10000)

    # 審核狀態
    is_approve = random.choice([True, False])
    is_rejected = False if is_approve else random.choice([True, False])

    # 商品狀態（若被否決只能是 0）
    if is_rejected:
        product_status = 0
    else:
        product_status = random.choice([0, 1, 2])

    # 成交狀態與金流欄位
    if product_status == 2:
        buyer_name = random.choice(SELLER_NAMES)
        donation_ratio = random.choice([0, 20, 40, 60, 80, 100])
        donation_amount = round(price * donation_ratio / 100)
        seller_income = price - donation_amount
    else:
        buyer_name = None
        donation_ratio = random.choice([0, 20, 40, 60, 80, 100])
        donation_amount = None
        seller_income = None

    return {
        "seller_name": random.choice(SELLER_NAMES),
        "seller_nickname": random.choice(SELLER_NICKNAMES),
        "product_name": random.choice(PRODUCT_NAMES),
        "price": price,
        "condition": random.randint(1, 4),
        "description": random.choice(DESCRIPTIONS),
        "image_url": random.choice(IMAGE_URLS),
        "ai_rating": random.randint(1, 5),
        "ai_comment": random.choice(AI_COMMENTS),
        "ai_fit_owner": random.choice(AI_FIT_OWNERS),
        "product_status": product_status,
        "buyer_name": buyer_name,
        "is_approve": is_approve,
        "is_rejected": is_rejected,
        "donation_ratio": donation_ratio,
        "seller_income": seller_income,
        "donation_amount": donation_amount,
        "created_at": datetime.now(timezone.utc),
    }


def seed_products(num_products=50):
    """Seed the database with fake products"""
    db = SessionLocal()
    try:
        print(f"Generating {num_products} fake products...")
        
        for i in range(num_products):
            product_data = generate_fake_product()
            product = Product(**product_data)
            db.add(product)
            
            if (i + 1) % 10 == 0:
                print(f"Created {i + 1} products...")
        
        db.commit()
        print(f"Successfully created {num_products} fake products!")
        
        # Print some statistics
        total_products = db.query(Product).count()
        approved_products = db.query(Product).filter(Product.is_approve == True).count()
        sold_products = db.query(Product).filter(Product.product_status == 2).count()
        
        print(f"\nDatabase Statistics:")
        print(f"Total products: {total_products}")
        print(f"Approved products: {approved_products}")
        print(f"Sold products: {sold_products}")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

def clear_all_products():
    """Clear all products from the database (use with caution!)"""
    db = SessionLocal()
    try:
        count = db.query(Product).count()
        db.query(Product).delete()
        db.commit()
        print(f"Deleted {count} products from the database")
    except Exception as e:
        print(f"Error clearing data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "clear":
            confirm = input("Are you sure you want to delete ALL products? (yes/no): ")
            if confirm.lower() == "yes":
                clear_all_products()
            else:
                print("Operation cancelled")
        elif command.isdigit():
            seed_products(int(command))
        else:
            print("Usage: python seed_data.py [number_of_products|clear]")
    else:
        # Default: create 50 products
        seed_products(50) 
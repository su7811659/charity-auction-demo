#!/usr/bin/env python3
"""
Script to seed the database with fake product data for testing
"""

import random
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, engine, Base
import models  # 註冊所有 ORM models，確保建表完整
from schemas.product_schema import Product

# 確保資料表存在（在尚未啟動 app 就先 seed 的情境，例如部署時）
Base.metadata.create_all(bind=engine)
from datetime import datetime, timezone

# Sample data for generating fake products
SELLER_NAMES = [
    "Alex Chen", "Jamie Lee", "Taylor Wang", "Jordan Lin", "Casey Huang",
    "Morgan Liu", "Riley Wu", "Sam Tsai", "Avery Hsu", "Quinn Yang"
]

SELLER_NICKNAMES = [
    "KindAngel", "CharityPro", "TheGiver", "WarmHeart", "HopeBringer",
    "CaringMom", "GenerousDad", "PrinceOfGood", "KindPrincess", "StarOfHope"
]

PRODUCT_NAMES = [
    "iPhone 14 Pro", "MacBook Air", "iPad Pro", "AirPods Pro", "Apple Watch",
    "Sony TV", "Nintendo Switch", "PS5", "Xbox Series X", "Canon Camera",
    "Nike Sneakers", "Adidas Jacket", "Uniqlo Shirt", "Zara Bag", "H&M Pants",
    "Starbucks Tumbler", "Muji Stationery", "IKEA Furniture", "Xiaomi Phone", "Huawei Tablet"
]

DESCRIPTIONS = [
    "Brand new, factory sealed, still under warranty",
    "Like new, used for less than a year",
    "80% new, fully functional",
    "70% new, minor signs of use",
    "60% new, great for a tight budget",
    "50% new, very affordable",
    "40% new, needs a little care",
    "30% new, good for a DIY fix",
    "Second-hand, condition as shown in the photos",
    "A gift I never used, so passing it on"
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
    "A very practical item with great quality",
    "Excellent value for money, highly recommended",
    "Perfect as a gift or for yourself",
    "In good condition, buy with confidence",
    "Reasonably priced and well worth it",
    "A trusted brand with guaranteed quality",
    "Fully featured and easy to use",
    "Beautiful design with fine craftsmanship",
    "Highly practical, recommended",
    "Stable, reliable quality"
]

AI_FIT_OWNERS = [
    "Great for students",
    "Great for office workers",
    "Great for homemakers",
    "Great for tech lovers",
    "Great for sports enthusiasts",
    "Great for the fashion-conscious",
    "Great for practical-minded people",
    "Great for collectors",
    "Great for DIY lovers",
    "Great for budget-conscious buyers"
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
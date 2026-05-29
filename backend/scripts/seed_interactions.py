#!/usr/bin/env python3
"""
Script to add fake likes and comments to existing products
"""

import random
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from schemas.product_schema import Product
from schemas.like_schema import Like
from schemas.comment_schema import Comment
from datetime import datetime, timezone

# Sample comment content
COMMENT_CONTENTS = [
    "看起來很不錯！",
    "價格合理，考慮購買",
    "商品狀況如何？",
    "可以議價嗎？",
    "有興趣，請聯絡我",
    "品質看起來很好",
    "適合送禮嗎？",
    "有保固嗎？",
    "可以面交嗎？",
    "商品還在嗎？",
    "很喜歡這個商品",
    "性價比很高",
    "賣家很友善",
    "交易很順利",
    "推薦這個賣家",
    "商品符合描述",
    "包裝很完整",
    "出貨很快",
    "服務很好",
    "下次還會購買"
]

def add_fake_likes(num_likes=100):
    """Add fake likes to random products"""
    db = SessionLocal()
    try:
        # Get all product IDs
        product_ids = [p.id for p in db.query(Product).all()]
        if not product_ids:
            print("No products found in database. Please run seed_data.py first.")
            return
        
        print(f"Adding {num_likes} fake likes...")
        
        likes_added = 0
        attempts = 0
        max_attempts = num_likes * 3  # Allow some retries
        
        while likes_added < num_likes and attempts < max_attempts:
            try:
                user_id = random.randint(1, 20)  # Random user IDs 1-20
                product_id = random.choice(product_ids)
                
                # Check if like already exists
                existing_like = db.query(Like).filter(
                    Like.user_id == user_id, 
                    Like.product_id == product_id
                ).first()
                
                if not existing_like:
                    like = Like(user_id=user_id, product_id=product_id)
                    db.add(like)
                    db.commit()  # Commit each like individually
                    likes_added += 1
                
                attempts += 1
            except Exception as e:
                # If there's an error, rollback and continue
                db.rollback()
                attempts += 1
                continue
        
        print(f"Successfully added {likes_added} likes!")
        
    except Exception as e:
        print(f"Error adding likes: {e}")
        db.rollback()
    finally:
        db.close()

def add_fake_comments(num_comments=50):
    """Add fake comments to random products"""
    db = SessionLocal()
    try:
        # Get all product IDs
        product_ids = [p.id for p in db.query(Product).all()]
        if not product_ids:
            print("No products found in database. Please run seed_data.py first.")
            return
        
        print(f"Adding {num_comments} fake comments...")
        
        for i in range(num_comments):
            product_id = random.choice(product_ids)
            content = random.choice(COMMENT_CONTENTS)
            
            comment = Comment(
                product_id=product_id,
                content=content,
                created_at=datetime.now(timezone.utc)
            )
            db.add(comment)
            
            if (i + 1) % 10 == 0:
                print(f"Added {i + 1} comments...")
        
        db.commit()
        print(f"Successfully added {num_comments} comments!")
        
    except Exception as e:
        print(f"Error adding comments: {e}")
        db.rollback()
    finally:
        db.close()

def show_statistics():
    """Show current database statistics"""
    db = SessionLocal()
    try:
        total_products = db.query(Product).count()
        total_likes = db.query(Like).count()
        total_comments = db.query(Comment).count()
        
        print(f"\nCurrent Database Statistics:")
        print(f"Total products: {total_products}")
        print(f"Total likes: {total_likes}")
        print(f"Total comments: {total_comments}")
        
        if total_products > 0:
            avg_likes = total_likes / total_products
            avg_comments = total_comments / total_products
            print(f"Average likes per product: {avg_likes:.1f}")
            print(f"Average comments per product: {avg_comments:.1f}")
        
    except Exception as e:
        print(f"Error getting statistics: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "likes":
            num = int(sys.argv[2]) if len(sys.argv) > 2 else 100
            add_fake_likes(num)
        elif command == "comments":
            num = int(sys.argv[2]) if len(sys.argv) > 2 else 50
            add_fake_comments(num)
        elif command == "stats":
            show_statistics()
        elif command == "all":
            add_fake_likes(100)
            add_fake_comments(50)
            show_statistics()
        else:
            print("Usage: python seed_interactions.py [likes|comments|stats|all] [number]")
    else:
        # Default: add both likes and comments
        add_fake_likes(100)
        add_fake_comments(50)
        show_statistics() 
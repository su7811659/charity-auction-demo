#!/usr/bin/env python3
"""
Script to query and display all products from the database
"""

from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from schemas.product_schema import Product
from datetime import datetime

def query_all_products():
    """Query and display all products"""
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        
        print(f"📦 Found {len(products)} products in database:")
        print("=" * 80)
        
        for i, product in enumerate(products, 1):
            print(f"\n{i}. Product ID: {product.id}")
            print(f"   Name: {product.product_name}")
            print(f"   Seller: {product.seller_name} ({product.seller_nickname})")
            print(f"   Price: ${product.price:,.2f}")
            print(f"   Condition: {product.condition}/4")
            print(f"   Status: {product.product_status} (0=未到貨, 1=待成交, 2=已成交)")
            print(f"   Approved: {'✅' if product.is_approve else '❌'}")
            print(f"   Donation Ratio: {product.donation_ratio}%")
            if product.buyer_name:
                print(f"   Buyer: {product.buyer_name}")
            if product.ai_rating:
                print(f"   AI Rating: {product.ai_rating}/5")
            if product.ai_comment:
                print(f"   AI Comment: {product.ai_comment[:50]}...")
            print(f"   Created: {product.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error querying products: {e}")
    finally:
        db.close()

def query_products_by_status(status=None):
    """Query products by status"""
    db = SessionLocal()
    try:
        if status is not None:
            products = db.query(Product).filter(Product.product_status == status).all()
            status_names = {0: "未到貨", 1: "待成交", 2: "已成交"}
            print(f"📦 Found {len(products)} products with status {status} ({status_names.get(status, 'Unknown')}):")
        else:
            products = db.query(Product).all()
            print(f"📦 Found {len(products)} products:")
        
        print("=" * 60)
        
        for i, product in enumerate(products, 1):
            print(f"{i:2d}. ID:{product.id:3d} | {product.product_name[:30]:<30} | ${product.price:>8,.0f} | Status:{product.product_status}")
            
    except Exception as e:
        print(f"Error querying products: {e}")
    finally:
        db.close()

def query_products_summary():
    """Show summary statistics"""
    db = SessionLocal()
    try:
        total = db.query(Product).count()
        approved = db.query(Product).filter(Product.is_approve == True).count()
        pending = db.query(Product).filter(Product.is_approve == False).count()
        sold = db.query(Product).filter(Product.product_status == 2).count()
        available = db.query(Product).filter(Product.product_status == 1).count()
        
        print("📊 Product Summary:")
        print("=" * 40)
        print(f"Total Products: {total}")
        print(f"Approved: {approved}")
        print(f"Pending Approval: {pending}")
        print(f"Sold: {sold}")
        print(f"Available: {available}")
        
        # Price statistics
        if total > 0:
            from sqlalchemy import func
            avg_price = db.query(func.avg(Product.price)).scalar()
            min_price = db.query(func.min(Product.price)).scalar()
            max_price = db.query(func.max(Product.price)).scalar()
            
            print(f"\n💰 Price Statistics:")
            print(f"Average Price: ${avg_price:,.2f}")
            print(f"Min Price: ${min_price:,.2f}")
            print(f"Max Price: ${max_price:,.2f}")
        
    except Exception as e:
        print(f"Error getting summary: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "summary":
            query_products_summary()
        elif command == "status":
            status = int(sys.argv[2]) if len(sys.argv) > 2 else None
            query_products_by_status(status)
        elif command == "all":
            query_all_products()
        else:
            print("Usage: python query_products.py [summary|status|all] [status_number]")
    else:
        # Default: show summary
        query_products_summary()
        print("\n" + "="*50)
        query_products_by_status() 
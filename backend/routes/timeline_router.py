"""
活動時間軸 API
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import os

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

class TimelineEvent(BaseModel):
    date: str
    title: str
    description: str
    color: str
    milestone_type: str  # 'start', 'milestone', 'achievement', 'end'

class TimelineResponse(BaseModel):
    events: List[TimelineEvent]

def get_database_connection():
    """獲取資料庫連接"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.db')
    return sqlite3.connect(db_path)

@router.get("/events", response_model=TimelineResponse)
async def get_timeline_events():
    """
    獲取活動時間軸事件
    基於真實數據動態生成活動歷程
    """
    try:
        conn = get_database_connection()
        cursor = conn.cursor()
        events = []
        
        # 活動開始日期 (固定)
        events.append(TimelineEvent(
            date="2025-08-26",
            title="活動啟動",
            description="BidForGood 愛心市集正式上線開始",
            color="#7ed321",
            milestone_type="start"
        ))
        
        # 查詢第一個商品上架時間
        cursor.execute("""
            SELECT MIN(created_at) as first_product_date
            FROM products 
            WHERE created_at IS NOT NULL
        """)
        first_product = cursor.fetchone()
        
        if first_product and first_product[0]:
            events.append(TimelineEvent(
                date=first_product[0][:10],  # 只取日期部分
                title="首個商品上架",
                description="第一件愛心商品成功上架，活動正式開跑！",
                color="#f5a623",
                milestone_type="milestone"
            ))
        
        # 查詢商品數量達到里程碑的時間點
        cursor.execute("""
            SELECT created_at, COUNT(*) as total_count
            FROM products 
            WHERE created_at IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY created_at
        """)
        
        daily_products = cursor.fetchall()
        cumulative_count = 0
        milestone_10_added = False
        milestone_20_added = False
        
        for day_data in daily_products:
            cumulative_count += day_data[1]
            
            # 商品數量達到10件
            if cumulative_count >= 10 and not milestone_10_added:
                events.append(TimelineEvent(
                    date=day_data[0][:10],
                    title="商品數量突破10件",
                    description=f"愛心商品累積達到{cumulative_count}件，參與熱情持續升溫",
                    color="#FF5151",
                    milestone_type="achievement"
                ))
                milestone_10_added = True
            
            # 商品數量達到20件
            if cumulative_count >= 20 and not milestone_20_added:
                events.append(TimelineEvent(
                    date=day_data[0][:10],
                    title="商品數量突破20件",
                    description=f"愛心商品累積達到{cumulative_count}件，市集規模日益壯大",
                    color="#722ed1",
                    milestone_type="achievement"
                ))
                milestone_20_added = True
        
        # 查詢最受歡迎的商品類型/名稱
        cursor.execute("""
            SELECT p.product_name, COUNT(l.id) as like_count, p.created_at
            FROM products p
            LEFT JOIN likes l ON p.id = l.product_id
            WHERE p.created_at IS NOT NULL
            GROUP BY p.id, p.product_name
            HAVING like_count > 0
            ORDER BY like_count DESC, p.created_at
            LIMIT 1
        """)
        
        top_product = cursor.fetchone()
        if top_product:
            # 找一個合適的日期 - 該商品有足夠讚數的時候
            cursor.execute("""
                SELECT p.created_at
                FROM products p
                LEFT JOIN likes l ON p.id = l.product_id
                WHERE p.product_name = ?
                GROUP BY p.id
                HAVING COUNT(l.id) >= ?
                ORDER BY p.created_at
                LIMIT 1
            """, (top_product[0], max(1, top_product[1] // 2)))
            
            popular_date = cursor.fetchone()
            if popular_date:
                events.append(TimelineEvent(
                    date=popular_date[0][:10],
                    title="熱銷商品出現",
                    description=f"「{top_product[0]}」成為最受歡迎商品，獲得{top_product[1]}個讚",
                    color="#FF5151",
                    milestone_type="achievement"
                ))
        
        # 查詢捐款金額里程碑
        cursor.execute("""
            SELECT SUM(donation_amount) as total_donation, MIN(created_at) as first_sale_date
            FROM products 
            WHERE donation_amount > 0 AND created_at IS NOT NULL
        """)
        
        donation_data = cursor.fetchone()
        if donation_data and donation_data[0] and donation_data[0] > 0:
            total_donation = donation_data[0]
            
            # 找出累積捐款達到5000、10000、15000的時間點
            cursor.execute("""
                SELECT created_at, 
                       SUM(donation_amount) OVER (ORDER BY created_at) as cumulative_donation
                FROM products 
                WHERE donation_amount > 0 AND created_at IS NOT NULL
                ORDER BY created_at
            """)
            
            donation_progress = cursor.fetchall()
            milestone_5k_added = False
            milestone_10k_added = False
            milestone_15k_added = False
            
            for row in donation_progress:
                cumulative = row[1]
                
                if cumulative >= 5000 and not milestone_5k_added:
                    events.append(TimelineEvent(
                        date=row[0][:10],
                        title="捐款突破 NT$ 5,000",
                        description=f"累積捐款達到 NT$ {int(cumulative):,}，愛心持續累積",
                        color="#52c41a",
                        milestone_type="achievement"
                    ))
                    milestone_5k_added = True
                
                if cumulative >= 10000 and not milestone_10k_added:
                    events.append(TimelineEvent(
                        date=row[0][:10],
                        title="捐款突破 NT$ 10,000",
                        description=f"累積捐款達到 NT$ {int(cumulative):,}，愛心力量不斷成長",
                        color="#1890ff",
                        milestone_type="achievement"
                    ))
                    milestone_10k_added = True
                
                if cumulative >= 15000 and not milestone_15k_added:
                    events.append(TimelineEvent(
                        date=row[0][:10],
                        title="捐款突破 NT$ 15,000",
                        description=f"累積捐款達到 NT$ {int(cumulative):,}，目標即將達成",
                        color="#fa8c16",
                        milestone_type="achievement"
                    ))
                    milestone_15k_added = True
        
        # 查詢第一個彩蛋觸發時間
        cursor.execute("""
            SELECT MIN(easter_egg_triggered_time) as first_easter_egg
            FROM users 
            WHERE easter_egg = 1 AND easter_egg_triggered_time IS NOT NULL
        """)
        
        first_easter_egg = cursor.fetchone()
        if first_easter_egg and first_easter_egg[0]:
            events.append(TimelineEvent(
                date=first_easter_egg[0][:10],
                title="首位彩蛋發現者出現",
                description="有使用者發現了愛心覺羅的隱藏彩蛋，探索精神令人佩服！",
                color="#eb2f96",
                milestone_type="achievement"
            ))
        
        # 活動結束日期 (固定)
        events.append(TimelineEvent(
            date="2025-09-23",
            title="活動圓滿結束",
            description="BidForGood 愛心市集活動成功落幕，感謝所有參與者的愛心奉獻！",
            color="#FFD700",
            milestone_type="end"
        ))
        
        # 按日期排序
        events.sort(key=lambda x: x.date)
        
        conn.close()
        
        return TimelineResponse(events=events)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取時間軸數據失敗: {str(e)}")

@router.get("/stats")
async def get_timeline_stats():
    """
    獲取活動統計數據，用於生成更詳細的時間軸描述
    """
    try:
        conn = get_database_connection()
        cursor = conn.cursor()
        
        # 總體統計
        cursor.execute("""
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN buyer_name IS NOT NULL THEN 1 END) as sold_products,
                SUM(COALESCE(donation_amount, 0)) as total_donation,
                COUNT(DISTINCT seller_name) as total_sellers
            FROM products
        """)
        
        stats = cursor.fetchone()
        
        # 每日活動數據
        cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as daily_products,
                SUM(COALESCE(donation_amount, 0)) as daily_donation
            FROM products 
            WHERE created_at IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY date
        """)
        
        daily_stats = cursor.fetchall()
        
        # 使用者活動統計
        cursor.execute("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN easter_egg = 1 THEN 1 END) as easter_egg_users,
                AVG(COALESCE(robot_tickle_count, 0)) as avg_tickle_count
            FROM users
        """)
        
        user_stats = cursor.fetchone()
        
        conn.close()
        
        return {
            "total_stats": {
                "total_products": stats[0],
                "sold_products": stats[1], 
                "total_donation": stats[2],
                "total_sellers": stats[3]
            },
            "daily_stats": [
                {
                    "date": row[0],
                    "products": row[1],
                    "donation": row[2]
                } for row in daily_stats
            ],
            "user_stats": {
                "total_users": user_stats[0],
                "easter_egg_users": user_stats[1],
                "avg_tickle_count": user_stats[2]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取統計數據失敗: {str(e)}")

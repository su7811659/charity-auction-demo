# config/achievements.py

"""
成就系統配置 - 對應前端 achievementDefinitions
"""

ACHIEVEMENT_CONFIG = {
    'first_upload': {
        'name': '等等！我還沒上傳啊',
        'description': '完成 1 次的商品上傳',
        'required_count': 1,
        'type': 'upload'
    },
    'first_purchase_request': {
        'name': 'Shut Up And Take My Money',
        'description': '送出一次商品購買請求',
        'required_count': 1,
        'type': 'purchase_request'
    },
    'profile_change': {
        'name': '換臉一新',
        'description': '成功更換過一次大頭貼',
        'required_count': 1,
        'type': 'profile_update'
    },
    'first_purchase': {
        'name': 'BuyGood便當',
        'description': '成功購買一件商品',
        'required_count': 1,
        'type': 'purchase'
    },
    'good_karma': {
        'name': '我積善意',
        'description': '上傳 3 件捐贈比例達 60% 商品 或 購買 1 樣有善意循環光球的商品',
        'required_count': 1,  # 這個是特殊邏輯，不是單純計數
        'type': 'good_karma'
    },
    'five_comments': {
        'name': '五則天',
        'description': '個人留言數達 5 則',
        'required_count': 5,
        'type': 'comment'
    },
    'seller_master': {
        'name': '賣客阿Sir',
        'description': '成功售出你持有的 3 樣商品',
        'required_count': 3,
        'type': 'sell'
    },
    'five_likes': {
        'name': '五藏廟',
        'description': '收藏商品達 5 項',
        'required_count': 5,
        'type': 'like'
    },
    'feedback_master': {
        'name': '饋咖',
        'description': '到回饋信箱進行 2 次回饋',
        'required_count': 2,
        'type': 'feedback'
    },
    'ai_annoying': {
        'name': 'AI小助理的煩人精',
        'description': '搔癢機器人 40 次',
        'required_count': 40,
        'type': 'robot_tickle'
    },
    'platinum_trophy': {
        'name': '白金獎盃',
        'description': '全成就達成',
        'required_count': 10,  # 需要解鎖其他10個成就
        'type': 'meta'  # 元成就，基於其他成就
    }
}

# 成就順序（對應前端陣列索引）
ACHIEVEMENT_ORDER = [
    'first_upload',
    'first_purchase_request', 
    'profile_change',
    'first_purchase',
    'good_karma',
    'five_comments',
    'seller_master',
    'five_likes',
    'feedback_master',
    'ai_annoying',
    'platinum_trophy'
]

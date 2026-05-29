from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ProductViewModel(BaseModel):
    id: int
    seller_name: str
    seller_nickname: str
    product_name: str
    price: float
    condition: int
    description: str
    image_url: str
    ai_rating: Optional[int] = None
    ai_rating_reason: Optional[str] = None
    ai_comment: Optional[str] = None
    ai_fit_owner: Optional[str] = None
    product_status: int
    buyer_name: Optional[str] = None
    created_at: str
    is_approve: bool
    is_rejected: Optional[bool] = False
    donation_ratio: int
    seller_income: Optional[float] = None
    donation_amount: Optional[float] = None
    like_count: int
    liked: bool
    comment_count: Optional[int] = None  # 新增留言數量
    view_count: Optional[int] = 0  # 商品點閱次數
    is_online_deal: Optional[bool] = False  # 是否透過線上交易成交

    model_config = ConfigDict(
        from_attributes=True,  # orm_mode=True
        extra="ignore",
        populate_by_name=True,
        exclude_none=True
    )

class ProductListResponse(BaseModel):
    items: List[ProductViewModel]
    total: int
    ai_query_response: Optional[str] = None

    model_config = ConfigDict(
        exclude_none=True
    )

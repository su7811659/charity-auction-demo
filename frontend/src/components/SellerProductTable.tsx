// SellerProductTable.tsx
import React, { useState } from "react";
import { Table, Button, Modal, Descriptions } from "antd";
import { Product } from "../types/productResponse";
import { ColumnsType } from "antd/es/table";
import LazyImage from "../components/LazyImage";

interface Props {
    products: Product[];
}

const SellerProductTable: React.FC<Props> = ({ products }) => {
    const [cardModalVisible, setCardModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const columns: ColumnsType<Product> = [
        { title: "商品名稱", dataIndex: "product_name", key: "name", width: 180 },
        { title: "價格", dataIndex: "price", key: "price", render: (val) => `$${val}`, width: 80 },
        { title: "捐贈比例", dataIndex: "donation_ratio", key: "donation_ratio", render: (val) => `${val}%`, width: 80 },
        { title: "捐贈金額", key: "donation", render: (_, record) => `$${Math.round(record.price * (record.donation_ratio || 0) / 100)}`, width: 90 },
        { 
          title: "賣家收益", 
          key: "seller_revenue", 
          render: (_, record) => {
            // 直接使用資料庫中的 seller_income（線上交易時後端已設為0）
            const revenue = record.seller_income || 0;
            return (
              <span style={{ color: record.is_online_deal ? '#d9d9d9' : '#52c41a' }}>
                ${Math.round(revenue)}
              </span>
            );
          }, 
          width: 100 
        },
        { 
          title: "須追繳", 
          key: "need_collect", 
          render: (_, record) => {
            const needCollect = record.is_online_deal ? Math.round(record.price * (record.donation_ratio || 0) / 100) : 0;
            return (
              <span style={{ color: needCollect > 0 ? '#ff4d4f' : '#d9d9d9', fontWeight: needCollect > 0 ? 'bold' : 'normal' }}>
                ${needCollect}
              </span>
            );
          }, 
          width: 80 
        },
        { 
          title: "線上交易", 
          dataIndex: "is_online_deal", 
          key: "is_online_deal", 
          render: (val) => (
            <span style={{ color: val ? '#1890ff' : '#d9d9d9' }}>
              {val ? '✓' : '✗'}
            </span>
          ), 
          width: 80 
        },
        { title: "賣家暱稱", dataIndex: "seller_nickname", key: "nickname", width: 100 },
        { title: "買家名稱", dataIndex: "buyer_name", key: "buyer_name", width: 100 },
        {
            title: "更多資訊",
            key: "action",
            width: 80,
            render: (_, record) => (
                <Button
                    size="small"
                    onClick={() => {
                        setSelectedProduct(record);
                        setCardModalVisible(true);
                    }}
                >
                    詳細
                </Button>
            ),
        },
    ];

    return (
        <>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={products}
                pagination={false}
                scroll={{ x: 1100 }}
                size="small"
            />

            <Modal
                open={cardModalVisible}
                onCancel={() => setCardModalVisible(false)}
                footer={null}
                title="商品詳細卡片預覽"
            >
                {selectedProduct && (
                    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
                        <LazyImage
                            src={selectedProduct.image_url}
                            alt={selectedProduct.product_name}
                            style={{
                                width: "90%",
                                height: 240,
                                maxHeight: 240,
                                objectFit: "cover",
                                margin: "0 auto 12px",
                                display: "block",
                            }}
                        />
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="商品名稱">{selectedProduct.product_name}</Descriptions.Item>
                            <Descriptions.Item label="價格">${selectedProduct.price}</Descriptions.Item>
                            <Descriptions.Item label="捐贈比例">{selectedProduct.donation_ratio}%</Descriptions.Item>
                            <Descriptions.Item label="捐贈金額">${Math.round(selectedProduct.price * (selectedProduct.donation_ratio || 0) / 100)}</Descriptions.Item>
                            <Descriptions.Item label="賣家收益">
                                <span style={{ color: selectedProduct.is_online_deal ? '#d9d9d9' : '#52c41a' }}>
                                    ${Math.round(selectedProduct.seller_income || 0)}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="須追繳金額">
                                <span style={{ 
                                    color: selectedProduct.is_online_deal ? '#ff4d4f' : '#d9d9d9',
                                    fontWeight: selectedProduct.is_online_deal ? 'bold' : 'normal'
                                }}>
                                    ${selectedProduct.is_online_deal ? Math.round(selectedProduct.price * (selectedProduct.donation_ratio || 0) / 100) : 0}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="線上交易">
                                <span style={{ color: selectedProduct.is_online_deal ? '#1890ff' : '#d9d9d9' }}>
                                    {selectedProduct.is_online_deal ? '是 ✓' : '否 ✗'}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="賣家 Email">{selectedProduct.seller_name}</Descriptions.Item>
                            <Descriptions.Item label="賣家暱稱">{selectedProduct.seller_nickname}</Descriptions.Item>
                            <Descriptions.Item label="商品狀態">
                                {selectedProduct.product_status === 0
                                    ? "尚未到貨"
                                    : selectedProduct.product_status === 1
                                        ? "已到貨待成交"
                                        : selectedProduct.product_status === 2
                                            ? "已成交"
                                            : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="買家姓名">
                                {selectedProduct.product_status === 2 ? selectedProduct.buyer_name || "-" : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="AI 評價">
                                {selectedProduct.ai_comment || "-"}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default SellerProductTable;
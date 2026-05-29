import { useEffect, useState } from "react";
import { Table, Button, message, Modal, Descriptions, Image } from "antd";
import { getPendingProducts, approveProduct, rejectProduct } from "../services/productService";
import { Product } from "../types/productResponse";

const PendingApprovalPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchData = async (current = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const { items, total } = await getPendingProducts(
        { limit: pageSize, offset: (current - 1) * pageSize },
        () => message.error("載入失敗")
      );
      setProducts(items);
      setPagination((prev) => ({
        ...prev,
        current,
        pageSize,
        total,
      }));
    } catch (e) {
      message.error("取得商品失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    messageApi.open({ type: "loading", content: "進行審核中，請稍候...", duration: 0 });
    try {
      await approveProduct(id, false, () => messageApi.error("審核失敗，請重新審核！"));
      messageApi.destroy();
      messageApi.success("審核完成！");
      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      messageApi.destroy();
      messageApi.error("審核失敗，請重新審核！");
    }
  };

  const handleReject = async (id: number) => {
    messageApi.open({ type: "loading", content: "拒絕中，請稍候...", duration: 0 });
    try {
      await rejectProduct(id, () => messageApi.error("拒絕失敗，請重新操作！"));
      messageApi.destroy();
      messageApi.success("已拒絕該商品！");
      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      messageApi.destroy();
      messageApi.error("拒絕失敗，請重新操作！");
    }
  };

  const showDetailModal = (record: Product) => {
    setSelectedProduct(record);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize);
  }, []);

  const columns = [
    { title: "商品編號", dataIndex: "id", key: "id" },
    { title: "商品名稱", dataIndex: "product_name", key: "product_name" },
    { title: "賣家暱稱", dataIndex: "seller_nickname", key: "seller_nickname" },
    {
      title: "價格",
      dataIndex: "price",
      key: "price",
      render: (val: number) => `$${val}`,
    },
    { title: "新舊程度", dataIndex: "condition", key: "condition" },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: Product) => (
        <Button type="link" onClick={() => showDetailModal(record)}>
          詳細資訊
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      {contextHolder}

      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: "30px",
        }}
      >
        待審核商品列表
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
      />

      <Modal
        open={modalVisible}
        title="商品詳細資訊"
        onCancel={() => setModalVisible(false)}
        footer={
          selectedProduct ? (
            <>
              <Button danger onClick={() => handleReject(selectedProduct.id)}>
                拒絕
              </Button>
              <Button type="primary" onClick={() => handleApprove(selectedProduct.id)}>
                核准
              </Button>
            </>
          ) : null
        }
      >
        {selectedProduct && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="商品名稱">{selectedProduct.product_name}</Descriptions.Item>
            <Descriptions.Item label="賣家帳號">{selectedProduct.seller_name}</Descriptions.Item>
            <Descriptions.Item label="賣家暱稱">{selectedProduct.seller_nickname}</Descriptions.Item>
            <Descriptions.Item label="價格">{`$${selectedProduct.price}`}</Descriptions.Item>
            <Descriptions.Item label="新舊程度">{selectedProduct.condition}</Descriptions.Item>
            <Descriptions.Item label="商品描述">{selectedProduct.description}</Descriptions.Item>
            <Descriptions.Item label="捐贈比例">{selectedProduct.donation_ratio}%</Descriptions.Item>
            <Descriptions.Item label="圖片">
              <Image src={selectedProduct.image_url} width={200} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); color: #ff4d4f; }
          50% { transform: scale(1.1); color: #ffa940; }
          100% { transform: scale(1); color: #ff4d4f; }
        }
      `}</style>
    </div>
  );
};

export default PendingApprovalPage;

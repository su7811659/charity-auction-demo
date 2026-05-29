import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Typography,
  Form,
  Input,
  Select,
  Space,
  message,
  Pagination,
  Modal,
  Popconfirm,
} from "antd";
import {
  listProducts,
  deleteProduct,
  dealProduct,
  updateProduct,
} from "../services/productService";
import { Product } from "../types/productResponse";

const { Title } = Typography;
const pageSize = 10;

const ProductManagementPage: React.FC = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState({});
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [dealTarget, setDealTarget] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = async (rawFilters = {}, page = currentPage) => {
    setLoading(true);
    const filters = cleanParams(rawFilters);
    try {
      const result = await listProducts(
        {
          ...filters,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        () => {
          messageApi.error("無法載入商品資料");
          return { items: [], total: 0 };
        }
      );
      setProducts(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  };

  const cleanParams = (obj: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ""
      )
    );
  };

  const handleSearch = (values: any) => {
    const filters: any = { ...values };

    if (filters.seller_name) {
      filters.sellerName = filters.seller_name;
      delete filters.seller_name;
    }
    if (filters.seller_nickname) {
      filters.sellerNickname = filters.seller_nickname;
      delete filters.seller_nickname;
    }

    if (filters.product_status !== undefined) {
      filters.productStatus = filters.product_status;
      delete filters.product_status;
    }

    if (filters.approval_status === "approved") {
      filters.isApprove = true;
    } else if (filters.approval_status === "pending") {
      filters.isApprove = false;
      filters.isRejected = false;
    } else if (filters.approval_status === "rejected") {
      filters.isRejected = true;
    }
    delete filters.approval_status;

    if (filters.min_price !== undefined) {
      filters.minPrice = filters.min_price;
      delete filters.min_price;
    }
    if (filters.max_price !== undefined) {
      filters.maxPrice = filters.max_price;
      delete filters.max_price;
    }

    const cleaned = cleanParams(filters);
    setSearchFilters(cleaned);
    setCurrentPage(1);
    fetchData(cleaned, 1);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id, () => {
        messageApi.error("刪除失敗");
      });
      messageApi.success("刪除成功");
      fetchData(searchFilters, currentPage);
    } catch {
      messageApi.error("刪除失敗");
    }
  };

  const handleMarkArrived = async (product: Product) => {
    try {
      await updateProduct(
        product.id,
        { productStatus: 1 },
        () => {
          messageApi.error("更新為到貨失敗");
        }
      );
      messageApi.success("商品狀態已更新為已到貨");
      fetchData(searchFilters, currentPage);
    } catch {
      messageApi.error("更新失敗");
    }
  };

  const handleDealClick = (product: Product) => {
    setDealTarget(product);
    setBuyerName("");
    setDealModalVisible(true);
  };

  const handleDetailClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailModalVisible(true);
  };

  const handleDealSubmit = async () => {
    const trimmedName = buyerName.trim();
    if (!trimmedName) {
      messageApi.warning("請輸入買家名稱");
      return;
    }
    if (trimmedName.includes("@")) {
      messageApi.error("請勿輸入 email 格式，只需要填入買家名稱即可");
      return;
    }

    // 驗證買家名稱格式
    const validationResult = validateBuyerName(trimmedName);
    if (!validationResult.isValid) {
      messageApi.error(validationResult.message);
      return;
    }

    const product = dealTarget;
    if (!product) return;

    // 自動補上 @example.com 後綴
    const buyerEmail = `${trimmedName}@example.com`;

    try {
      await dealProduct(product.id, buyerEmail, () => {
        messageApi.error("成交失敗");
      });
      messageApi.success(`商品 ${product.product_name} 成交成功`);
      setDealModalVisible(false);
      fetchData(searchFilters, currentPage);
    } catch {
      messageApi.error("成交失敗");
    }
  };

  // 驗證買家名稱的函數
  const validateBuyerName = (name: string): { isValid: boolean; message: string } => {
    // 檢查是否包含空格
    if (name.includes(" ")) {
      return { isValid: false, message: "買家名稱不可包含空格" };
    }

    // 檢查是否包含中文字元
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
    if (chineseRegex.test(name)) {
      return { isValid: false, message: "買家名稱不可包含中文字元，請使用英文字母、數字或底線" };
    }

    // 檢查是否只包含合法字元（英文字母、數字、底線、點號、連字號）
    const validCharRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validCharRegex.test(name)) {
      return { isValid: false, message: "買家名稱只能包含英文字母、數字、底線(_)、點號(.)或連字號(-)" };
    }

    // 檢查長度限制
    if (name.length < 2) {
      return { isValid: false, message: "買家名稱至少需要2個字元" };
    }
    if (name.length > 30) {
      return { isValid: false, message: "買家名稱不可超過30個字元" };
    }

    // 檢查是否以底線或連字號開頭或結尾
    if (name.startsWith("_") || name.startsWith("-") || name.endsWith("_") || name.endsWith("-")) {
      return { isValid: false, message: "買家名稱不可以底線或連字號開頭或結尾" };
    }

    return { isValid: true, message: "" };
  };

  useEffect(() => {
    fetchData(searchFilters, currentPage);
  }, [currentPage]);

  const columns = [
    { title: "ID", dataIndex: "id" },
    { title: "商品名稱", dataIndex: "product_name" },
    { title: "賣家 Email", dataIndex: "seller_name" },
    { title: "賣家暱稱", dataIndex: "seller_nickname" },
    { title: "價格", dataIndex: "price" },
    {
      title: "買家",
      dataIndex: "buyer_name",
      render: (_: any, record: Product) => {
        return record.product_status === 2 ? record.buyer_name || "-" : "-";
      },
    },
    {
      title: "商品狀態",
      dataIndex: "product_status",
      render: (val: number) => {
        if (val === 0) return "尚未到貨";
        if (val === 1) return "已到貨待成交";
        if (val === 2) return "已成交";
        return "-";
      },
    },
    {
      title: "審核狀態",
      render: (_: any, record: Product) => {
        if (record.is_approve) return "✅ 已通過";
        if (record.is_rejected) return "❌ 否決";
        return "⏳ 未審核";
      },
    },
    {
      title: "操作",
      render: (_: any, record: Product) => (
        <Space>
          <Button onClick={() => handleDetailClick(record)}>詳細</Button>
          <Popconfirm
            title="確定要刪除這個商品嗎？"
            description={`商品：「${record.product_name}」將永久刪除`}
            okText="確定"
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger>刪除</Button>
          </Popconfirm>
          {!record.is_rejected && record.product_status === 0 && (
            <Button onClick={() => handleMarkArrived(record)}>到貨</Button>
          )}
          {!record.is_rejected && record.product_status === 1 && (
            <Button type="primary" onClick={() => handleDealClick(record)}>成交</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      {contextHolder}
      <Title level={3}>商品管理列表</Title>
      <p>可依條件搜尋、到貨與成交操作，支援刪除。</p>

      <Form
        layout="inline"
        form={form}
        onFinish={handleSearch}
        style={{ marginBottom: 16, flexWrap: "wrap" }}
      >
        <Form.Item name="seller_name">
          <Input placeholder="賣家 Email" />
        </Form.Item>
        <Form.Item name="seller_nickname">
          <Input placeholder="賣家暱稱" />
        </Form.Item>
        <Form.Item name="strquery">
          <Input placeholder="商品名稱關鍵字" />
        </Form.Item>
        <Form.Item name="product_status">
          <Select placeholder="商品狀態" allowClear style={{ width: 160 }}>
            <Select.Option value={0}>尚未到貨</Select.Option>
            <Select.Option value={1}>已到貨待成交</Select.Option>
            <Select.Option value={2}>已成交</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="approval_status">
          <Select placeholder="審核狀態" allowClear style={{ width: 160 }}>
            <Select.Option value="approved">✅ 已通過</Select.Option>
            <Select.Option value="pending">⏳ 未審核</Select.Option>
            <Select.Option value="rejected">❌ 已否決</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="min_price">
          <Input type="number" placeholder="最低價" />
        </Form.Item>
        <Form.Item name="max_price">
          <Input type="number" placeholder="最高價" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">搜尋</Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={false}
      />

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={total}
          onChange={(page) => setCurrentPage(page)}
        />
      </div>

      <Modal
        open={dealModalVisible}
        title="商品成交"
        footer={null}
        onCancel={() => setDealModalVisible(false)}
      >
        <Input
          placeholder="請輸入買家英文姓名，例如：john_doe"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {/* 即時驗證提示 */}
        {buyerName.trim() && (() => {
          const validation = validateBuyerName(buyerName.trim());
          if (!validation.isValid) {
            return (
              <Typography.Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
                {validation.message}
              </Typography.Text>
            );
          }
          if (buyerName.includes("@")) {
            return (
              <Typography.Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
                請勿輸入 email 格式，只需填入買家名稱
              </Typography.Text>
            );
          }
          return (
            <Typography.Text type="success" style={{ display: 'block', marginBottom: 8 }}>
              ✓ 格式正確，將自動補全為：{buyerName.trim()}@example.com
            </Typography.Text>
          );
        })()}
        
        <Popconfirm
          title="確認成交"
          description={
            <>
              確定要將商品成交給 <strong>{buyerName.trim()}@example.com</strong> 嗎？
            </>
          }
          okText="確認成交"
          cancelText="取消"
          onConfirm={handleDealSubmit}
          disabled={(() => {
            const trimmed = buyerName.trim();
            if (!trimmed) return true;
            if (trimmed.includes("@")) return true;
            const validation = validateBuyerName(trimmed);
            return !validation.isValid;
          })()}
        >
          <Button 
            type="primary" 
            block
            disabled={(() => {
              const trimmed = buyerName.trim();
              if (!trimmed) return true;
              if (trimmed.includes("@")) return true;
              const validation = validateBuyerName(trimmed);
              return !validation.isValid;
            })()}
          >
            提交成交
          </Button>
        </Popconfirm>
      </Modal>

      <Modal
        open={detailModalVisible}
        title="商品詳細資訊"
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            關閉
          </Button>
        ]}
        onCancel={() => setDetailModalVisible(false)}
      >
        {selectedProduct && (
          <div style={{ padding: '16px 0' }}>
            {/* 商品圖片 */}
            {selectedProduct.image_url && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.product_name}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px', 
                    objectFit: 'contain',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
                  }}
                />
              </div>
            )}
            
            {/* 基本資訊 */}
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: '0 0 12px 0' }}>基本資訊</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                <strong>商品編號：</strong>
                <span>{selectedProduct.id}</span>
                
                <strong>商品名稱：</strong>
                <span>{selectedProduct.product_name}</span>
                
                <strong>價格：</strong>
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>NT$ {selectedProduct.price?.toLocaleString()}</span>
                
                <strong>商品狀況：</strong>
                <span>
                  {selectedProduct.condition === 1 ? '全新' : 
                   selectedProduct.condition === 2 ? '二手(良好)' : 
                   selectedProduct.condition === 3 ? '二手(普通)' : 
                   selectedProduct.condition === 4 ? '二手(不佳)' : '未知'}
                </span>
                
                <strong>商品狀態：</strong>
                <span style={{ 
                  color: selectedProduct.product_status === 0 ? '#faad14' : 
                         selectedProduct.product_status === 1 ? '#1890ff' : '#52c41a' 
                }}>
                  {selectedProduct.product_status === 0 ? '尚未到貨' : 
                   selectedProduct.product_status === 1 ? '已到貨待成交' : '已成交'}
                </span>
                
                <strong>審核狀態：</strong>
                <span>
                  {selectedProduct.is_approve ? '✅ 已通過' : 
                   selectedProduct.is_rejected ? '❌ 否決' : '⏳ 未審核'}
                </span>
                
                <strong>捐贈比例：</strong>
                <span>{selectedProduct.donation_ratio}%</span>
                
                <strong>建立時間：</strong>
                <span>{new Date(selectedProduct.created_at).toLocaleString('zh-TW')}</span>
              </div>
            </div>

            {/* 賣家資訊 */}
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: '0 0 12px 0' }}>賣家資訊</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                <strong>賣家帳號：</strong>
                <span>{selectedProduct.seller_name}</span>
                
                <strong>賣家暱稱：</strong>
                <span>{selectedProduct.seller_nickname}</span>
              </div>
            </div>

            {/* 交易資訊 */}
            {(selectedProduct.buyer_name || selectedProduct.seller_income !== undefined || selectedProduct.donation_amount !== undefined) && (
              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: '0 0 12px 0' }}>交易資訊</Title>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                  {selectedProduct.buyer_name && (
                    <>
                      <strong>買家：</strong>
                      <span>{selectedProduct.buyer_name}</span>
                    </>
                  )}
                  
                  {selectedProduct.seller_income !== undefined && (
                    <>
                      <strong>賣家收入：</strong>
                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                        NT$ {selectedProduct.seller_income.toLocaleString()}
                      </span>
                    </>
                  )}
                  
                  {selectedProduct.donation_amount !== undefined && (
                    <>
                      <strong>捐贈金額：</strong>
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                        NT$ {selectedProduct.donation_amount.toLocaleString()}
                      </span>
                    </>
                  )}
                  
                  {selectedProduct.is_online_deal !== undefined && (
                    <>
                      <strong>線上交易：</strong>
                      <span>{selectedProduct.is_online_deal ? '是' : '否'}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* AI 分析 */}
            {(selectedProduct.ai_rating || selectedProduct.ai_comment || selectedProduct.ai_fit_owner) && (
              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: '0 0 12px 0' }}>AI 分析</Title>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                  {selectedProduct.ai_rating && (
                    <>
                      <strong>AI 評分：</strong>
                      <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                        {selectedProduct.ai_rating}/10
                      </span>
                    </>
                  )}
                  
                  {selectedProduct.ai_fit_owner && (
                    <>
                      <strong>適合對象：</strong>
                      <span>{selectedProduct.ai_fit_owner}</span>
                    </>
                  )}
                  
                  {selectedProduct.ai_comment && (
                    <>
                      <strong>AI 評語：</strong>
                      <div style={{ 
                        background: '#f6f6f6', 
                        padding: '12px', 
                        borderRadius: '6px',
                        marginTop: '4px',
                        lineHeight: '1.5'
                      }}>
                        {selectedProduct.ai_comment}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 互動統計 */}
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: '0 0 12px 0' }}>互動統計</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                <strong>按讚數：</strong>
                <span>{selectedProduct.like_count}</span>
                
                <strong>留言數：</strong>
                <span>{selectedProduct.comment_count}</span>
                
                {selectedProduct.view_count !== undefined && (
                  <>
                    <strong>瀏覽數：</strong>
                    <span>{selectedProduct.view_count}</span>
                  </>
                )}
              </div>
            </div>

            {/* 商品描述 */}
            {selectedProduct.description && (
              <div>
                <Title level={4} style={{ margin: '0 0 12px 0' }}>商品描述</Title>
                <div style={{ 
                  background: '#f6f6f6', 
                  padding: '16px', 
                  borderRadius: '6px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedProduct.description}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManagementPage;

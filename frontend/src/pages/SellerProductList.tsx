import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Input, Spin, Empty, message } from "antd";
import { useTranslation } from "react-i18next";
import { RootState, AppDispatch } from "../store/store";
import { fetchProducts } from "../store/productSlice";
import { Product } from "../types/productResponse";
import SellerProductTable from "../components/SellerProductTable";
import i18n from "../i18n";
import * as XLSX from "xlsx";

// 匯出 CSV 工具
const exportToXlsx = (products: Product[]) => {
  const productRows = products.map((p) => {
    const donationRatio = p.donation_ratio || 0;
    const donation = p.price * (donationRatio / 100);
    // 直接使用資料庫中的 seller_income（線上交易時後端已設為0）
    const revenue = p.seller_income || 0;
    const needToCollect = p.is_online_deal ? donation : 0;
    
    return {
      商品編號: p.id,
      商品名稱: p.product_name,
      價格: p.price,
      捐贈比例: `${donationRatio}%`,
      捐贈金額: Math.round(donation),
      賣家收益: Math.round(revenue),
      須追繳金額: Math.round(needToCollect),
      買家名稱: p.buyer_name,
      賣家名稱: p.seller_name || i18n.t("未知"),
      線上交易: p.is_online_deal ? i18n.t("是") : i18n.t("否"),
    };
  });

  const sellerMap = new Map<string, { 
    count: number; 
    total: number; 
    donation: number; 
    revenue: number;
    onlineDealCount: number;
    onlineDealTotal: number;
    needToCollect: number;
  }>();
  let totalSales = 0;
  let totalDonation = 0;
  let totalRevenue = 0;
  let totalOnlineDealSales = 0;
  let totalNeedToCollect = 0;

  for (const p of products) {
    const ratio = p.donation_ratio || 0;
    const donation = p.price * (ratio / 100);
    // 直接使用資料庫中的 seller_income
    const revenue = p.seller_income || 0;
    const needToCollect = p.is_online_deal ? donation : 0;

    totalSales += p.price;
    totalDonation += donation;
    totalRevenue += revenue;
    totalNeedToCollect += needToCollect;

    if (p.is_online_deal) {
      totalOnlineDealSales += p.price;
    }

    const seller = p.seller_name || i18n.t("未知");
    if (!sellerMap.has(seller)) {
      sellerMap.set(seller, { 
        count: 0, 
        total: 0, 
        donation: 0, 
        revenue: 0,
        onlineDealCount: 0,
        onlineDealTotal: 0,
        needToCollect: 0,
      });
    }
    const s = sellerMap.get(seller)!;
    s.count += 1;
    s.total += p.price;
    s.donation += donation;
    s.revenue += revenue;
    s.needToCollect += needToCollect;
    
    if (p.is_online_deal) {
      s.onlineDealCount += 1;
      s.onlineDealTotal += p.price;
    }
  }

  const sellerSummaryRows = Array.from(sellerMap.entries()).map(([seller, data]) => {
    const finalAmount = Math.round(data.revenue - data.needToCollect);
    return {
      賣家名稱: seller,
      商品數量: data.count,
      總銷售額: Math.round(data.total),
      線上交易數量: data.onlineDealCount,
      線上交易金額: Math.round(data.onlineDealTotal),
      捐贈總額: Math.round(data.donation),
      賣家收益: Math.round(data.revenue),
      須追繳金額: Math.round(data.needToCollect),
      最終計算結果: finalAmount,
      是否簽收: "", // 預設為空，可手動修改
    };
  });

  const overallSummary = [{
    總商品數: products.length,
    總銷售額: Math.round(totalSales),
    線上交易商品數: products.filter(p => p.is_online_deal).length,
    線上交易總額: Math.round(totalOnlineDealSales),
    捐贈總額: Math.round(totalDonation),
    賣家收益: Math.round(totalRevenue),
    須追繳總額: Math.round(totalNeedToCollect),
  }];

  const wb = XLSX.utils.book_new();
  const wsProduct = XLSX.utils.json_to_sheet(productRows);
  const wsSeller = XLSX.utils.json_to_sheet(sellerSummaryRows);
  const wsOverall = XLSX.utils.json_to_sheet(overallSummary);

  // 增加欄寬至適當大小
  wsProduct["!cols"] = Array(10).fill({ wch: 16 }); // 商品明細增加一欄（商品編號）
  wsSeller["!cols"] = Array(10).fill({ wch: 16 }); // 賣家彙總增加兩欄（最終計算結果、是否簽收）
  wsOverall["!cols"] = Array(7).fill({ wch: 18 });

  XLSX.utils.book_append_sheet(wb, wsProduct, i18n.t("商品明細"));
  XLSX.utils.book_append_sheet(wb, wsSeller, i18n.t("賣家彙總"));
  XLSX.utils.book_append_sheet(wb, wsOverall, i18n.t("整體統計"));

  XLSX.writeFile(wb, i18n.t("商品報表.xlsx"));
};

const SellerProductList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();

  const [sellerName, setSellerName] = useState(searchParams.get("seller") || "");
  const [searchInput, setSearchInput] = useState(sellerName);

  const productList = useSelector((state: RootState) => state.product.list.items || []);
  const loading = useSelector((state: RootState) =>
    state.product.apiStatus["productList"]?.status === "loading"
  );
  const apiStatus = useSelector((state: RootState) => state.product.apiStatus["productList"]);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      message.warning(t("請輸入賣家email或 :all 查看全部"));
      return;
    }
    if (trimmed === ":all") {
      setSellerName("");
    } else {
      setSellerName(trimmed);
    }
  };

  useEffect(() => {
    dispatch(
      fetchProducts({
        limit: 1000, // 增加限制，確保獲取所有已成交商品
        offset: 0,
        isApprove: true, // 只獲取已審核的商品
        productStatus: 2, // 只獲取已成交的商品 (product_status = 2)
      })
    );
  }, []);

  const filteredList = sellerName
    ? productList.filter((p) => p.seller_name?.toLowerCase().includes(sellerName.toLowerCase()))
    : productList; // 不需要再過濾 product_status，因為API已經只返回已成交商品

  const totalSales = filteredList.reduce((sum, p) => sum + p.price, 0);
  const totalDonation = filteredList.reduce((sum, p) => sum + p.price * ((p.donation_ratio || 0) / 100), 0);
  // 直接使用資料庫中的 seller_income（線上交易時後端已設為0）
  const totalRevenue = filteredList.reduce((sum, p) => sum + (p.seller_income || 0), 0);
  // 須追繳：只有線上交易的商品需要追繳捐贈額
  const totalNeedToCollect = filteredList.reduce((sum, p) => {
    if (!p.is_online_deal) return sum; // 非線上交易不需追繳
    return sum + p.price * ((p.donation_ratio || 0) / 100);
  }, 0);
  const onlineDealCount = filteredList.filter(p => p.is_online_deal).length;

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>{t("查詢賣家商品")}</h2>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Input.Search
          placeholder={t("輸入賣家email（輸入 :all 可列出全部）")}
          enterButton={t("查詢")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onSearch={handleSearch}
          style={{ maxWidth: 400, marginRight: 8 }} // ➜ 增加查詢欄與按鈕間 padding
        />
      </div>

      <div style={{ fontSize: 13, color: "#888", marginBottom: 12, textAlign: "center" }}>
        🔎 {t("當前條件：")}{sellerName ? `${t("搜尋賣家")}「${sellerName}」` : t("顯示所有商品")}
      </div>

      {apiStatus && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#888", textAlign: "center" }}>
          {t("API 狀態：")}{apiStatus.status} {apiStatus.error && `(${t("錯誤")}: ${apiStatus.error})`}
        </div>
      )}

      {loading ? (
        <Spin tip={t("載入中...")} />
      ) : filteredList.length === 0 ? (
        <Empty description={t("找不到商品")} />
      ) : (
        <>
          <div style={{ textAlign: "center", fontSize: 16, lineHeight: 2.0, marginBottom: 8 }}>
            <strong>{t("目前顯示")} {filteredList.length} {t("筆商品 (線上交易:")} {onlineDealCount} {t("筆)")}</strong>
            <div style={{ marginBottom: 12, fontSize: 16, lineHeight: 2.0 }}>
              💵 <b>{t("總販售額：")}</b>${totalSales.toFixed(0)}&emsp;
              🎁 <b>{t("捐贈總額：")}</b>${totalDonation.toFixed(0)}&emsp;
              💰 <b>{t("賣家收益：")}</b>${totalRevenue.toFixed(0)}&emsp;
              ⚠️ <b>{t("須追繳：")}</b>${totalNeedToCollect.toFixed(0)}&emsp;
              <button
                onClick={() => exportToXlsx(filteredList)}
                style={{
                  marginLeft: 12,
                  padding: "4px 10px",
                  fontSize: 14,
                  cursor: "pointer",
                  background: "#1677ff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                }}
              >
                ⬇ {t("匯出財務報表")}
              </button>
            </div>
          </div>

          <SellerProductTable products={filteredList} />
        </>
      )}
    </div>
  );
};

export default SellerProductList;

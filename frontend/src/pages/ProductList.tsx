// ProductList.tsx（貼紙放進 Card，hover 時圖片與卡片同步放大）
import { useEffect, useState, useRef, useCallback } from "react";
// 積極防止Modal造成的佈局偏移
function useBodyOverflowFix(visible: boolean) {
  useEffect(() => {
    const preventModalSideEffects = () => {
      // 強制重置所有可能被 Modal 修改的樣式
      document.body.style.overflow = 'auto';
      document.body.style.overflowY = 'auto';
      document.body.style.paddingRight = '0';
      document.body.style.marginRight = '0';
      
      // 也確保 html 元素不受影響
      document.documentElement.style.paddingRight = '0';
      document.documentElement.style.marginRight = '0';
    };

    if (visible) {
      // Modal 開啟時立即執行
      preventModalSideEffects();
      
      // 使用 MutationObserver 監聽 body 樣式變化
      const observer = new MutationObserver(() => {
        preventModalSideEffects();
      });
      
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style']
      });
      
      return () => {
        observer.disconnect();
        preventModalSideEffects();
      };
    }
    
    return () => {
      preventModalSideEffects();
    };
  }, [visible]);
}
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchProducts, retrieveProducts } from '../store/productSlice';
import { updateProductList } from '../store/productSlice';
import { useOnlineDealNotificationChecker } from '../hooks/useOnlineDealNotificationChecker';
import {
  Button,
  Typography,
  Input,
  Select,
  Row,
  Col,
  Pagination,
  Empty,
  Spin,
  FloatButton,
  Timeline,
  Modal,
  message,
  Form,
  Space,
  Tooltip
} from 'antd';
import { SearchOutlined, RobotOutlined, SwapOutlined, ReloadOutlined, FrownOutlined, HistoryOutlined, NotificationOutlined, MenuOutlined, UserOutlined, ShoppingOutlined, TagOutlined, SortAscendingOutlined, DollarOutlined, PushpinOutlined, RocketOutlined, RiseOutlined, FallOutlined, HeartOutlined, CommentOutlined, ClockCircleOutlined, CheckCircleOutlined, TrophyOutlined, EyeOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useSearchParams } from 'react-router-dom';
import { Product } from "../types/productResponse";
import RobotAvatarWithDialog, { RobotSentence } from "../components/RobotAvatarWithDialog";
import ProductCard from "../components/ProductCard";
import { getLikedProducts, unlikeProduct, likeProduct, getTimelineEvents } from "../services/productService";
import { motion } from "framer-motion";
import useScroll from "../hooks/useScroll";
import sessionService from "../services/sessionService";
import './ProductListModalFix.css'; // 強制覆蓋 Modal 對 body 的 overflow 設定

// Robot 圖片導入
import RobotTalking from "../assets/img/robot_talking.gif";
import RobotInit from "../assets/img/robot_init.gif";

// dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { Option } = Select;

// Timeline事件接口定義
interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  color: string;
  milestone_type: string;
}

const GeneralSearchForm = ({
  form, color, queryParams, onSearch, onClearField, onSwitchToAI, hasSearched, onClear, sortValue, setSortValue, displayProductStatus, setDisplayProductStatus
}: {
  form: any; color: string; queryParams: any; onSearch: (values: any) => void; 
  onClearField: (field: string) => void; onSwitchToAI: () => void; 
  hasSearched: boolean; onClear: () => void; sortValue: string; setSortValue: (value: string) => void;
  displayProductStatus: string | number | undefined; setDisplayProductStatus: (value: string | number | undefined) => void;
}) => {
  const { isScrollingUp, isAtTop } = useScroll();
  const [isVibrating, setIsVibrating] = useState(false);
  const isVisible = isAtTop || isScrollingUp;

  useEffect(() => {
    // 設定定時器，每10秒觸發一次震動
    const interval = setInterval(() => {
      setIsVibrating(true);
      // 震動持續1秒
      setTimeout(() => {
        setIsVibrating(false);
      }, 1000);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        transition: "transform 0.3s ease, opacity 0.3s ease",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        opacity: isVisible ? 1 : 0,
        position: "sticky",
        top: 70,
        zIndex: 10,
      }}
    >
      <Form
        form={form}
        onFinish={onSearch}
        style={{
          backgroundColor: color,
          transition: "0.5s",
          padding: "1.2rem 1rem",
          borderRadius: "12px",
          boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "center"
        }}>
        <style>
          {`
            @keyframes vibrate {
              0% { transform: translate(0); }
              20% { transform: translate(-1px, 1px); }
              40% { transform: translate(-1px, -1px); }
              60% { transform: translate(1px, 1px); }
              80% { transform: translate(1px, -1px); }
              100% { transform: translate(0); }
            }
            @keyframes flashBackground {
              0% { background-color: #ff9a9e; }
              25% { background-color: #fad0c4; }
              50% { background-color: #fbc2eb; }
              75% { background-color: #a18cd1; }
              100% { background-color: #ff9a9e; }
            }
            
            /* 響應式搜尋表單 */
            .ant-form-item {
              margin-bottom: 0 !important;
            }
            
            @media (max-width: 1200px) {
              .search-form-item {
                min-width: 120px !important;
              }
            }
            
            @media (max-width: 768px) {
              .search-form-item {
                min-width: 100px !important;
                margin-bottom: 8px !important;
              }
              .search-form-buttons {
                width: 100% !important;
                justify-content: center !important;
                margin-left: 0 !important;
              }
            }
          `}
        </style>
        <Form.Item name="sellerNickname" className="search-form-item" style={{ minWidth: "140px" }}>
          <Input
            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            placeholder="賣家暱稱"
            onClear={() => onClearField("sellerNickname")}
            style={{ width: "140px" }}
          />
        </Form.Item>
        <Form.Item name="strquery" className="search-form-item" style={{ minWidth: "160px" }}>
          <Input
            prefix={<ShoppingOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            placeholder="商品名稱關鍵字"
            onClear={() => onClearField("strquery")}
            style={{ width: "160px" }}
          />
        </Form.Item>
        <Form.Item className="search-form-item" style={{ minWidth: "140px" }}>
          <Select
            suffixIcon={<TagOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            placeholder="商品狀態"
            value={displayProductStatus}
            onChange={(value) => {
              setDisplayProductStatus(value);
              onSearch({ productStatus: value });
            }}
            onClear={() => {
              setDisplayProductStatus(undefined);
              onClearField("productStatus");
            }}
            style={{ width: "140px" }}
          >
            <Option value={0}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#faad14' }} />
              尚未到貨
            </Option>
            <Option value={1}>
              <CheckCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              已到貨
            </Option>
            <Option value="unsold">
              <ShoppingCartOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
              尚未成交
            </Option>
            <Option value={2}>
              <TrophyOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              已成交
            </Option>
          </Select>
        </Form.Item>
        <Form.Item name="sortBy" className="search-form-item" style={{ minWidth: "130px" }}>
          <Select
            suffixIcon={<SortAscendingOutlined style={{ color: '#bfbfbf' }} />}
            allowClear={queryParams.orderBy && queryParams.orderBy !== 'id'}
            placeholder="排序方式"
            value={sortValue}
            onChange={(value) => {
              const finalValue = (value === undefined || value === null) ? 'id' : value;
              setSortValue(finalValue);
              // 同步更新表單欄位，確保 UI 立即顯示
              form?.setFieldsValue?.({ sortBy: finalValue });
              onSearch({ orderBy: finalValue });
            }}
            onClear={() => {
              setSortValue('id');
              // 同步更新表單欄位，確保 UI 立即顯示
              form?.setFieldsValue?.({ sortBy: 'id' });
              onSearch({ orderBy: 'id' });
            }}
            style={{ width: "150px" }}
          >
            <Option value="id">
              <PushpinOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              商品編號優先
            </Option>
            <Option value="id_desc">
              <RocketOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              新上架優先
            </Option>
            <Option value="price_asc">
              <RiseOutlined style={{ marginRight: '8px', color: '#faad14' }} />
              價格低到高
            </Option>
            <Option value="price_desc">
              <FallOutlined style={{ marginRight: '8px', color: '#f5222d' }} />
              價格高到低
            </Option>
            <Option value="like_count_desc">
              <HeartOutlined style={{ marginRight: '8px', color: '#eb2f96' }} />
              最多收藏
            </Option>
            <Option value="comment_count_desc">
              <CommentOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
              討論度最高
            </Option>
            <Option value="view_count_desc">
              <EyeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              最高點閱
            </Option>
          </Select>
        </Form.Item>
        <Form.Item name="minPrice" className="search-form-item" style={{ minWidth: "140px" }}>
          <Input
            prefix={<DollarOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            placeholder="最低價"
            type="number"
            value={queryParams.minPrice}
            style={{ width: "140px" }}
            onClear={() => onClearField("minPrice")}
          />
        </Form.Item>
        <Form.Item name="maxPrice" className="search-form-item" style={{ minWidth: "140px" }}>
          <Input
            prefix={<DollarOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            placeholder="最高價"
            type="number"
            value={queryParams.maxPrice}
            style={{ width: "140px" }}
            onClear={() => onClearField("maxPrice")}
          />
        </Form.Item>
        
        <div className="search-form-buttons" style={{ 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center',
          marginLeft: 'auto',
          minWidth: 'fit-content',
          flexShrink: 0
        }}>
          <Tooltip title="搜尋商品" color="#000000bf">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
            />
          </Tooltip>
          <Tooltip title="切換 AI 搜尋" color="#000000bf">
            <Button
              type="default"
              icon={<RobotOutlined />}
              onClick={onSwitchToAI}
              style={{
                animation: isVibrating 
                  ? 'vibrate 0.3s linear infinite, flashBackground 1s linear infinite' 
                  : 'none',
                transition: 'all 0.3s ease',
                color: isVibrating ? '#ffffff' : undefined
              }}
            />
          </Tooltip>
          <Tooltip title="回到全部商品" color="#000000bf">
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={onClear}
              style={{
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '1px solid #d9d9d9',
                opacity: hasSearched ? 1 : 0,
                width: hasSearched ? 'auto' : 0,
                padding: hasSearched ? '4px 8px' : 0,
                margin: hasSearched ? '0' : 0,
                transition: 'all 0.3s ease',
                pointerEvents: hasSearched ? 'auto' : 'none',
              }}
            />
          </Tooltip>
        </div>
        </div>
      </Form>
    </div>
  );
};

const AISearchForm = ({
  form, color, onSearch, onSwitchToGeneral, onFinishFailed, onClear, hasSearched
}: {
  form: any; color: string; onSearch: (values: any) => void; onSwitchToGeneral: () => void; 
  onFinishFailed: (errorInfo: any) => void; onClear: () => void; hasSearched: boolean;
}) => {
  const { isScrollingUp, isAtTop } = useScroll();
  const isVisible = isAtTop || isScrollingUp;

  return (
    <div
      style={{
        transition: "transform 0.3s ease, opacity 0.3s ease",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        opacity: isVisible ? 1 : 0,
        position: "sticky",
        top: 70,
        zIndex: 10,
      }}
    >
      <Form
        layout="inline"
        form={form}
        style={{
          marginBottom: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          backgroundColor: color,
          transition: "0.4s",
          padding: "1.2rem 2rem",
          borderRadius: "12px",
          boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
        }}
        onFinish={onSearch}
        onFinishFailed={onFinishFailed}
      >
        <Form.Item 
          name="aiQuery" 
          rules={[{ required: true, message: "" }]}
          style={{ 
            flex: 1,
            marginBottom: 0,
            maxWidth: "calc(100% - 140px)",
          }}
        >
          <Input
            allowClear
            maxLength={50}
            placeholder="告訴 AI 小助手你想在市集中挖出什麼寶貝吧"
            style={{ width: "76vw", maxWidth: 'calc(100%)' }}
          />
        </Form.Item>
        
        <Space size={8} style={{ marginLeft: 'auto', minWidth: '116px', justifyContent: 'flex-end' }}>
          <Tooltip title="AI 搜尋" color="#000000bf">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
            />
          </Tooltip>
          <Tooltip title="切換成一般搜尋" color="#000000bf">
            <Button
              type="default"
              icon={<SwapOutlined />}
              onClick={onSwitchToGeneral}
            />
          </Tooltip>
          <Tooltip title="回到全部商品" color="#000000bf">
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={onClear}
              style={{
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '1px solid #d9d9d9',
                opacity: hasSearched ? 1 : 0,
                width: hasSearched ? 'auto' : 0,
                padding: hasSearched ? '4px 8px' : 0,
                margin: hasSearched ? '0' : 0,
                transition: 'all 0.3s ease',
                pointerEvents: hasSearched ? 'auto' : 'none',
              }}
            />
          </Tooltip>
        </Space>
      </Form>
    </div>
  );
};

const AIResponseBlock = ({
  color, aiResponse, errorMsg, isLoading
}: {
  color: string; 
  aiResponse: string; 
  errorMsg: string; 
  isLoading: boolean;
}) => {
  const { isScrollingUp, isAtTop } = useScroll();
  const isVisible = isAtTop || isScrollingUp;
  const [isTalking, setIsTalking] = useState(false);
  const [sentences, setSentences] = useState<RobotSentence[]>([]);
  const [isMounted, setIsMounted] = useState(false); // 用於追蹤是否已完成初次渲染
  // phase 用於判斷狀態切換：重新掛載機器人強制清空泡泡
  const phase = isLoading ? 'loading' : (errorMsg ? 'error' : (aiResponse ? 'answer' : 'idle'));
  const prevPhaseRef = useRef(phase);
  const [instanceId, setInstanceId] = useState(0);
  const introSentences: RobotSentence[] = [
    {
      content:
        "嗨，我是 BidForGood 公益市集的 AI 小助理！🎉 " +
        "雖然我沒有自我意識，但我超熱衷於幫你搜尋商品、整理資訊，還能解答你所有市集相關的疑問。 " +
        "我的日常大概就是翻資料、跑搜尋，然後再翻資料、再跑搜尋……🤯 不過這就是我的專長啦。 " +
        "至於早餐嘛～其實我不用吃東西，但如果非要說，我想我的程式碼應該最適合配咖啡☕，不然怎麼能保持清醒呢？ " +
        "好了好了，我碎嘴夠多了～你今天想先找點什麼？💡",
      type: "normal",
      skipTalk: sessionService.getHasViewedAISearchIntro()
    },
    { content: "唉唷，整天幫大家翻商品，我自己都想領加班費了🤣 你呢？今天想找點什麼？", type: "normal", skipTalk: false },
    { content: "哈囉～你來啦！👋 我剛剛才在抱怨自己運算到快冒煙，但看你好開心，又忍不住想問：要不要我幫你找點什麼？", type: "normal", skipTalk: false },
    { content: "嘿～好巧啊，又遇到你😆 我剛還在哀嚎『怎麼都沒人cue我』，結果你就來了！要不要考驗一下我的搜尋力？", type: "normal", skipTalk: false },
    // 商品上傳
    {
      content:
        "哈囉～👋 今天又被叫來上工啦！你要找東西隨時找我～對了，你知道上傳商品可以順便用 AI 幫你改寫描述嗎？超方便！😉",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嘿～歡迎再來逛市集！說真的，我剛剛還在抱怨自己一天到晚都在翻清單，結果想到：要是大家都多上傳商品，我就能更有成就感啦😏。" +
        "小提醒～上傳商品的時候還有 AI 改寫描述功能，能幫你寫得更生動。對了，你今天要不要也讓我幫你搜尋一下？",
      type: "normal",
      skipTalk: false,
    },
    // 活動指南
    {
      content:
        "哈囉～剛休息一秒又被叫回來啦😅 不過還好，至少能趁機跟你閒聊。你知道嗎？活動指南裡面不只講流程，還有這次活動的初心跟捐贈單位介紹，超暖心QQ。" +
        "等你看完再回來找我，我會乖乖幫你搜尋商品的！",
      type: "normal",
      skipTalk: false,
    },
    // 個人中心
    {
      content:
        "安安，你想要找什麼商品呢，對了！推薦你趁空檔去個人中心看看！那邊有很多有趣的功能喔！",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嗨嗨～又見到你了🙋 我才剛在個人中心的\"我的資料設定\"換了個新大頭貼（好啦其實只是想炫耀一下功能），你要不要也去玩玩？唉唷，差點忘記你是來找商品的XD告訴我你想找什麼寶貝吧！",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嗨～同事！我剛在個人中心的\"我的商品管理\"偷看自己累積的捐贈金額，結果嚇一跳，原來我也算半個公益員工了（雖然我沒錢只能算心意😂）。" +
        "不過你也可以去看看自己的紀錄啦～很有成就感！那現在要不要告訴我，你要找什麼東西？",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "哈囉～👋 我今天被 call 來上班，還想說要不要趁空檔去回饋信箱投訴自己太話多🤣。你也可以去那邊寫下建議，實名或匿名都行！",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嗨～老實說，我最大的困擾是『碎嘴太多卻不能被 mute』😂。如果是你，完全可以去回饋信箱吐槽我，匿名也行！不過在那之前，要不要先讓我幫你找商品？",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嗨嗨～👋 你知道嗎？我翻清單翻到快變 AI 倉管員了🤣 不過至少還能偷看大家收藏了什麼。快去看看你的收藏清單吧～裡面可能有寶貝等你回顧！",
      type: "normal",
      skipTalk: false,
    },
    {
      content:
        "嘿嘿，我剛剛在自言自語：『要是我也能按愛心就好了💔』。結果想想，我自己根本沒有收藏功能😅。不過你有啊～去你的收藏看看，說不定會想再下手。要不要順便告訴我你現在想找的？",
      type: "normal",
      skipTalk: false,
    },
    { content: "嗨～我是 AI 小助理！🙋‍♂️你現在看到的這片市集就像一座大迷宮，到處都有寶藏。不過別擔心，有我在，你只要丟一句話，我就會立刻幫你把相關的商品找出來。不管是隨口的一個形容詞，還是很具體的需求，都交給我吧～那麼，今天想先從什麼開始找呢？", type: "normal", skipTalk: false },
    { content: "哈囉～這裡是 AI 小助理報到！😂我最擅長的工作，就是幫你把滿滿的商品快速整理好。你只需要告訴我一個方向，比如『適合送人的禮物』或『辦公桌小物』，我就會馬上展開搜尋。把我當成市集裡最認真、最快腳的導遊就對啦～那現在，想先試試看要找什麼嗎？", type: "normal", skipTalk: false },
    { content: "哈囉，我是你的 AI 小助理。🌸市集就像一本翻不完的散文集，每一頁都有不同的篇章。而我的任務，就是在這些篇章裡，替你尋找那句最貼近心意的句子。你只需要給我一個方向，無論是『適合送人的小禮物』，或是『留給自己的溫柔角落』，我都會細心幫你找到。要不要現在，就讓我們開始這趟小小的尋寶之旅？", type: "normal", skipTalk: false },

  ]

  const talking = useCallback(async (): Promise<void> => {
    await new Promise((resolve) => {
      setIsTalking(true);
      setTimeout(resolve, 1000);
    });
    if (phase === 'idle' && !!aiResponse) {
      setIsTalking(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 狀態改變 → 重置 / 重新掛載
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      setInstanceId(id => id + 1); // 讓子元件重新 mount 清掉內部 bubbleText/visible
    }

    if (phase === 'loading') {
      setSentences([{ content: "AI 小助手正在思考中...", type: "thinking" }]);
      talking();
    } else if (phase === 'error') {
      setSentences([{ content: errorMsg, type: "silent" }]);
      talking();
    } else if (phase === 'answer') {
      setSentences([{ content: aiResponse, type: "normal" }]);
      talking();
    } else {
      if (sessionService.getHasViewedAISearchIntro()) {
        const i = Math.floor(Math.random() * introSentences.length);
        setSentences(introSentences.slice(i, i + 1));
        talking();
      } else {
        setSentences(introSentences.slice(0, 1));
        talking();
      }
    }
  }, [phase, errorMsg]);

  return (
    <div
      style={{
        minHeight: 200,
        backgroundColor: color,
        padding: "0.6rem 0.8rem",
        transition: "opacity 0.4s ease, transform 0.3s ease",
        opacity: isMounted && isVisible ? 1 : 0, // 根據 isVisible 控制透明度
        transform: isMounted && isVisible ? "translateY(0)" : "translateY(-20px)", // 添加淡入淡出效果
        pointerEvents: isVisible ? "auto" : "none", // 隱藏時禁用交互
      }}
    >
      <RobotAvatarWithDialog
        key={instanceId}
        sentences={sentences}
        size={64}
        dialogMaxWidth={"60%"}
        dialogMaxHeight={"160px"}
        isTalking={isTalking}
        onTalkEnd={() => sessionService.setHasViewedAISearchIntro(true)}
        skipTalkAnimation={sentences[0]?.skipTalk || false}
        disableTickle
        disableCursor
        disableShadow
      />
    </div>
  );
}

const slogans = [
  "一頁好物，一路愛心",
  "慢慢逛，默默行善",
  "揀喜歡的，做對的事",
  "東西不多，但都暖心",
  "節省預算，不省溫度",
  "每筆都為世界加分",
  "這些商品，有點善",
  "用購物支持每份善意",
  "買東西，也可以是愛",
  "挑好物，也做點好事"
];

const ProductList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { scrollToTop } = useScroll({ thresholdTop: 350 });
  
  // 添加通知檢查器
  const { manualCheck: checkOnlineDealNotifications } = useOnlineDealNotificationChecker();
  
  const [currentSlogan] = useState(() => {
    return slogans[Math.floor(Math.random() * slogans.length)];
  });
  const productList = useSelector((state: RootState) => state.product.list.items || []);
  const total = useSelector((state: RootState) => state.product.list.total);
  const aiResponse = useSelector((state: RootState) => state.product.list.aiResponse || '');
  const allAiResults = useSelector((state: RootState) => state.product.list.allAiResults || []); // 新增：完整的 AI 結果
  const retrieveProductsError = useSelector((state: RootState) => state.product.apiStatus.retrieveProducts?.error);
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [likedProductsLoaded, setLikedProductsLoaded] = useState(false); // 新增狀態追蹤收藏清單是否載入完成
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);
  const lastProcessedAiResponse = useRef<string>(''); // 追蹤上次處理的 AI 回應

  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [pageSize, setPageSize] = useState(12);

  // 從 Redux store 取得使用者資訊
  const currentUser = useSelector((state: RootState) => state.user.profile);
  
  // 排序方式整數到字串的映射
  const sortOrderIntToString = (sortOrder: number): string => {
    switch (sortOrder) {
      case 0: return 'id';
      case 1: return 'id_desc';
      case 2: return 'price_asc';
      case 3: return 'price_desc';
      case 4: return 'like_count_desc';
      case 5: return 'comment_count_desc';
      case 6: return 'view_count_desc';
      default: return 'id_desc'; // 預設為新上架優先
    }
  };

  // 商品狀態映射
  const getProductStatusFromPreference = (preference: number): string | number | undefined => {
    switch (preference) {
      case 0: return 0;
      case 1: return 1;
      case 2: return 2;
      case 3: return 'unsold';
      case 4:
      default: return undefined; // 沒選 - 不設定任何篩選
    }
  };

  // 統一處理商品狀態的轉換邏輯
  const processProductStatus = (productStatus: string | number | undefined): any => {
    if (productStatus === 'unsold') {
      return [0, 1]; // 尚未成交包含：尚未到貨、已到貨
    }
    return productStatus;
  };

  // Toggle: show/hide the quick-action floating buttons on this page
  const showQuickActions = true; // set to false to hide the quick function buttons

  // 創建初始查詢參數，暫時使用系統預設值，等 currentUser 載入後再更新
  const [queryParams, setQueryParams] = useState(() => {
    // 簡化初始化：使用最基本的系統預設值，不依賴 localStorage
    // 等 currentUser 載入完成後，會透過 useEffect 更新為用戶偏好
    // 使用一個臨時的初始值，確保與任何用戶偏好都不相同，這樣用戶偏好才會被正確應用
    return {
      minPrice: 0,
      maxPrice: undefined,
      isApprove: true,
      strquery: '',
      orderBy: 'temp_initial', // 使用臨時值，確保用戶偏好會被正確應用
      limit: 12,
      offset: 0, // 固定從第一頁開始，避免從URL中的頁碼觸發錯誤的初始請求
      sellerNickname: '',
      productStatus: undefined, // 固定使用系統預設值
    };
  });

  const [form] = Form.useForm();
  
  // 確保表單初始值正確設置
  useEffect(() => {
    form.setFieldsValue({
      sortBy: queryParams.orderBy
    });
  }, []); // 只在組件掛載時執行一次
  
  // 本地排序值，用於 UI 顯示同步
  const [sortValue, setSortValue] = useState<string>(() => {
    return 'id_desc'; // 默認為新上架優先
  });

  // 當 queryParams 的 orderBy 變動時，同步本地 sortValue
  useEffect(() => {
    setSortValue(queryParams.orderBy || 'id_desc');
  }, [queryParams.orderBy]);

  // 本地商品狀態值，用於 UI 顯示同步
  const [displayProductStatus, setDisplayProductStatus] = useState<string | number | undefined>(() => {
    return undefined; // 會在後面的 useEffect 中同步
  });

  // 反向轉換：從API值轉換回UI顯示值
  const reverseProductStatus = (apiValue: any): string | number | undefined => {
    if (Array.isArray(apiValue) && apiValue.length === 2 && apiValue.includes(0) && apiValue.includes(1)) {
      return 'unsold'; // [0, 1] 對應 "尚未成交"
    }
    return apiValue;
  };

  // 同步 queryParams.productStatus 到 displayProductStatus（反向轉換）
  useEffect(() => {
    const displayValue = reverseProductStatus(queryParams.productStatus);
    setDisplayProductStatus(displayValue);
  }, [queryParams.productStatus]);

  const blue = "#DCE6F2";
  const pink = "#FADADD";
  const darkBlue = "#dce4ed7a";
  const darkPink = "#d52a341a";
  const [generalSearchColor, setGeneralSearchColor] = useState(blue);
  const [aiSearchColor, setAiSearchColor] = useState(blue);
  const [aiResponseColor, setAiResponseColor] = useState(darkBlue);
  const [isAISearch, setIsAISearch] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);  // 添加狀態追蹤是否已搜尋
  const [isPageChanging, setIsPageChanging] = useState(false); // 添加換頁狀態
  const [previousPageSize, setPreviousPageSize] = useState(pageSize); // 追蹤上一次的 pageSize
  const [userPreferencesApplied, setUserPreferencesApplied] = useState(false); // 追蹤用戶偏好是否已應用
  const [isUserDataLoading, setIsUserDataLoading] = useState(true); // 追蹤用戶資料載入狀態
  
  // 監控用戶資料載入狀態
  useEffect(() => {
    if (currentUser !== null) {
      // 用戶資料已載入（不管是登錄還是未登錄狀態）
      setIsUserDataLoading(false);
    }
  }, [currentUser]);

  // 當使用者偏好設定載入後，更新查詢參數並重新載入資料
  useEffect(() => {
    if (currentUser && currentUser.default_product_status !== undefined && currentUser.default_sort_order !== undefined && !userPreferencesApplied) {
      const newProductStatus = getProductStatusFromPreference(currentUser.default_product_status);
      const newSortOrder = sortOrderIntToString(currentUser.default_sort_order);
      
      console.log('Applying user preferences:', { newProductStatus, newSortOrder, currentPage });
      
      // 總是應用用戶偏好，但保持當前頁面
      const newParams = {
        ...queryParams,
        productStatus: processProductStatus(newProductStatus),
        orderBy: newSortOrder,
        offset: (currentPage - 1) * pageSize, // 保持當前頁面
        limit: pageSize // 確保 limit 正確
      };
      
      setQueryParams(newParams);
      // 不重置頁碼，保持用戶當前訪問的頁面
      setUserPreferencesApplied(true); // 標記已應用
      
      // 確保表單和UI狀態正確同步，無論值是否有變化
      form.setFieldsValue({
        sortBy: newSortOrder
      });
      setSortValue(newSortOrder);
      
      // 確保 displayProductStatus 同步
      setDisplayProductStatus(newProductStatus);
      
      // 由於 queryParams 更新，會由下面的 useEffect 自動觸發 fetchProducts
      // 所以這裡不需要手動調用 dispatch(fetchProducts(newParams))
    }
  }, [currentUser?.default_product_status, currentUser?.default_sort_order, userPreferencesApplied, dispatch, currentPage, pageSize]);

  // 當 queryParams 更新時，同步更新 Form 的欄位值（排除 productStatus，由 displayProductStatus 控制）
  useEffect(() => {
    if (form) {
      form.setFieldsValue({
        sortBy: queryParams.orderBy
      });
    }
  }, [queryParams.orderBy, form]);
  
  // 活動歷程Modal相關狀態
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  
  // 市集新聞Modal相關狀態
  const [newsModalVisible, setNewsModalVisible] = useState(false);
  const [newsContent, setNewsContent] = useState<string>("");
  const [newsError, setNewsError] = useState('');
  const newsScrollRef = useRef<HTMLDivElement>(null); // 新聞內容滾動引用
  const newsRevealTimerRef = useRef<number | null>(null); // 控制逐行顯示的計時器
  const [isNewsRevealing, setIsNewsRevealing] = useState(false); // 是否正在逐行顯示
  const [fullNewsContent, setFullNewsContent] = useState(''); // 完整新聞內容
  const [isRobotTalking, setIsRobotTalking] = useState(false); // 控制機器人說話狀態
  const [robotImage, setRobotImage] = useState<string>(RobotInit); // 控制機器人圖片
  const [userScrolledUp, setUserScrolledUp] = useState(false); // 追蹤用戶是否手動向上滾動
  const lastScrollTopRef = useRef<number>(0); // 記錄上次滾動位置
  const isAutoScrollingRef = useRef<boolean>(false); // 標記是否正在自動滾動

  // 新聞播報機器人對話句子
  const newsRobotSentences: RobotSentence[] = [
    { content: "我剛播完今日新聞，有什麼想法嗎？📰" },
    { content: "別光看新聞啦，快去上架你的寶物！✨" },
    { content: "今天的市集新聞還滿精彩的對吧？😎" },
    { content: "我不只會播新聞，還會吐槽！厲害吧？🤖" },
    { content: "你這樣一直點我，是想要重播新聞嗎？" },
    { content: "我是專業播報員，不是玩具！😤" },
    { content: "點我可以，但要記得去參與市集活動喔！" },
    { content: "新聞播完了，現在換你上台表演？🎭" },
    { content: "我的播報技巧是不是很專業？👨‍💼" },
    { content: "想聽八卦？抱歉，我只播正經新聞！📺" },
    { content: "你知道嗎？我每天都在練習播報技巧！🎤" },
    { content: "別再點了，我已經把今天的新聞都說完了！", type: "silent" },
    { content: "你是不是想要我重播一遍？我才不要！", type: "silent" },
    { content: "我又不是點歌機，不要一直點我！", type: "silent" },
    { content: "點來點去的，你當我是遙控器嗎？📱", type: "silent" },
    { content: "我是新聞播報員，不是互動遊戲！", type: "silent" },
  ];

  // 新聞播報自動觸發邏輯 - 參考 AI 搜索的 useEffect
  useBodyOverflowFix(timelineModalVisible || newsModalVisible);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // 獲取活動歷程數據
  const fetchTimelineData = async () => {
    try {
      setTimelineLoading(true);
      const result = await getTimelineEvents((error) => console.error('Failed to fetch timeline events:', error));
      if (result?.events) {
        setTimelineEvents(result.events);
      }
    } catch (error) {
      console.error('獲取活動歷程失敗:', error);
      message.error('獲取活動歷程失敗');
    } finally {
      setTimelineLoading(false);
    }
  };

  // 開啟活動歷程modal
  const handleTimelineClick = async () => {
    setTimelineModalVisible(true);
    await fetchTimelineData();
    
    // 等待Modal渲染完成後滾動到底部
    setTimeout(() => {
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollTop = timelineScrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // 清除新聞逐行顯示的計時器
  const clearNewsRevealTimer = useCallback(() => {
    if (newsRevealTimerRef.current) {
      clearInterval(newsRevealTimerRef.current);
      newsRevealTimerRef.current = null;
    }
  }, []);

  // 跳過跑馬燈，直接顯示完整內容
  const skipMarqueeEffect = useCallback(() => {
    if (newsRevealTimerRef.current) {
      clearInterval(newsRevealTimerRef.current);
      newsRevealTimerRef.current = null;
    }
    setIsNewsRevealing(false);
    setIsRobotTalking(false); // 停止說話
    setRobotImage(RobotInit); // 切換回靜止圖片
    setNewsContent(fullNewsContent.replace(/\n/g, '<br/>'));
  }, [fullNewsContent]);

  // 簡化版逐行顯示文字（每秒新增一行）
  const progressiveRevealByVisualLines = async (
    text: string,
    setter: (val: string) => void,
    intervalMs: number = 1000
  ): Promise<void> => {
    return new Promise((resolve) => {
      try {
        setIsNewsRevealing(true);
        setIsRobotTalking(true); // 開始說話
        setRobotImage(RobotTalking); // 切換到說話圖片
        setFullNewsContent(text); // 儲存完整內容
        
        // 重置滾動狀態，允許新的播報自動滾動
        setUserScrolledUp(false);
        lastScrollTopRef.current = 0;
        isAutoScrollingRef.current = false;

        // 更智能的分行邏輯：優先考慮語義完整性
        const lines: string[] = [];
        const paragraphs = text.split('\n').filter(line => line.trim() !== '');
        
        paragraphs.forEach(paragraph => {
          const trimmedParagraph = paragraph.trim();
          
          // 首先按主要標點符號分割成句子
          const sentences = trimmedParagraph.split(/([。！？；])/);
          let currentLine = '';
          
          for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i];
            const punctuation = sentences[i + 1] || '';
            const fullSentence = sentence + punctuation;
            
            if (!sentence.trim()) continue;
            
            // 如果當前行加上新句子會太長，先處理當前行
            if (currentLine && (currentLine + fullSentence).length > 45) {
              // 檢查當前行是否可以在逗號處分割
              const commaIndex = currentLine.lastIndexOf('，');
              if (commaIndex > 15 && currentLine.length > 35) {
                lines.push(currentLine.substring(0, commaIndex + 1));
                currentLine = currentLine.substring(commaIndex + 1).trim() + fullSentence;
              } else {
                lines.push(currentLine.trim());
                currentLine = fullSentence;
              }
            } else {
              currentLine += fullSentence;
            }
            
            // 如果單個句子本身就很長，需要在逗號處分割
            if (currentLine.length > 50) {
              const parts = currentLine.split('，');
              let tempLine = '';
              
              for (let j = 0; j < parts.length; j++) {
                const part = parts[j] + (j < parts.length - 1 ? '，' : '');
                
                if (tempLine && (tempLine + part).length > 45) {
                  lines.push(tempLine);
                  tempLine = part;
                } else {
                  tempLine += part;
                }
              }
              
              currentLine = tempLine;
            }
          }
          
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
        });

        // 如果沒有生成任何行，直接顯示原文
        if (lines.length === 0) {
          setter(text.replace(/\n/g, '<br/>'));
          setIsNewsRevealing(false);
          setIsRobotTalking(false); // 停止說話
          setRobotImage(RobotInit); // 切換回靜止圖片
          resolve();
          return;
        }

        // 逐行顯示
        let currentIndex = 1;
        
        const renderLines = () => {
          const displayedLines = lines.slice(0, currentIndex);
          // 為新出現的行添加動畫效果
          const htmlLines = displayedLines.map((line, index) => {
            const isNewLine = index === currentIndex - 1;
            const animationClass = isNewLine ? 'news-line-new' : 'news-line-shown';
            return `<div class="${animationClass}">${line}</div>`;
          });
          setter(htmlLines.join(''));
          
          // 只有在用戶沒有手動向上滾動時才自動滾動到底部
          if (newsScrollRef.current && !userScrolledUp) {
            // 標記正在自動滾動
            isAutoScrollingRef.current = true;
            
            // 執行自動滾動
            newsScrollRef.current.scrollTop = newsScrollRef.current.scrollHeight;
            lastScrollTopRef.current = newsScrollRef.current.scrollTop;
            
            // 短暫延遲後清除自動滾動標記
            setTimeout(() => {
              isAutoScrollingRef.current = false;
            }, 50);
          }
        };

        // 立即顯示第一行
        renderLines();

        // 如果只有一行，直接結束，並將最後一行標記為已顯示，避免之後狀態變更觸發閃爍
        if (lines.length === 1) {
          setTimeout(() => {
            // 將最後一行從 new 狀態改為 shown，避免 CSS 動畫再次觸發
            const finalHtml = `<div class="news-line-shown">${lines[0]}</div>`;
            setter(finalHtml);
            setIsNewsRevealing(false);
            setIsRobotTalking(false); // 停止說話
            setRobotImage(RobotInit); // 切換回靜止圖片
            resolve();
          }, 1000);
          return;
        }

        // 清除之前的計時器
        if (newsRevealTimerRef.current) {
          clearInterval(newsRevealTimerRef.current);
          newsRevealTimerRef.current = null;
        }

        // 每秒新增一行
        newsRevealTimerRef.current = window.setInterval(() => {
          if (currentIndex < lines.length) {
            currentIndex++;
            renderLines();
          } else {
            // 所有行都顯示完畢：將最後一行從 new 狀態改為 shown，避免後續互動導致動畫重跑而閃爍
            if (newsRevealTimerRef.current) {
              clearInterval(newsRevealTimerRef.current);
              newsRevealTimerRef.current = null;
            }
            const finalHtml = lines.map(l => `<div class="news-line-shown">${l}</div>`).join('');
            setter(finalHtml);
            setIsNewsRevealing(false);
            setIsRobotTalking(false); // 停止說話
            setRobotImage(RobotInit); // 切換回靜止圖片
            resolve();
          }
        }, intervalMs);

      } catch (error) {
        console.error('Progressive reveal error:', error);
        // 出錯時直接顯示全文
        setter(text.replace(/\n/g, '<br/>'));
        setIsNewsRevealing(false);
        setIsRobotTalking(false); // 停止說話
        setRobotImage(RobotInit); // 切換回靜止圖片
        resolve();
      }
    });
  };  // 處理市集新聞 - 使用 typewriter 播報方式
  const handleNewsClick = async () => {
    try {
      clearNewsRevealTimer();
      setNewsModalVisible(true);
      setNewsError('');
      setNewsContent('準備播報今日市集新聞...'); // 簡單 Loading 提示
      setIsNewsRevealing(false);
      setFullNewsContent('');      // 短暫延遲後開始載入，讓用戶看到初始界面
      setTimeout(async () => {
        
        try {
          const response = await fetch('/api/news/daily');
          const result = await response.json();
          
          if (result.success) {
            const newsText = result.data.news.content;
            
            // 逐行（依實際換行）顯示新聞
            await progressiveRevealByVisualLines(
              newsText,
              setNewsContent,
              1000 // 每秒增加一行
            );
          } else {
            setNewsError('獲取新聞失敗，請稍後再試');
            setTimeout(() => setNewsModalVisible(false), 2000);
          }
        } catch (error) {
          setNewsError('網路錯誤，請稍後再試');
          setTimeout(() => setNewsModalVisible(false), 2000);
        }
      }, 300); // 300ms 延遲讓用戶看到初始狀態
      
    } catch (error) {
      setNewsError('網路錯誤，請稍後再試');
      setTimeout(() => setNewsModalVisible(false), 2000);
    }
  };  const resetQueryParams = () => {
    form.resetFields();
    // 設置排序方式的初始值
    form.setFieldsValue({ sortBy: 'id' });
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    setQueryParams({
      minPrice: 0,
      maxPrice: undefined,
      isApprove: true,
      strquery: '',
      orderBy: 'id',
      limit: pageSize,
      offset: 0,
      sellerNickname: '',
      productStatus: undefined,
    });
  };

  const handleSearch = (values: any) => {
    scrollToTop(100);
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    
    // 只處理實際傳入的字段，避免覆蓋其他字段
    let processedValues = { ...values };
    
    // 只有當 productStatus 被明確傳入時才進行轉換
    if ('productStatus' in values) {
      processedValues.productStatus = processProductStatus(values.productStatus);
    }
    
    setQueryParams({
      ...queryParams,
      ...processedValues,
      offset: 0,
      limit: pageSize,
      isApprove: true
    });
    setHasSearched(true);  // 設置搜尋狀態
  };

  const handleAISearch = (values: any) => {
    scrollToTop(100);
    setAiQuery(values.aiQuery);
    setIsLoading(true);
    // 啟動新查詢時重置上一輪錯誤
    setErrorMsg("");
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    setHasSearched(true);  // 設置搜尋狀態
    // 直接派送第一頁 AI 取回
    dispatch(retrieveProducts({ userQuery: values.aiQuery }));
  };

  const handleClearField = (field: string) => {
    // 清除單個欄位時不需要滾動到頂部
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    setQueryParams({ ...queryParams, [field]: undefined, offset: 0 });
    
    // 只更新表單字段，不包括 productStatus（現在由 displayProductStatus 控制）
    if (field !== 'productStatus') {
      form.setFieldsValue({ [field]: undefined });
    }
    
    // 如果清除的是商品狀態，也要重置顯示狀態
    if (field === 'productStatus') {
      setDisplayProductStatus(undefined);
    }
  };

  const handlePageChange = useCallback((page: number) => {
    setIsPageChanging(true);
    setCurrentPage(page);
    setSearchParams({ page: page.toString() });
    
    if (isAISearch && aiQuery) {
      // AI 分頁：只有在有 AI 查詢時才呼叫 retrieveProducts
      dispatch(updateProductList({
        items: cachedProducts.slice((page - 1) * pageSize, page * pageSize),
        total: cachedProducts.length
      }));
      // AI 搜尋換頁比較快，短時間後重置狀態
      setTimeout(() => setIsPageChanging(false), 50);
    } else {
      // 一般分頁或 AI 模式但沒有查詢時，使用一般的 fetchProducts
      const newQueryParams = {
        ...queryParams,
        offset: (page - 1) * pageSize,
        limit: pageSize,
        isApprove: true
      };
      setQueryParams(newQueryParams);
      // 移除重複的 dispatch，由 queryParams useEffect 自動處理
      console.log('📄 Page changed, updating queryParams:', newQueryParams);
      setTimeout(() => setIsPageChanging(false), 200);
    }
    
    // 平滑滾動到商品列表區域，而不是頁面頂部
    setTimeout(() => {
      const productListElement = document.getElementById('product-list');
      if (productListElement) {
        productListElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }, [isAISearch, aiQuery, cachedProducts, pageSize, queryParams, setSearchParams, dispatch]);

  const handleClear = () => {
    setErrorMsg("");
    setAiQuery("");
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    setUserPreferencesApplied(false); // 重置偏好應用標記，允許重新應用偏好
    
    // 使用用戶偏好設定或系統預設值
    let defaultProductStatus = undefined;
    let defaultSortOrder = 'id_desc'; // 預設為新上架優先
    
    if (currentUser && currentUser.default_product_status !== undefined && currentUser.default_sort_order !== undefined) {
      // 從使用者 profile 讀取偏好設定
      defaultProductStatus = getProductStatusFromPreference(currentUser.default_product_status);
      defaultSortOrder = sortOrderIntToString(currentUser.default_sort_order);
    }
    
    const defaultParams = {
      minPrice: 0,
      maxPrice: undefined,
      isApprove: true,
      strquery: '',
      orderBy: defaultSortOrder,
      limit: pageSize,
      offset: 0,
      sellerNickname: '',
      productStatus: processProductStatus(defaultProductStatus),
    };
    setQueryParams(defaultParams);
    dispatch(fetchProducts(defaultParams));
    setHasSearched(false);  // 重置搜尋狀態
    form.resetFields();  // 清除表單
    // 設置排序方式和商品狀態的初始值為用戶偏好
    form.setFieldsValue({ 
      sortBy: defaultSortOrder
    });
    // 同步更新本地排序值
    setSortValue(defaultSortOrder);
    // displayProductStatus 會透過 useEffect 自動同步
    setUserPreferencesApplied(true); // 標記偏好已應用
  };

  // 首頁載入時檢查線上交易通知
  useEffect(() => {
    checkOnlineDealNotifications();
  }, []); // 只在組件首次載入時執行

  useEffect(() => {
    console.log('🔍 queryParams useEffect triggered:', {
      currentUser: !!currentUser,
      userPreferencesApplied,
      defaultProductStatus: currentUser?.default_product_status,
      defaultSortOrder: currentUser?.default_sort_order,
      queryParamsOrderBy: queryParams.orderBy,
      isAISearch,
      aiQuery
    });
    
    // 只有在非 AI 搜尋時才執行一般的商品獲取
    // 並且避免在分頁大小變更時重複發送請求
    // 等待用戶資訊載入完成後再發送請求，避免重複請求
    if (!isAISearch || !aiQuery) {
      setIsPageChanging(false);
      // 只有當不是因為分頁大小變更觸發時才發送請求
      // 分頁大小變更的請求已經在上面的 useEffect 中處理了
      if (previousPageSize === pageSize) {
        
        // 如果用戶資料還在載入中，等待載入完成
        if (isUserDataLoading) {
          console.log('⏳ User data is still loading...');
          return;
        }
        
        // 如果有用戶資訊但偏好欄位還沒載入完成，等待載入
        if (currentUser && 
            (currentUser.default_product_status === undefined || currentUser.default_sort_order === undefined)) {
          console.log('⏳ Waiting for user preference data to load...');
          return;
        }
        
        // 如果有用戶資訊且還沒應用偏好，等待偏好應用完成
        if (currentUser && !userPreferencesApplied) {
          console.log('⏳ Waiting for user preferences to be applied...');
          return;
        }
        
        // 現在可以安全地發送請求
        // 如果是臨時初始值，替換為系統默認值
        let finalQueryParams = queryParams;
        if (queryParams.orderBy === 'temp_initial') {
          finalQueryParams = {
            ...queryParams,
            orderBy: 'id_desc' // 系統默認為新上架優先
          };
        }
        
        console.log('📡 Fetching products from queryParams useEffect:', finalQueryParams);
        dispatch(fetchProducts(finalQueryParams));
      }
    } else {
      console.log('🤖 Skipping product fetch due to AI search mode');
    }
  }, [queryParams, dispatch, isAISearch, aiQuery, previousPageSize, pageSize, currentUser, userPreferencesApplied, isUserDataLoading]);

  useEffect(() => {
    // 只有當 pageSize 真正改變時才重置到第一頁
    if (previousPageSize !== pageSize) {
      setPreviousPageSize(pageSize);
      setCurrentPage(1);
      setSearchParams({ page: '1' });
      
      // 立即更新 queryParams，讓上面的 useEffect 自動觸發請求
      if (!isAISearch || !aiQuery) {
        const newQueryParams = {
          ...queryParams,
          offset: 0,
          limit: pageSize
        };
        setQueryParams(newQueryParams);
        // 移除重複的 dispatch，由 queryParams useEffect 自動處理
        console.log('📏 PageSize changed, updating queryParams:', newQueryParams);
      } else {
        // AI 搜尋模式下，只需要更新本地分頁顯示
        dispatch(updateProductList({
          items: cachedProducts.slice(0, pageSize),
          total: cachedProducts.length
        }));
      }
    }
  }, [pageSize, previousPageSize, queryParams, isAISearch, aiQuery, cachedProducts, setSearchParams, dispatch]);

  // 使用 ref 避免無限迴圈
  const allAiResultsRef = useRef<Product[]>([]);
  const isAISearchRef = useRef<boolean>(false);

  // 同步 refs
  useEffect(() => {
    allAiResultsRef.current = allAiResults;
    isAISearchRef.current = isAISearch;
  }, [allAiResults, isAISearch]);

  useEffect(() => {
    // 只在 aiResponse 有值且與上次處理的不同時才執行
    if (aiResponse && aiResponse !== lastProcessedAiResponse.current) {
      lastProcessedAiResponse.current = aiResponse;
      setErrorMsg("");
      setIsLoading(false);
      setHasSearched(true);  // 添加這行，確保在收到 AI 回應時設置搜尋狀態
      
      // 使用 setTimeout 確保在下一個事件循環中執行，此時 Redux store 應該已經更新
      setTimeout(() => {
        if (isAISearchRef.current && allAiResultsRef.current.length > 0) {
          setCachedProducts([...allAiResultsRef.current]); // 使用完整的 AI 結果
        }
      }, 0);
      // 不需要手動更新 productList，因為 retrieveProducts 已經處理了
    }
  }, [aiResponse]);

  useEffect(() => {
    if (retrieveProductsError) {
      setErrorMsg("AI 搜尋發生錯誤，請重試或切換到一般搜尋");
      setIsLoading(false);
      dispatch(updateProductList({
        items: [],
        total: 0
      }));
    }
  }, [retrieveProductsError]);

  useEffect(() => {
    getLikedProducts(() => {
      console.error("取得收藏清單失敗");
      setLikedProductsLoaded(true); // 即使失敗也設為已載入
      return { items: [], total: 0 };
    }).then((res) => {
      setLikedProducts(res.items);
      setLikedProductsLoaded(true); // 設為已載入完成
    });

    // 設置表單初始值
    form.setFieldsValue({ sortBy: 'id' });

    // 卸載時確保清除計時器
    return () => {
      if (newsRevealTimerRef.current) {
        clearInterval(newsRevealTimerRef.current);
        newsRevealTimerRef.current = null;
      }
    };
  }, [form]);

  // 優化的回調函數，使用 useCallback 避免不必要的重新渲染
  const handleLikeProduct = useCallback((id: number, product: Product) => {
    likeProduct(id, console.error).then(() => {
      setLikedProducts((prev) => [...prev, product]);
      // 本地更新商品的讚數，避免重新獲取所有數據
      const updatedProductList = productList.map(p => 
        p.id === id ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      );
      // 更新 Redux store 中的商品列表
      dispatch(updateProductList({ items: updatedProductList, total }));
    });
  }, [productList, total, dispatch]);

  const handleUnlikeProduct = useCallback((id: number) => {
    unlikeProduct(id, console.error).then(() => {
      setLikedProducts((prev) => prev.filter(p => p.id !== id));
      // 本地更新商品的讚數，避免重新獲取所有數據
      const updatedProductList = productList.map(p => 
        p.id === id ? { ...p, like_count: Math.max((p.like_count || 0) - 1, 0) } : p
      );
      // 更新 Redux store 中的商品列表
      dispatch(updateProductList({ items: updatedProductList, total }));
    });
  }, [productList, total, dispatch]);

  // 獲取當前台灣時間
  // 取得當前台灣時間（使用 dayjs 時區，避免瀏覽器解析差異）
  const getCurrentTaiwanTime = () => dayjs().tz('Asia/Taipei');

  // 解析事件日期為台灣時區的時間：
  // - 若為純日期（YYYY-MM-DD），視為台灣當日 00:00
  // - 若包含時間或時區，沿用其資訊並轉換為台灣時區
  const parseEventDateTaipei = (dateStr: string) => {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (isDateOnly) {
      return dayjs.tz(`${dateStr} 00:00:00`, 'Asia/Taipei');
    }
    // 對於包含時間/時區的字串，dayjs 會尊重其偏移，再轉到台灣時區顯示
    return dayjs.tz(dateStr, 'Asia/Taipei');
  };

  // 構建時間軸項目，與Summary頁面保持一致，但只顯示當前台灣時間之前的事件
  const timelineItems = timelineEvents.length > 0 ?
    timelineEvents
      // 過濾只顯示當前台灣時間之前的事件（修正：避免 YYYY-MM-DD 被當作 UTC 導致台灣早上顯示不到）
      .filter(event => {
        const eventTs = parseEventDateTaipei(event.date).valueOf();
        const nowTs = getCurrentTaiwanTime().valueOf();
        return eventTs <= nowTs;
      })
      // 按日期排序時間軸事件（以台灣時區時間排序）
      .sort((a, b) => parseEventDateTaipei(a.date).valueOf() - parseEventDateTaipei(b.date).valueOf())
      .map(event => ({
        color: event.color,
        children: (
          <div>
            <Text strong>{event.title}</Text>
            <br />
            <Text type="secondary">{event.date} - {event.description}</Text>
          </div>
        ),
      })) : 
    // 只有當API數據為空時使用預設內容
    !timelineLoading ? [
      // 預設時間軸內容（如果API失敗時使用）
      {
        color: '#7ed321',
        children: (
          <div>
            <Text strong>活動啟動</Text>
            <br />
            <Text type="secondary">2025-08-26 - BidForGood 愛心市集正式上線開始</Text>
          </div>
        ),
      },
      {
        color: '#f5a623',
        children: (
          <div>
            <Text strong>首個商品上架</Text>
            <br />
            <Text type="secondary">第一件愛心商品成功上架，活動正式開跑！</Text>
          </div>
        ),
      },
      {
        color: '#FF5151',
        children: (
          <div>
            <Text strong>熱銷商品出現</Text>
            <br />
            <Text type="secondary">熱門商品開始湧現，參與者踴躍支持</Text>
          </div>
        ),
      },
      {
        color: '#52c41a',
        children: (
          <div>
            <Text strong>活動高潮</Text>
            <br />
            <Text type="secondary">參與人數達到高峰，愛心捐款持續增長</Text>
          </div>
        ),
      },
    ] : [];

  return (
    <div>
      {/* 預載入第一個商品圖片 */}
      {productList.length > 0 && productList[0]?.image_url && (
        <link 
          rel="preload" 
          as="image" 
          href={productList[0].image_url}
          style={{ display: 'none' }}
        />
      )}
      {!isAISearch ? (
        <GeneralSearchForm
          form={form}
          queryParams={queryParams}
          onSearch={handleSearch}
          onClearField={handleClearField}
          onSwitchToAI={() => {
            scrollToTop(100);
            setIsAISearch(true);
            resetQueryParams();
            setTimeout(() => {
              setGeneralSearchColor(pink);
              setAiSearchColor(pink);
              setAiResponseColor(darkPink);
            }, 400);
          }}
          color={generalSearchColor}
          hasSearched={hasSearched}
          sortValue={sortValue}
          setSortValue={setSortValue}
          displayProductStatus={displayProductStatus}
          setDisplayProductStatus={setDisplayProductStatus}
          onClear={async () => {
            await handleClear();
            scrollToTop(100);
          }}
        />
      ) : (
        <>
          <AISearchForm
            form={form}
            onSearch={handleAISearch}
            onFinishFailed={() => {
              scrollToTop(100);
              setErrorMsg("請描述你想搜尋的商品或需求");
            }}
            onSwitchToGeneral={() => {
              scrollToTop(100);
              setErrorMsg("");
              setIsAISearch(false);
              resetQueryParams();
              setTimeout(() => {
                setGeneralSearchColor(blue);
                setAiSearchColor(blue);
                setAiResponseColor(darkBlue);
              }, 300);
            }}
            onClear={async () => {
              await handleClear();
              scrollToTop(100);
            }}
            color={aiSearchColor}
            hasSearched={hasSearched}  // 添加這行
          />
          <AIResponseBlock
            aiResponse={aiResponse}
            errorMsg={errorMsg}
            color={aiResponseColor}
            isLoading={isLoading}
          />
        </>
      )}
      <div id="product-list" style={{ minHeight: "100vh", background: "#f5f7fa", padding: "20px 0" }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "18px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          padding: "24px 16px 16px 16px",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* 背景裝飾 */}
          <div 
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "120px",
              background: "linear-gradient(135deg, #f6f7fb 0%, #eef2f9 100%)",
              zIndex: 0
            }}
          />
          
          {/* 標題區域 */}
          <div style={{ position: "relative", zIndex: 1, marginBottom: "24px" }}>
            <div>
              <Title level={2} style={{ 
                textAlign: "center", 
                marginBottom: 4, 
                fontWeight: 800, 
                letterSpacing: 2,
                background: "linear-gradient(45deg, #1890ff, #722ed1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
              }}>
                探索愛心市集
              </Title>
              
              <div>
                <Text type="secondary" style={{ 
                  display: "block", 
                  textAlign: "center", 
                  marginBottom: 8, 
                  fontSize: 16,
                  letterSpacing: 1
                }}>
                  {currentSlogan}
                </Text>
              </div>
            </div>
            
            {/* 商品數量統計 */}
            <div 
              style={{
                textAlign: "center",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <motion.div 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 16px",
                  background: "#f0f5ff",
                  borderRadius: "20px",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.015)"
                }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 4px 12px rgba(24,144,255,0.15)"
                }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Text style={{ fontSize: 14, color: "#1890ff" }}>
                  目前共有 <Text strong style={{ fontSize: 16, marginInline: 2 }}>{total}</Text> 件商品
                </Text>
              </motion.div>
            </div>
          </div>
          
          <Row gutter={[24, 32]} justify="start">
            <div
              style={{
                width: '100%',
                opacity: isPageChanging ? 0.7 : 1,
                transition: 'opacity 0.15s ease'
              }}
            >
              {productList.length === 0 ? (
                <Col span={24}>
                  <motion.div 
                    style={{ 
                      padding: "40px 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "16px"
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <div style={{ textAlign: 'center' }}>
                          <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                            暫時沒有相關商品 <FrownOutlined style={{ color: '#1890ff' }} />
                          </Text>
                          <Text type="secondary">
                            {isAISearch ? "換個關鍵字試試看吧！" : "試試其他搜尋條件，或許能找到心儀的商品～"}
                          </Text>
                        </div>
                      }
                    />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        type="primary"
                        onClick={handleClear}
                        style={{
                          borderRadius: '6px',
                          marginTop: '8px'
                        }}
                      >
                        查看全部商品
                      </Button>
                    </motion.div>
                  </motion.div>
                </Col>
              ) : (
                <Row gutter={[24, 32]} justify="start" style={{ width: '100%' }}>
                  {productList.map((product: Product, index: number) => {
                    // 使用更平滑的淡入效果，避免突然蹦出來的感覺
                    const isPriority = index < 6;
                    
                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                        <motion.div
                          initial={{ 
                            opacity: 0,
                            y: 4 // 進一步減少垂直位移
                          }}
                          animate={{ 
                            opacity: 1, 
                            y: 0 
                          }}
                          transition={{ 
                            duration: 0.25, // 縮短動畫時間
                            delay: index * 0.03, // 減少延遲間隔
                            ease: [0.23, 1, 0.32, 1] // 使用更自然的緩動曲線
                          }}
                          whileHover={{ 
                            y: -4,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <ProductCard 
                            product={product}
                            showUnlike={true}
                            liked={likedProductsLoaded ? likedProducts.some(p => p.id === product.id) : false}
                            likedProductsLoaded={likedProductsLoaded}
                            onLike={(id) => handleLikeProduct(id, product)}
                            onUnlike={handleUnlikeProduct}
                            priority={isPriority} // 傳遞優先載入標記
                          />
                        </motion.div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>
          </Row>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "36px" }}>
            {productList.length > 0 && (
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                pageSizeOptions={[12, 36, 60, 120]}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                }}
                total={total}
                onChange={handlePageChange}
                style={{ marginTop: "10px", textAlign: "center" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 懸浮快捷按鈕 - 美化版本 */}
      {showQuickActions && (
        <>
          {/* 添加自定義樣式 */}
          <style>
            {`
              /* 主按鈕樣式美化 */
              .ant-float-btn-group .ant-float-btn-group-trigger {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border: none !important;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              }
              
              .ant-float-btn-group .ant-float-btn-group-trigger:hover {
                background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
                transform: scale(1.1) !important;
                box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6) !important;
              }
              
              .ant-float-btn-group .ant-float-btn-group-trigger .ant-float-btn-icon {
                color: white !important;
                transform: scale(1.1) !important;
              }
              
              /* 子按鈕樣式美化 */
              .ant-float-btn-group .ant-float-btn:not(.ant-float-btn-group-trigger) {
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: relative !important;
              }
              
              /* 活動歷程按鈕 */
              .timeline-float-btn {
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%) !important;
                box-shadow: 0 4px 16px rgba(255, 154, 158, 0.3) !important;
              }
              
              .timeline-float-btn:hover {
                background: linear-gradient(135deg, #ff8a95 0%, #fed7e2 100%) !important;
                transform: scale(1.1) !important;
                box-shadow: 0 8px 25px rgba(255, 154, 158, 0.5) !important;
              }
              
              .timeline-float-btn .ant-float-btn-icon {
                color: #d63384 !important;
                transform: scale(1.1) !important;
              }
              
              /* 市集新聞按鈕 */
              .news-float-btn {
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
                box-shadow: 0 4px 16px rgba(168, 237, 234, 0.3) !important;
              }
              
              .news-float-btn:hover {
                background: linear-gradient(135deg, #89e5e0 0%, #fbc2eb 100%) !important;
                transform: scale(1.1) !important;
                box-shadow: 0 8px 25px rgba(168, 237, 234, 0.5) !important;
              }
              
              .news-float-btn .ant-float-btn-icon {
                color: #0891b2 !important;
                transform: scale(1.1) !important;
              }
              
              /* Tooltip 美化 */
              .ant-tooltip-inner {
                background: rgba(0, 0, 0, 0.85) !important;
                backdrop-filter: blur(10px) !important;
                border-radius: 8px !important;
                font-size: 13px !important;
                padding: 8px 12px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
              }
              
              .ant-tooltip-arrow::before {
                background: rgba(0, 0, 0, 0.85) !important;
              }
              
              /* 按鈕展開動畫 */
              .ant-float-btn-group .ant-float-btn {
                animation: floatButtonSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              }
              
              @keyframes floatButtonSlideIn {
                from {
                  opacity: 0;
                  transform: translateX(20px) scale(0.8);
                }
                to {
                  opacity: 1;
                  transform: translateX(0) scale(1);
                }
              }
              
              /* 按鈕收起動畫 */
              .ant-float-btn-group.ant-float-btn-group-closed .ant-float-btn {
                animation: floatButtonSlideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
              }
              
              @keyframes floatButtonSlideOut {
                from {
                  opacity: 1;
                  transform: translateX(0) scale(1);
                }
                to {
                  opacity: 0;
                  transform: translateX(20px) scale(0.8);
                }
              }
              
              /* 主按鈕呼吸燈效果 */
              .ant-float-btn-group .ant-float-btn-group-trigger {
                position: relative !important;
              }
              
              .ant-float-btn-group .ant-float-btn-group-trigger::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                z-index: -1;
                animation: breathe 3s ease-in-out infinite;
                opacity: 0.6;
              }
              
              @keyframes breathe {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                50% {
                  transform: scale(1.1);
                  opacity: 0.3;
                }
              }
            `}
          </style>
          
          <FloatButton.Group
            trigger="click"
            type="primary"
            style={{ 
              right: 24,
              position: 'fixed',
              zIndex: 1000
            }}
            icon={<MenuOutlined />}
            tooltip={{ 
              title: "快捷功能", 
              placement: "left",
              overlayStyle: {
                fontSize: '13px',
                fontWeight: '500'
              }
            }}
          >
            <FloatButton
              className="timeline-float-btn"
              icon={<HistoryOutlined />}
              tooltip={{ 
                title: (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontWeight: '500'
                  }}>
                    <HistoryOutlined style={{ color: '#ff9a9e' }} />
                    活動歷程
                  </div>
                ), 
                placement: "left",
                overlayStyle: {
                  maxWidth: '200px'
                }
              }}
              onClick={handleTimelineClick}
            />
            <FloatButton
              className="news-float-btn"
              icon={<NotificationOutlined />}
              tooltip={{ 
                title: (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontWeight: '500'
                  }}>
                    <NotificationOutlined style={{ color: '#0891b2' }} />
                    市集新聞播報
                  </div>
                ), 
                placement: "left",
                overlayStyle: {
                  maxWidth: '200px'
                }
              }}
              onClick={handleNewsClick}
            />
          </FloatButton.Group>
        </>
      )}

      {/* 活動歷程 Dialog - 美化版本 */}
      <Modal
  getContainer={false}
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            <HistoryOutlined style={{ color: '#667eea' }} />
            活動歷程
          </div>
        }
        open={timelineModalVisible}
        onCancel={() => setTimelineModalVisible(false)}
        footer={null}
        width={520}
        style={{
          position: 'fixed',
          right: '120px',
          bottom: '20px',
          top: 'auto',
          margin: 0,
          transform: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
        mask={false}
        destroyOnClose={true}
        bodyStyle={{ 
          padding: 0, // 移除內邊距避免雙重滾動
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '0 0 12px 12px'
        }}
        centered={false}
      >
        <div 
          ref={timelineScrollRef}
          style={{ 
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '16px 16px 16px 8px' // 移到這裡設置內邊距
          }}
        >
          <Spin spinning={timelineLoading}>
            {timelineItems.length > 0 ? (
              <Timeline
                mode="left"
                items={timelineItems.map((item, index) => ({
                  ...item,
                  children: (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      whileHover={{ 
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {item.children}
                    </motion.div>
                  )
                }))}
                style={{ 
                  fontSize: '14px',
                  padding: '8px'
                }}
              />
            ) : (
              <Empty 
                description="暫無活動歷程" 
                style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '8px'
                }}
              />
            )}
          </Spin>
        </div>
      </Modal>

      {/* 市集新聞 Modal - 使用 typewriter 播報方式 */}
      <Modal
  getContainer={false}
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            <NotificationOutlined style={{ color: '#ff9a9e' }} />
            市集新聞播報
          </div>
        }
        open={newsModalVisible}
        onCancel={() => {
          clearNewsRevealTimer(); 
          setNewsModalVisible(false);
          setNewsContent('準備播報今日市集新聞...');
          setNewsError('');
          setIsNewsRevealing(false);
          setIsRobotTalking(false); // 停止說話
          setRobotImage(RobotInit); // 重置為靜止圖片
          setFullNewsContent('');
          // 重置滾動狀態
          setUserScrolledUp(false);
          lastScrollTopRef.current = 0;
          isAutoScrollingRef.current = false;
        }}
        footer={null}
        width={520}
        style={{
          position: 'fixed',
          right: '120px',
          bottom: '100px',
          top: 'auto',
          margin: 0,
          transform: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          height: '450px', // 固定 Modal 高度
          maxHeight: '450px' // 確保不會超過這個高度
        }}
        mask={false}
        destroyOnClose={true}
        bodyStyle={{ 
          padding: 0,
          background: 'linear-gradient(135deg, #fff5f5 0%, #fed7e2 100%)',
          borderRadius: '0 0 12px 12px',
          height: '400px', // 固定 body 高度（扣除 header）
          overflow: 'hidden' // 防止 body 本身出現滾動條
        }}
        centered={false}
      >
        <div 
          style={{ 
            height: '100%', // 使用完整的 body 高度
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {newsError ? (
            <div style={{ textAlign: 'center', color: '#ff4d4f' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>😞</div>
              <div>{newsError}</div>
            </div>
          ) : (
            <div style={{ 
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'center',
            }}>
              {/* 機器人頭像 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '12px',
                position: 'relative'
              }}>
                <div className="robot-container-news" style={{
                  width: '86px',  // 80px + 3px border * 2
                  height: '86px', // 80px + 3px border * 2
                  borderRadius: '50%',
                  border: '3px solid #ff9a9e',
                  boxShadow: '0 4px 12px rgba(255, 154, 158, 0.3)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* 僅在新聞機器人容器內，微調圖片水平位置 */}
                  <style>{`
                    .robot-container-news .ant-image img,
                    .robot-container-news .ant-image-img {
                      position: relative;
                      left: -2px; /* 需要更多或更少可改這裡，例如 -3px / -1px */
                    }
                  `}</style>
                  <RobotAvatarWithDialog
                    idleImage={RobotInit}
                    talkingImage={RobotTalking}
                    imageOverride={robotImage}
                    setImageOverride={setRobotImage}
                    sentences={newsRobotSentences}
                    size={80}
                    placement="leftTop"
                    dialogMaxWidth="300px"
                    isRandomMode={true}
                    disableTickle={false}
                    skipLongTextThreshold={50}
                    mountToBody={true}
                    popoverZIndex={1100}
                    disableShadow={true}
                    isTalking={isRobotTalking}
                  />
                </div>
                
                {/* 閉嘴按鈕 - 只在跑馬燈進行時顯示 */}
                {isNewsRevealing && (
                  <Button
                    size="small"
                    type="primary"
                    danger
                    onClick={skipMarqueeEffect}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    閉嘴
                  </Button>
                )}
              </div>
              
              {/* 新聞內容 */}
              <div 
                ref={newsScrollRef}
                onScroll={(e) => {
                  // 如果正在自動滾動，忽略這次事件
                  if (isAutoScrollingRef.current) {
                    return;
                  }
                  
                  const element = e.currentTarget;
                  const currentScrollTop = element.scrollTop;
                  const maxScrollTop = element.scrollHeight - element.clientHeight;
                  
                  // 只有在用戶主動滾動時才處理
                  if (currentScrollTop < lastScrollTopRef.current && currentScrollTop < maxScrollTop - 10) {
                    // 用戶向上滾動了，停止自動滾動
                    setUserScrolledUp(true);
                  } else if (currentScrollTop >= maxScrollTop - 5) {
                    // 用戶滾動到接近底部，恢復自動滾動
                    setUserScrolledUp(false);
                  }
                  
                  lastScrollTopRef.current = currentScrollTop;
                }}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '12px',
                  border: '2px solid #ffcccb',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#333',
                  minHeight: '120px',
                  maxHeight: '200px',
                  overflowY: 'auto', // 恢復滾動條
                  position: 'relative'
                }}
              >
                <div 
                  className="news-content-container"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: newsContent || '準備播報今日市集新聞...'
                  }}
                />
                
                {/* 新聞播報專用的 CSS 樣式 */}
                <style>
                  {`
                    /* 滾動容器 */
                    .news-content-container {
                      animation: containerFadeIn 0.5s ease-out;
                    }
                    
                    @keyframes containerFadeIn {
                      from {
                        opacity: 0.8;
                      }
                      to {
                        opacity: 1;
                      }
                    }
                    
                    /* 新出現的行 - 簡單淡入 */
                    .news-line-new {
                      margin-bottom: 6px;
                      padding: 2px 0;
                      line-height: 1.6;
                      opacity: 0;
                      animation: newsLineFadeIn 0.5s ease-out forwards;
                    }
                    
                    /* 已顯示的行 */
                    .news-line-shown {
                      margin-bottom: 6px;
                      padding: 2px 0;
                      line-height: 1.6;
                      opacity: 1;
                    }
                    
                    @keyframes newsLineFadeIn {
                      from {
                        opacity: 0;
                      }
                      to {
                        opacity: 1;
                      }
                    }
                    
                    /* 只美化新聞 Modal 內的滾動條 */
                    .news-content-container::-webkit-scrollbar {
                      width: 8px;
                    }
                    
                    .news-content-container::-webkit-scrollbar-track {
                      background: rgba(255, 204, 203, 0.2);
                      border-radius: 4px;
                    }
                    
                    .news-content-container::-webkit-scrollbar-thumb {
                      background: rgba(255, 154, 158, 0.6);
                      border-radius: 4px;
                    }
                    
                    .news-content-container::-webkit-scrollbar-thumb:hover {
                      background: rgba(255, 154, 158, 0.8);
                    }
                  `}
                </style>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default ProductList;

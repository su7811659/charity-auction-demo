import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Switch, message, Typography, Space, Divider, Alert, InputNumber } from 'antd';
import { SaveOutlined, ReloadOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../utils/axiosInstance';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 初始化 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

interface SystemConfig {
  id?: number;
  upload_start_date: string | null;
  upload_end_date: string | null;
  upload_enabled: boolean;
  summary_visible: boolean;
  summary_show_start_date: string | null;
  summary_show_end_date: string | null;
  ai_summary_content: string | null;
  ai_summary_last_generated: string | null;
  online_deal_enabled?: boolean;
  online_deal_available?: boolean;
  online_deal_begin_date?: string | null;
  online_deal_end_date?: string | null;
  max_concurrent_deals_per_user?: number;
  created_at?: string;
  updated_at?: string;
}

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  color: string;
  milestone_type: string;
}

interface SystemConfigUpdate {
  upload_start_date?: string | null;
  upload_end_date?: string | null;
  upload_enabled?: boolean;
  summary_visible?: boolean;
  summary_show_start_date?: string | null;
  summary_show_end_date?: string | null;
  online_deal_enabled?: boolean;
  online_deal_available?: boolean;
  online_deal_begin_date?: string | null;
  online_deal_end_date?: string | null;
  max_concurrent_deals_per_user?: number;
}

const SystemConfigPage: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [regeneratingTimeline, setRegeneratingTimeline] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  
  // 表單狀態
  const [uploadStartDate, setUploadStartDate] = useState('');
  const [uploadEndDate, setUploadEndDate] = useState('');
  const [uploadEnabled, setUploadEnabled] = useState(true);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryShowStartDate, setSummaryShowStartDate] = useState('');
  const [summaryShowEndDate, setSummaryShowEndDate] = useState('');
  
  // 線上交易表單狀態
  const [onlineDealEnabled, setOnlineDealEnabled] = useState(false);
  const [onlineDealAvailable, setOnlineDealAvailable] = useState(false);
  const [onlineDealBeginDate, setOnlineDealBeginDate] = useState('');
  const [onlineDealEndDate, setOnlineDealEndDate] = useState('');
  const [maxConcurrentDeals, setMaxConcurrentDeals] = useState(2);

  useEffect(() => {
    loadConfig();
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    try {
      const response = await axiosInstance.get('/api/timeline/events');
      if (response.data?.events) {
        setTimelineData(response.data.events);
      }
    } catch (error) {
      console.error('載入時間軸數據失敗:', error);
      // 不顯示錯誤訊息，因為這不是關鍵功能
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'admin-token': token,
      'Content-Type': 'application/json',
    };
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/system/config', {
        headers: getAuthHeaders()
      });
      const currentConfig = response.data;
      setConfig(currentConfig);
      
      // 設定表單值
      setUploadStartDate(currentConfig.upload_start_date || '');
      setUploadEndDate(currentConfig.upload_end_date || '');
      setUploadEnabled(currentConfig.upload_enabled);
      setSummaryVisible(currentConfig.summary_visible);
      setSummaryShowStartDate(currentConfig.summary_show_start_date || '');
      setSummaryShowEndDate(currentConfig.summary_show_end_date || '');
      
      // 設定線上議價表單值
      setOnlineDealEnabled(currentConfig.online_deal_enabled || false);
      setOnlineDealAvailable(currentConfig.online_deal_available || false);
      setOnlineDealBeginDate(currentConfig.online_deal_begin_date || '');
      setOnlineDealEndDate(currentConfig.online_deal_end_date || '');
      setMaxConcurrentDeals(currentConfig.max_concurrent_deals_per_user || 5);
    } catch (error) {
      console.error('載入配置失敗:', error);
      message.error('載入系統配置失敗');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const updateData: SystemConfigUpdate = {
        upload_start_date: uploadStartDate || null,
        upload_end_date: uploadEndDate || null,
        upload_enabled: uploadEnabled,
        summary_visible: summaryVisible,
        summary_show_start_date: summaryShowStartDate || null,
        summary_show_end_date: summaryShowEndDate || null,
        online_deal_enabled: onlineDealEnabled,
        online_deal_available: onlineDealAvailable,
        online_deal_begin_date: onlineDealBeginDate || null,
        online_deal_end_date: onlineDealEndDate || null,
        max_concurrent_deals_per_user: maxConcurrentDeals,
      };

      const response = await axiosInstance.put('/api/system/config', updateData, {
        headers: getAuthHeaders()
      });
      setConfig(response.data);
      message.success('系統配置已成功更新！');
    } catch (error) {
      console.error('保存配置失敗:', error);
      message.error('保存系統配置失敗');
    } finally {
      setSaving(false);
    }
  };

  const regenerateSummary = async () => {
    try {
      setRegenerating(true);
      // 使用管理員專用的 AI 總結生成 API，不檢查可見性
      await axiosInstance.post('/api/ai-summary/admin/generate', {}, {
        headers: getAuthHeaders()
      });
      message.success('AI 總結已重新生成！');
      await loadConfig();
    } catch (error) {
      console.error('重新生成總結失敗:', error);
      message.error('重新生成 AI 總結失敗');
    } finally {
      setRegenerating(false);
    }
  };

  const clearSummary = async () => {
    console.log('clearSummary 函數被調用');
    setClearing(true);
    try {
      await axiosInstance.delete('/api/ai-summary/admin/clear', {
        headers: getAuthHeaders()
      });
      message.success('AI總結已清除');
      console.log('清除成功');
      // 重新載入配置以更新UI
      await loadConfig();
    } catch (error) {
      console.error('清除AI總結失敗:', error);
      message.error('清除AI總結失敗');
    } finally {
      console.log('清除操作完成，設置 clearing 為 false');
      setClearing(false);
    }
  };

  const regenerateTimeline = async () => {
    try {
      setRegeneratingTimeline(true);
      // 重新載入時間軸數據（時間軸是基於資料庫動態生成的）
      await loadTimelineData();
      message.success('時間軸數據已刷新！');
    } catch (error) {
      console.error('刷新時間軸失敗:', error);
      message.error('刷新時間軸數據失敗');
    } finally {
      setRegeneratingTimeline(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '未設定';
    return dayjs.utc(dateString).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
  };

  const isUploadTimeValid = () => {
    if (!uploadStartDate || !uploadEndDate) return true;
    return new Date(uploadStartDate) <= new Date(uploadEndDate);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>載入中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        系統配置管理
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        管理商品上傳時間和總結頁面設定
      </Text>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* 商品上傳時間設定 */}
        <Card title="商品上傳控制" style={{ height: 'fit-content' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>啟用商品上傳：</Text>
                <Switch
                  checked={uploadEnabled}
                  onChange={setUploadEnabled}
                />
              </Space>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                關閉後用戶將無法上傳任何商品
              </Text>
            </div>

            <Divider />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                上傳開始時間：
              </Text>
              <Input
                type="datetime-local"
                value={uploadStartDate}
                onChange={(e) => setUploadStartDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                上傳結束時間：
              </Text>
              <Input
                type="datetime-local"
                value={uploadEndDate}
                onChange={(e) => setUploadEndDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {!isUploadTimeValid() && (
              <Alert
                message="結束時間必須晚於開始時間"
                type="warning"
                showIcon
              />
            )}

            <div>
              <Text strong>目前狀態：</Text>
              {config?.upload_start_date && config?.upload_end_date ? (
                <Text style={{ marginLeft: 8 }}>
                  {formatDateTime(config.upload_start_date)} 至 {formatDateTime(config.upload_end_date)}
                </Text>
              ) : (
                <Text style={{ marginLeft: 8, color: '#52c41a' }}>無時間限制（隨時可上傳）</Text>
              )}
            </div>
          </Space>
        </Card>

        {/* 總結頁面設定 */}
        <Card title="總結頁面控制" style={{ height: 'fit-content' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>總結頁面可見：</Text>
                <Switch
                  checked={summaryVisible}
                  onChange={setSummaryVisible}
                />
              </Space>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                開啟時用戶可以查看 AI 總結
              </Text>
            </div>

            <Divider />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                總結顯示開始時間：
              </Text>
              <Input
                type="datetime-local"
                value={summaryShowStartDate}
                onChange={(e) => setSummaryShowStartDate(e.target.value)}
                style={{ width: '100%' }}
                disabled={!summaryVisible}
              />
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                總結顯示結束時間：
              </Text>
              <Input
                type="datetime-local"
                value={summaryShowEndDate}
                onChange={(e) => setSummaryShowEndDate(e.target.value)}
                style={{ width: '100%' }}
                disabled={!summaryVisible}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <Button 
                icon={<ReloadOutlined />}
                onClick={regenerateSummary}
                disabled={regenerating || clearing}
                block
                type="primary"
                ghost
              >
                {regenerating ? '重新生成中...' : '手動重新生成 AI 總結'}
              </Button>

              <Button 
                icon={<DeleteOutlined />}
                onClick={clearSummary}
                disabled={clearing || regenerating}
                block
                danger
                ghost
              >
                {clearing ? '清除中...' : '清除 AI 總結'}
              </Button>
            </div>

            <Button 
              icon={<ReloadOutlined />}
              onClick={regenerateTimeline}
              disabled={regeneratingTimeline}
              block
              type="default"
              ghost
              style={{ marginTop: '8px' }}
            >
              {regeneratingTimeline ? '重新生成中...' : '重新生成時間軸數據'}
            </Button>
            
            {!summaryVisible && (
              <Text type="secondary" style={{ fontSize: 12 }}>請先開啟總結頁面可見性</Text>
            )}

            <div>
              <Text strong>AI 總結最後更新：</Text>
              <Text style={{ marginLeft: 8 }}>
                {config?.ai_summary_last_generated ? 
                  formatDateTime(config.ai_summary_last_generated) : 
                  '尚未生成'
                }
              </Text>
            </div>
          </Space>
        </Card>

        {/* 線上議價設定 */}
        <Card title="線上議價控制" style={{ height: 'fit-content' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>🔧 系統功能啟用：</Text>
                <Switch
                  checked={onlineDealEnabled}
                  onChange={setOnlineDealEnabled}
                />
              </Space>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                主開關：控制整個線上議價模組是否啟用（關閉後所有相關功能都會停用）
              </Text>
            </div>

            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>📝 用戶申請開放：</Text>
                <Switch
                  checked={onlineDealAvailable}
                  onChange={setOnlineDealAvailable}
                  disabled={!onlineDealEnabled}
                />
              </Space>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                業務開關：在系統啟用下，控制用戶是否可以提出新的議價申請（可臨時關閉申請但不影響現有議價）
              </Text>
            </div>

            <Divider />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                議價開放開始時間：
              </Text>
              <Input
                type="datetime-local"
                value={onlineDealBeginDate}
                onChange={(e) => setOnlineDealBeginDate(e.target.value)}
                style={{ width: '100%' }}
                disabled={!onlineDealEnabled}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                設定用戶可以開始提出議價申請的時間
              </Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                議價開放結束時間：
              </Text>
              <Input
                type="datetime-local"
                value={onlineDealEndDate}
                onChange={(e) => setOnlineDealEndDate(e.target.value)}
                style={{ width: '100%' }}
                disabled={!onlineDealEnabled}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                設定用戶議價申請的截止時間
              </Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                每人同時議價上限：
              </Text>
              <InputNumber
                min={1}
                max={50}
                value={maxConcurrentDeals}
                onChange={(value) => setMaxConcurrentDeals(value || 5)}
                style={{ width: '100%' }}
                disabled={!onlineDealEnabled}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                限制每個用戶同時進行的議價申請數量
              </Text>
            </div>

            {/* 功能狀態檢查 */}
            <Divider />
            
            <div style={{ 
              backgroundColor: '#f0f2f5', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #d9d9d9'
            }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                🔍 當前功能狀態檢查：
              </Text>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Text style={{ fontSize: 12 }}>
                    系統功能啟用：{onlineDealEnabled ? '✅ 已啟用' : '❌ 未啟用'}
                  </Text>
                </div>
                <div>
                  <Text style={{ fontSize: 12 }}>
                    用戶申請開放：{onlineDealAvailable ? '✅ 已開放' : '❌ 已關閉'}
                  </Text>
                </div>
                <div>
                  <Text style={{ fontSize: 12 }}>
                    時間區間設定：
                    {onlineDealBeginDate && onlineDealEndDate ? (
                      (() => {
                        const now = new Date();
                        const start = new Date(onlineDealBeginDate);
                        const end = new Date(onlineDealEndDate);
                        const inTimeRange = now >= start && now <= end;
                        return inTimeRange ? '✅ 在開放時間內' : '❌ 不在開放時間內';
                      })()
                    ) : '⚠️ 未設定時間區間'}
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text strong style={{ 
                    fontSize: 13,
                    color: (() => {
                      if (!onlineDealEnabled) return '#ff4d4f';
                      if (!onlineDealAvailable) return '#faad14';
                      if (!onlineDealBeginDate || !onlineDealEndDate) return '#faad14';
                      const now = new Date();
                      const start = new Date(onlineDealBeginDate);
                      const end = new Date(onlineDealEndDate);
                      const inTimeRange = now >= start && now <= end;
                      return inTimeRange ? '#52c41a' : '#faad14';
                    })()
                  }}>
                    最終狀態：
                    {(() => {
                      if (!onlineDealEnabled) return '🔒 功能完全停用';
                      if (!onlineDealAvailable) return '⏸️ 暫停新申請';
                      if (!onlineDealBeginDate || !onlineDealEndDate) return '⚠️ 需設定時間';
                      const now = new Date();
                      const start = new Date(onlineDealBeginDate);
                      const end = new Date(onlineDealEndDate);
                      const inTimeRange = now >= start && now <= end;
                      return inTimeRange ? '🚀 完全可用' : '📅 等待開放時間';
                    })()}
                  </Text>
                </div>
              </Space>
            </div>

            {onlineDealEnabled && onlineDealAvailable && (
              <Alert
                message={(() => {
                  if (!onlineDealBeginDate || !onlineDealEndDate) {
                    return "⚠️ 需要設定開放時間";
                  }
                  const now = new Date();
                  const start = new Date(onlineDealBeginDate);
                  const end = new Date(onlineDealEndDate);
                  const inTimeRange = now >= start && now <= end;
                  return inTimeRange ? "🚀 線上議價完全可用" : "📅 等待開放時間";
                })()}
                description={(() => {
                  if (!onlineDealBeginDate || !onlineDealEndDate) {
                    return "系統已啟用且開放申請，但需要設定開放的時間區間";
                  }
                  const now = new Date();
                  const start = new Date(onlineDealBeginDate);
                  const end = new Date(onlineDealEndDate);
                  const inTimeRange = now >= start && now <= end;
                  return inTimeRange 
                    ? "所有條件都滿足，用戶可以正常提出議價申請" 
                    : `開放時間：${dayjs.utc(onlineDealBeginDate).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm')} ~ ${dayjs.utc(onlineDealEndDate).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm')}`;
                })()}
                type={(() => {
                  if (!onlineDealBeginDate || !onlineDealEndDate) return "warning";
                  const now = new Date();
                  const start = new Date(onlineDealBeginDate);
                  const end = new Date(onlineDealEndDate);
                  const inTimeRange = now >= start && now <= end;
                  return inTimeRange ? "success" : "info";
                })()}
                showIcon
              />
            )}

            {onlineDealEnabled && !onlineDealAvailable && (
              <Alert
                message="⚠️ 暫停接受新申請"
                description="系統功能正常，但暫時不接受新的議價申請（現有議價仍可繼續處理）"
                type="warning"
                showIcon
              />
            )}

            {!onlineDealEnabled && (
              <Alert
                message="🔒 線上議價功能已停用"
                description="整個線上議價模組已關閉，用戶無法看到相關功能"
                type="info"
                showIcon
              />
            )}
          </Space>
        </Card>
      </div>

      {/* AI 總結預覽 */}
      {config?.ai_summary_content && (
        <Card title="AI 總結預覽" style={{ marginTop: 24 }}>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '8px', 
            maxHeight: '240px', 
            overflowY: 'auto' 
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '14px', 
              margin: 0,
              fontFamily: 'inherit'
            }}>
              {config.ai_summary_content}
            </pre>
          </div>
        </Card>
      )}

      {/* 時間軸預覽 */}
      {timelineData.length > 0 && (
        <Card title="時間軸數據預覽" style={{ marginTop: 24 }}>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '8px', 
            maxHeight: '400px', 
            overflowY: 'auto' 
          }}>
            {timelineData
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event, index) => (
                <div key={index} style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px',
                  borderLeft: `4px solid ${event.color}`
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <Text strong style={{ fontSize: '14px' }}>{event.title}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{event.date}</Text>
                  </div>
                  <Text style={{ fontSize: '13px', color: '#666' }}>{event.description}</Text>
                  <div style={{ marginTop: '6px' }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      類型: {event.milestone_type} | 顏色: {event.color}
                    </Text>
                  </div>
                </div>
              ))
            }
          </div>
        </Card>
      )}

      {/* 保存按鈕 */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button 
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveConfig}
          disabled={saving || !isUploadTimeValid()}
          size="large"
        >
          {saving ? '保存中...' : '保存設定'}
        </Button>
      </div>
    </div>
  );
};

export default SystemConfigPage;

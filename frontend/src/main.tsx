import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux';
import { store } from './store/store';
import './index.css'
import { App as AntdApp } from 'antd';
import './i18n'; // 初始化 i18next（語系切換）
import App from './App.tsx'

const isStrictMode = false; // 暫時禁用 StrictMode 來除錯通知系統

createRoot(document.getElementById('root')!).render(
  isStrictMode ? (
    <StrictMode>
      <Provider store={store}>
      <AntdApp>
        <App />
      </AntdApp>  
      </Provider>
    </StrictMode>
  ) : (
    <Provider store={store}>
      <AntdApp>
        <App />
      </AntdApp> 
    </Provider>
  )
)

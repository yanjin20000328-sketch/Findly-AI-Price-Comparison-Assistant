import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Archive, ChevronLeft, ChevronRight, Heart, Menu, MessageCircle, Settings, User, X } from 'lucide-react';
import { useAppStore } from './store';
import LandingPage from './pages/LandingPage';
import MainLayout from './pages/MainLayout';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PreviewLoadingPage from './pages/PreviewLoadingPage';
import ResultsPage from './pages/ResultsPage';
import AIComparisonPage from './pages/AIComparisonPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { BrandLockup } from './components/Brand';

const sidebarItems = [
  { label: '个人档案', path: '/main/profile', icon: User },
  { label: '收藏', path: '/main/collection', icon: Heart },
  { label: '设置', path: '/main/settings', icon: Settings },
];

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const hasCompletedLanding = useAppStore(state => state.hasCompletedLanding);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { botConversationHistory } = useAppStore();
  const historyItems = botConversationHistory;
  const showMainChrome = location.pathname.startsWith('/main');
  const showSidebarButton = location.pathname === '/main/home';

  return (
      <div className="demo-stage">
        <div className="iphone-14-pro-frame">
          <div className="iphone-14-pro-screen">
            <div className="iphone-top-mask" />
            <div className="iphone-dynamic-island" />
            {showMainChrome && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-[120] h-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+82px)] bg-gradient-to-b from-[#F7FBF8] via-[#F7FBF8]/96 to-[#F7FBF8]/88 backdrop-blur-md" />
                <div className="absolute left-3.5 right-3.5 top-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+18px)] z-[130] flex h-12 items-center gap-3">
                  {showSidebarButton && (
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#DDEFE4] shadow-[0_8px_18px_rgba(23,23,23,0.08)] flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      aria-label="打开侧边栏"
                    >
                      <Menu size={19} strokeWidth={1.8} className="text-[#171717]" />
                    </button>
                  )}
                  {!showSidebarButton && (
                    <button
                      onClick={() => navigate('/main/home')}
                      className="w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#DDEFE4] shadow-[0_8px_18px_rgba(23,23,23,0.08)] flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      aria-label="返回 Homepage"
                    >
                      <ChevronLeft size={20} strokeWidth={2} className="text-[#171717]" />
                    </button>
                  )}
                  <BrandLockup compact />
                </div>
              </>
            )}
            <Routes>
              <Route path="/" element={hasCompletedLanding ? <Navigate to="/main" /> : <LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              
              <Route path="/main" element={<MainLayout />}>
                <Route index element={<Navigate to="/main/home" />} />
                <Route path="home" element={<HomePage />} />
                <Route path="collection" element={<CollectionPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              
              <Route path="/preview" element={<PreviewLoadingPage />} />
              <Route path="/loading" element={<PreviewLoadingPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/compare" element={<AIComparisonPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
            </Routes>
            {isSidebarOpen && (
              <div className="absolute inset-0 z-[160] overflow-hidden rounded-[44px]">
                <button
                  className="absolute inset-0 rounded-[44px] bg-[#171717]/18 backdrop-blur-[2px]"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="关闭侧边栏"
                />
                <aside className="absolute left-0 top-0 bottom-0 w-[78%] max-w-[300px] bg-white/94 backdrop-blur-2xl border-r border-[#DDEFE4] shadow-[20px_0_46px_rgba(23,23,23,0.16)] rounded-l-[44px] rounded-r-[34px] px-5 pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+18px)] pb-6 overflow-y-auto hide-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => {
                        navigate('/main/home');
                        setIsSidebarOpen(false);
                      }}
                      className="text-left active:scale-[0.99] transition-transform"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#4BAA72] font-semibold">Findly AI</p>
                      <h2 className="text-xl font-bold text-[#171717] mt-1">我的空间</h2>
                    </button>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="w-9 h-9 rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="关闭"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-7">
                    {sidebarItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setIsSidebarOpen(false);
                          }}
                          className="w-full h-12 rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] px-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                        >
                          <Icon size={18} className="text-[#4BAA72]" />
                          <span className="flex-1 text-sm font-semibold text-[#171717]">{item.label}</span>
                          <ChevronRight size={16} className="text-gray-400" />
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle size={16} className="text-[#4BAA72]" />
                      <p className="text-sm font-semibold text-[#171717]">历史对话</p>
                    </div>

                    {historyItems.length > 0 ? (
                      <div className="space-y-2">
                        {historyItems.map((item) => (
                          <button
                            key={`${item.id}-${item.question}`}
                            onClick={() => {
                              navigate('/compare');
                              setIsSidebarOpen(false);
                            }}
                            className="w-full rounded-2xl bg-white border border-[#DDEFE4] p-3 text-left active:scale-[0.99] transition-transform"
                          >
                            <p className="text-sm font-semibold text-[#171717] line-clamp-1">{item.question}</p>
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-500 line-clamp-2">{item.answer || '继续查看 Findly 的回复'}</p>
                            <p className="mt-2 text-[10px] font-bold text-[#4BAA72]">{item.mode === 'discussion' ? '讨论模式' : '普通模式'}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#F7FBF8] border border-dashed border-[#DDEFE4] p-4 text-center">
                        <Archive size={18} className="text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">暂无历史对话</p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default App;

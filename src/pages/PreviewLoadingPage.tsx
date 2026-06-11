import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { FindlyMark } from '../components/Brand';
import findlyCutoutLogo from '../assets/agents/findly-product-logo-cutout.png';

const readJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: '接口返回格式异常，请确认本地服务已启动。' };
  }
};

export default function PreviewLoadingPage() {
  const navigate = useNavigate();
  const { currentImage, setCurrentSearchQuery, setCurrentVisualProfile } = useAppStore();
  const [isRecognizing, setIsRecognizing] = useState(true);
  const [recognitionError, setRecognitionError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [points, setPoints] = useState<any[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const selectedPoint = points.find(p => p.id === selectedPointId);
  
  const fetchRef = useRef(false);

  const fallbackTags = [
    ['主体', '颜色'],
    ['材质', '风格'],
    ['品牌', '型号'],
    ['类目', '纹理'],
  ];
  const activeLoadingStep = loadingStep % fallbackTags.length;

  const tagMotionPaths = [
    { x: [-78, -92, -70, -54, -78], y: [-108, -88, -66, -88, -108] },
    { x: [48, 70, 82, 60, 48], y: [-104, -112, -86, -66, -104] },
    { x: [-88, -74, -58, -76, -88], y: [2, -20, 2, 22, 2] },
    { x: [62, 84, 74, 52, 62], y: [36, 20, 62, 80, 36] },
    { x: [-50, -26, -8, -32, -50], y: [98, 78, 92, 112, 98] },
    { x: [8, 30, 46, 22, 8], y: [-18, -38, -14, 8, -18] },
  ];

  const getProfileTags = (point: any) => {
    const profile = point?.profile || {};
    const candidates = [
      profile.brand,
      profile.model,
      profile.category,
      ...(Array.isArray(profile.attributes) ? profile.attributes : []),
      point?.label,
      profile.product_name,
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    return [...new Set(candidates)].slice(0, 5);
  };

  const visibleTags = selectedPoint
    ? getProfileTags(selectedPoint).slice(0, Math.min(5, activeLoadingStep + 2))
    : fallbackTags.slice(0, activeLoadingStep + 1).flat().slice(0, 5);

  useEffect(() => {
    if (!isRecognizing && !isLoading) return;
    const interval = setInterval(() => {
      setLoadingStep((step) => step + 1);
    }, 1450);

    return () => clearInterval(interval);
  }, [isRecognizing, isLoading]);

  const proceedWithPoint = async (selected: any) => {
    if (!selected) return;

    setIsLoading(true);
    setIsRecognizing(false);
    setRecognitionError('');
    
    try {
      const profile = selected.profile || null;
      const query = profile?.product_name || selected.label;
      setCurrentSearchQuery(query);
      setCurrentVisualProfile(profile);
      navigate('/results', { replace: true });
    } catch (error) {
      console.error(error);
      setRecognitionError("网络请求失败，请检查配置。");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchImageRecognition = async () => {
      if (!currentImage || fetchRef.current) return;
      fetchRef.current = true;
      
      try {
        setRecognitionError('');
        setIsLoading(false);
        setIsRecognizing(true);

        const response = await fetch('/api/recognize-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: currentImage,
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(data?.details || data?.error || '识别服务暂时不可用，请确认本地服务已启动。');
        }

        if (Array.isArray(data.points) && data.points.length > 0) {
          const firstPoint = data.points[0];
          setPoints(data.points);
          setSelectedPointId(firstPoint.id);
          window.setTimeout(() => proceedWithPoint(firstPoint), 650);
        } else {
          setRecognitionError('没有在图片中识别到可比价的商品，请换一张更清晰的图片');
          setIsRecognizing(false);
        }
      } catch (error) {
        console.error("图片识别失败:", error);
        setRecognitionError(error instanceof Error ? error.message : '图片识别失败');
        setIsRecognizing(false);
      }
    };
    fetchImageRecognition();
  }, [currentImage]);

  return (
    <div className="min-h-full hide-scrollbar flex flex-col findly-surface relative overflow-hidden">
      <div className="mt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+18px)] mx-4 h-12 px-3 flex items-center bg-white/84 backdrop-blur-md shrink-0 border border-[#DDEFE4] rounded-3xl shadow-[0_8px_20px_rgba(23,23,23,0.06)] relative overflow-hidden">
        {!recognitionError && (
          <>
            <motion.div
              className="absolute inset-x-0 -top-12 h-16 bg-gradient-to-b from-transparent via-[#9BE7B7]/34 to-transparent"
              animate={{ y: [0, 96] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-[#F7FBF8]/10 via-[#E9F8EF]/42 to-[#F7FBF8]/10"
              animate={{ opacity: [0.26, 0.72, 0.26] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}
        <button onClick={() => navigate(-1)} className="relative z-10 w-9 h-9 -ml-1 flex items-center justify-center text-gray-800 rounded-2xl active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="relative z-10 flex-1 pr-8 flex items-center justify-center gap-2 min-w-0">
          {!recognitionError && <FindlyMark className="w-7 h-7" />}
          <h1 className="text-base font-semibold leading-none text-[#171717] truncate">
            {recognitionError ? '识别遇到问题' : 'Findly 正在识别商品'}
          </h1>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-4 pb-4 flex flex-col items-center justify-center">
        <div className="relative w-full max-h-[450px] aspect-[4/5] rounded-[30px] overflow-hidden bg-gray-100 shadow-[0_24px_60px_rgba(23,23,23,0.14)] border-[6px] border-white">
          {currentImage ? (
            <img src={currentImage} alt="preview" className={`w-full h-full object-cover transition-opacity duration-500 ${recognitionError ? 'opacity-95' : 'opacity-85'}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50">
              暂无图片
            </div>
          )}

          {!recognitionError && (
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] pointer-events-none">
              <motion.div
                className="absolute inset-8 rounded-[38px] border border-white/40 shadow-[0_0_42px_rgba(255,255,255,0.26)]"
                animate={{ opacity: [0.32, 0.58, 0.32], scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              {visibleTags.map((tag, index) => (
                <motion.span
                  key={`${tag}-${index}`}
                  className="absolute left-1/2 top-1/2 rounded-full bg-white/92 px-3.5 py-1.5 text-[12px] font-semibold text-[#171717] shadow-[0_8px_24px_rgba(23,23,23,0.16),0_0_22px_rgba(255,255,255,0.82)] border border-white/90 backdrop-blur-md whitespace-nowrap"
                  initial={{ opacity: 0.48, scale: 0.9 }}
                  animate={{
                    x: tagMotionPaths[index % tagMotionPaths.length].x,
                    y: tagMotionPaths[index % tagMotionPaths.length].y,
                    opacity: [0.68, 1, 0.84, 0.98, 0.72],
                    scale: [0.92, 1, 0.98, 1.04, 0.94],
                  }}
                  transition={{
                    x: { duration: 6.2 + index * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.34 },
                    y: { duration: 6.2 + index * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.34 },
                    opacity: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.38 },
                    scale: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.38 },
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-2 pb-1 shrink-0">
        {!recognitionError ? (
          <div className="relative w-full h-[142px] flex flex-col items-center justify-center overflow-hidden">
            <motion.div
              className="relative mb-3"
              animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                className="absolute -inset-5 rounded-full bg-[#9BE7B7]/12 blur-2xl"
                animate={{ opacity: [0.12, 0.26, 0.12], scale: [0.9, 1.16, 0.9] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src={findlyCutoutLogo}
                alt="Findly AI"
                className="relative z-10 h-[72px] w-[74px] object-contain drop-shadow-[0_12px_20px_rgba(75,170,114,0.10)]"
              />
            </motion.div>

            <div className="h-1.5 w-[184px] overflow-hidden rounded-full bg-[#E4E9E6]">
              <motion.div
                className="h-full w-[72px] rounded-full bg-[repeating-linear-gradient(135deg,#B8E986_0_10px,#4BAA72_10px_20px)]"
                animate={{ x: [-74, 188] }}
                transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        ) : recognitionError ? (
          <div className="w-full p-6 rounded-3xl flex flex-col items-center justify-center gap-4 bg-red-50">
            <p className="font-medium text-red-500 text-center">{recognitionError}</p>
            <button 
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-white text-red-500 rounded-full font-medium shadow-sm active:scale-95 transition-transform"
            >
              重新拍照
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useRef, useState, useEffect } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { useAppStore } from '../store';
import type { Product } from '../store';
import { AgentPill, agentById } from '../components/Brand';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentImage, favoriteProducts } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const watchScrollRef = useRef<HTMLDivElement>(null);
  const watchTrackRef = useRef<HTMLDivElement>(null);
  const watchCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const watchDragStateRef = useRef({
    isDragging: false,
    moved: false,
    startX: 0,
    startIndex: 0,
  });
  const watchDragRafRef = useRef<number | null>(null);
  const watchPendingOffsetRef = useRef(0);
  
  const [showCamera, setShowCamera] = useState(false);
  const [showSkipBubble, setShowSkipBubble] = useState(false);
  const [isWatchDragging, setIsWatchDragging] = useState(false);
  const [activeWatchIndex, setActiveWatchIndex] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!location.state?.skippedPreferences) return;

    setShowSkipBubble(true);
    window.history.replaceState({}, document.title);
    const timer = window.setTimeout(() => setShowSkipBubble(false), 2600);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  useEffect(() => {
    setActiveWatchIndex((index) => Math.min(index, Math.max(0, favoriteProducts.length - 1)));
  }, [favoriteProducts.length]);

  useEffect(() => {
    const track = watchTrackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${-activeWatchIndex * 100}%, 0, 0)`;
  }, [activeWatchIndex, favoriteProducts.length]);

  useEffect(() => () => {
    if (watchDragRafRef.current !== null) {
      window.cancelAnimationFrame(watchDragRafRef.current);
    }
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraInputRef.current?.click();
        setShowCamera(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      cameraInputRef.current?.click();
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCaptureClick = () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    setShowCamera(true);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Limit max dimension to 800px for API limits
      const MAX_DIMENSION = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality
        setCurrentImage(imageDataUrl);
        stopCamera();
        setShowCamera(false);
        navigate('/preview');
      }
    }
  };

  const compressFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIMENSION = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressedDataUrl = await compressFile(file);
      setCurrentImage(compressedDataUrl);
      navigate('/preview');
    }
  };

  const applyWatchDragTransform = (offset: number) => {
    const track = watchTrackRef.current;
    const activeCard = watchCardRefs.current[watchDragStateRef.current.startIndex];
    if (!track) return;

    track.style.transform = `translate3d(${-watchDragStateRef.current.startIndex * 100}%, 0, 0) translate3d(${offset}px, 0, 0)`;
    if (!activeCard) return;

    const rotation = offset / 22;
    const lift = Math.min(9, Math.abs(offset) / 9);
    const scale = 1 + Math.min(0.014, Math.abs(offset) / 5600);
    activeCard.style.transform = `translate3d(0, -${lift}px, 0) rotate(${rotation}deg) scale(${scale})`;
    activeCard.style.transformOrigin = rotation >= 0 ? '70% 120%' : '30% 120%';
  };

  const settleWatchCarousel = (index: number) => {
    const track = watchTrackRef.current;
    if (track) {
      track.style.transition = 'transform 760ms cubic-bezier(0.16, 1, 0.3, 1)';
      track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    }
    watchCardRefs.current.forEach((card) => {
      if (!card) return;
      card.style.transition = 'transform 460ms cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = '';
      card.style.transformOrigin = '';
    });
  };

  const handleWatchPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const track = watchTrackRef.current;
    const activeCard = watchCardRefs.current[activeWatchIndex];
    watchDragStateRef.current = {
      isDragging: true,
      moved: false,
      startX: event.clientX,
      startIndex: activeWatchIndex,
    };
    setIsWatchDragging(true);
    watchPendingOffsetRef.current = 0;
    if (watchDragRafRef.current !== null) {
      window.cancelAnimationFrame(watchDragRafRef.current);
      watchDragRafRef.current = null;
    }
    if (track) {
      track.style.transition = 'none';
    }
    if (activeCard) {
      activeCard.style.transition = 'transform 80ms linear';
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWatchPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = watchDragStateRef.current;
    const viewport = watchScrollRef.current;
    if (!viewport || !dragState.isDragging) return;

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 3) {
      dragState.moved = true;
      event.preventDefault();
    }
    const maxOffset = Math.max(80, viewport.clientWidth * 0.92);
    watchPendingOffsetRef.current = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    if (watchDragRafRef.current === null) {
      watchDragRafRef.current = window.requestAnimationFrame(() => {
        applyWatchDragTransform(watchPendingOffsetRef.current);
        watchDragRafRef.current = null;
      });
    }
  };

  const endWatchDrag = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = watchDragStateRef.current;
    const deltaX = event.clientX - dragState.startX;
    const flingThreshold = 54;
    const nextIndex = deltaX < -flingThreshold
      ? Math.min(dragState.startIndex + 1, favoriteProducts.length - 1)
      : deltaX > flingThreshold
        ? Math.max(dragState.startIndex - 1, 0)
        : dragState.startIndex;

    watchDragStateRef.current.isDragging = false;
    setIsWatchDragging(false);
    const boundedNextIndex = Math.min(Math.max(nextIndex, 0), favoriteProducts.length - 1);
    setActiveWatchIndex(boundedNextIndex);
    watchPendingOffsetRef.current = 0;
    if (watchDragRafRef.current !== null) {
      window.cancelAnimationFrame(watchDragRafRef.current);
      watchDragRafRef.current = null;
    }
    settleWatchCarousel(boundedNextIndex);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      watchDragStateRef.current.moved = false;
    }, 140);
  };

  const handleWatchProductClick = (product: Product) => {
    if (watchDragStateRef.current.moved) return;
    navigate(`/product/${product.id}`, { state: { product } });
  };

  const scrollToWatchProduct = (index: number) => {
    settleWatchCarousel(index);
    setActiveWatchIndex(index);
  };

  return (
    <div className="p-6 pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+20px)] min-h-full flex flex-col relative findly-surface">
      <div className="mb-4 pt-16">
        <h1 className="text-[26px] font-bold text-[#171717] tracking-tight leading-tight mb-2 whitespace-nowrap">拍照识别，帮你比价</h1>
        <p className="text-gray-600 text-[13px] leading-relaxed max-w-[240px]">随手拍一拍，看看哪家更划算</p>
      </div>

      {showSkipBubble && (
        <div className="absolute left-6 right-6 top-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+188px)] z-30 rounded-[28px] bg-white/54 backdrop-blur-2xl border border-white/80 shadow-[0_18px_42px_rgba(75,170,114,0.13),inset_0_1px_0_rgba(255,255,255,0.74)] px-4 py-3">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/72 via-[#E9F8EF]/28 to-white/38" />
          <div className="relative z-10">
            <p className="text-[13px] font-medium text-[#171717]">后续可以在设置中修改用户购物偏好哦～</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center relative pb-20">
        <button 
          onClick={handleCaptureClick}
          className="mt-5 w-36 h-36 rounded-[40px] flex items-center justify-center bg-white/60 backdrop-blur-xl border border-white/80 ring-1 ring-[#DDEFE4]/80 shadow-[0_18px_50px_rgba(75,170,114,0.16)] active:scale-95 transition-transform relative z-10"
        >
          <Camera size={50} strokeWidth={1.6} className="text-[#4BAA72]" />
        </button>
        <button 
          onClick={handleUpload}
          className="absolute bottom-10 right-2 w-10 h-10 bg-white/85 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-[0_8px_18px_rgba(23,23,23,0.08)] active:scale-95 transition-transform border border-[#DDEFE4]"
        >
          <ImageIcon size={17} strokeWidth={1.7} className="text-[#171717]" />
        </button>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={onFileChange} 
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={onFileChange}
        />
      </div>

      {favoriteProducts.length > 0 && (
        <div className="mt-auto mb-4">
          <div
            ref={watchScrollRef}
            onPointerDown={handleWatchPointerDown}
            onPointerMove={handleWatchPointerMove}
            onPointerUp={endWatchDrag}
            onPointerCancel={endWatchDrag}
            className={`overflow-hidden py-2 select-none touch-pan-x ${
              isWatchDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div
              ref={watchTrackRef}
              className={`flex will-change-transform ${isWatchDragging ? 'transition-none' : 'transition-transform duration-[760ms] ease-[cubic-bezier(0.16,1,0.3,1)]'}`}
              style={{
                transform: `translate3d(${-activeWatchIndex * 100}%, 0, 0)`,
              }}
            >
              {favoriteProducts.map((product, index) => {
                const priceDrop = product.originalPrice && product.originalPrice > product.price
                  ? Math.round(product.originalPrice - product.price)
                  : 0;
                return (
                  <div
                    key={product.id}
                    ref={(node) => {
                      watchCardRefs.current[index] = node;
                    }}
                    style={{
                      backfaceVisibility: 'hidden',
                      willChange: 'transform',
                    }}
                    className={`watch-price-card min-w-full rounded-3xl border border-[#DDEFE4] bg-white p-3 shadow-none transition-[transform,border-color,background-color] ${
                      isWatchDragging ? 'duration-75 ease-out' : 'duration-[760ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
                    } hover:-translate-y-1 hover:border-[#BFE7CF]`}
                  >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <AgentPill agent={agentById.watch} label="盯价哨兵" />
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        if (watchDragStateRef.current.moved) return;
                        navigate('/main/collection');
                      }}
                      className="text-[10px] font-medium text-[#3D8B5D] active:scale-95 transition-transform"
                    >
                      {favoriteProducts.length > 1 ? `查看全部 ${favoriteProducts.length}` : '收藏商品'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => handleWatchProductClick(product)}
                    className="grid w-full grid-cols-[40px_minmax(0,1fr)] gap-2 text-left active:scale-[0.99] transition-transform"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      className="row-span-2 h-10 w-10 rounded-xl object-cover bg-gray-50"
                    />
                    <div className="min-w-0 flex items-start justify-between gap-2">
                      <h4 className="text-[12px] font-medium text-gray-900 leading-snug line-clamp-2">{product.title}</h4>
                      <span className="h-8 px-3 bg-[#171717] text-white text-[11px] font-medium rounded-full whitespace-nowrap shrink-0 flex items-center">
                        查看
                      </span>
                    </div>
                    <p className="text-[12px] text-red-500 font-medium leading-tight">
                      {priceDrop > 0 ? `已降 ¥${priceDrop}` : '持续盯价中'}
                    </p>
                  </button>
                  </div>
                );
              })}
            </div>
          </div>
          {favoriteProducts.length > 1 && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              {favoriteProducts.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => scrollToWatchProduct(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    activeWatchIndex === index
                      ? 'w-4 bg-[#4BAA72] shadow-[0_3px_8px_rgba(75,170,114,0.26)]'
                      : 'w-1.5 bg-[#DDEFE4]'
                  }`}
                  aria-label={`查看第 ${index + 1} 个收藏商品`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* WebRTC Camera Overlay */}
      {showCamera && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 text-white absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+16px)]">
            <button onClick={() => setShowCamera(false)} className="p-2">
              <X size={28} />
            </button>
          </div>
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="flex-1 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent pb-16">
            <button 
              onClick={takePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

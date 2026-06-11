import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { AgentPill, agentById } from '../components/Brand';

export default function CollectionPage() {
  const navigate = useNavigate();
  const { favoriteProducts, toggleFavorite } = useAppStore();

  return (
    <div className="h-full flex flex-col findly-surface">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+78px)] pb-3 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#171717]">收藏</h1>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="findly-card rounded-[26px] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <AgentPill agent={agentById.watch} label="盯价哨兵" />
            <span className="shrink-0 rounded-full bg-white/70 px-3 py-2 text-[11px] font-bold text-[#2F7D52] border border-[#DDEFE4]">
              盯价中 {favoriteProducts.length} 件
            </span>
          </div>
        </div>
      </div>
      
      {favoriteProducts.length === 0 ? (
        <div className="flex-1 text-gray-400 text-center mt-24 flex flex-col items-center px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Heart size={24} className="text-gray-300" />
          </div>
          <p className="text-sm">暂无收藏商品</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24">
          <div className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((product) => {
              return (
                <div 
                  key={product.id} 
                  className="bg-white rounded-2xl p-3 flex flex-col shadow-[0_2px_10px_rgba(23,23,23,0.04)] border border-[#DDEFE4]/60 relative transition-colors"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(product);
                    }}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="取消收藏"
                  >
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </button>
                  <img src={product.image} alt={product.title} className="w-full aspect-square rounded-xl object-cover bg-gray-50 mb-2" />
                  <h4 className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug mb-1">{product.title}</h4>
                  <div className="mb-2 flex flex-wrap gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFF7E6] text-[#9A5A00] border border-[#FFE4A8]">持续盯价</span>
                  </div>
                  <div className="mt-auto pt-1">
                    <div className="flex items-baseline gap-0.5 mb-1">
                      <span className="text-[10px] font-bold text-red-500">¥</span>
                      <span className="text-sm font-bold text-red-500 leading-none">{product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-gray-400">
                      <span>{product.platform.split(' ')[0]}</span>
                      <span>{product.sales.replace('已售', '')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

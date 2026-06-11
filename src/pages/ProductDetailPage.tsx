import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Heart, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../store';
import type { Product } from '../store';
import { AgentPill, agentById } from '../components/Brand';
import { AgentCard } from '../components/AgentWidgets';

type PriceHistoryPoint = {
  date: string;
  label: string;
  price: number;
  event?: string;
};

type SavingStep = {
  label: string;
  amount: number;
  description: string;
  source: 'platform' | 'coupon' | 'subsidy' | 'gold' | 'payment' | 'shipping';
};

function PriceTrendChart({ history }: { history: PriceHistoryPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 320;
  const height = 136;
  const padding = { top: 16, right: 8, bottom: 22, left: 8 };
  const prices = history.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const range = Math.max(1, maxPrice - minPrice);
  const points = history.map((point, index) => {
    const x = padding.left + (index / Math.max(1, history.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((maxPrice - point.price) / range) * (height - padding.top - padding.bottom);
    return { ...point, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${padding.left},${height - padding.bottom} ${linePoints} ${width - padding.right},${height - padding.bottom}`;
  const change = currentPrice - firstPrice;
  const changeRate = firstPrice ? Math.round((change / firstPrice) * 1000) / 10 : 0;
  const eventPoints = points.filter((point) => point.event && point.event !== '当前价');
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];
  const tooltipWidth = 82;
  const tooltipX = hoveredPoint
    ? Math.min(width - tooltipWidth - 4, Math.max(4, hoveredPoint.x - tooltipWidth / 2))
    : 0;
  const tooltipY = hoveredPoint ? Math.max(3, hoveredPoint.y - 42) : 0;

  const updateHoveredPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
    const chartProgress = (viewBoxX - padding.left) / (width - padding.left - padding.right);
    const nextIndex = Math.round(chartProgress * (history.length - 1));
    setHoveredIndex(Math.max(0, Math.min(history.length - 1, nextIndex)));
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#DDEFE4] bg-[#F7FBF8] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold text-[#171717]">近 30 天价格走势</p>
          <p className="mt-0.5 text-[10px] text-gray-500">模拟价格每日波动，最后一天对齐当前价</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${change <= 0 ? 'bg-[#E8FAF4] text-[#3D8B5D]' : 'bg-[#FFF1F2] text-[#E64B63]'}`}>
          较月初 {change > 0 ? '+' : ''}{changeRate}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-[136px] w-full cursor-crosshair touch-none"
        role="img"
        aria-label="近30天价格趋势图"
        onPointerMove={updateHoveredPoint}
        onPointerDown={updateHoveredPoint}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="price-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#75D99C" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#75D99C" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + ratio * (height - padding.top - padding.bottom)}
            y2={padding.top + ratio * (height - padding.top - padding.bottom)}
            stroke="#DDEFE4"
            strokeDasharray="3 4"
          />
        ))}
        <polygon points={areaPoints} fill="url(#price-area)" />
        <polyline points={linePoints} fill="none" stroke="#3D8B5D" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {eventPoints.map((point) => (
          <circle key={`${point.date}-${point.event}`} cx={point.x} cy={point.y} r="3.5" fill="#FFB84D" stroke="white" strokeWidth="2" />
        ))}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#171717" stroke="white" strokeWidth="2" />
        {hoveredPoint && (
          <g className="pointer-events-none">
            <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={height - padding.bottom} stroke="#171717" strokeWidth="1" strokeDasharray="3 3" opacity="0.42" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="7" fill="#75D99C" opacity="0.22" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="3.5" fill="#171717" stroke="white" strokeWidth="2" />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="34" rx="7" fill="#171717" opacity="0.94" />
            <text x={tooltipX + 8} y={tooltipY + 13} fontSize="8.5" fill="#B8C4BD">{hoveredPoint.date}</text>
            <text x={tooltipX + 8} y={tooltipY + 27} fontSize="11" fontWeight="700" fill="white">¥{hoveredPoint.price.toLocaleString()}</text>
          </g>
        )}
        <text x={padding.left} y={height - 4} fontSize="9" fill="#8A948E">{history[0].label}</text>
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#8A948E">{history[Math.floor(history.length / 2)].label}</text>
        <text x={width - padding.right} y={height - 4} textAnchor="end" fontSize="9" fill="#8A948E">{history[history.length - 1].label}</text>
      </svg>

      <div className="mt-1 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-gray-400">30 天最低</p>
          <p className="mt-0.5 font-bold text-[#3D8B5D]">¥{minPrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400">30 天最高</p>
          <p className="mt-0.5 font-bold text-[#171717]">¥{maxPrice.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400">当前价格</p>
          <p className="mt-0.5 font-bold text-red-500">¥{currentPrice.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function readCachedProducts(): Product[] {
  try {
    return JSON.parse(sessionStorage.getItem('searchProducts') || '[]');
  } catch {
    return [];
  }
}

function getRichMock(product: Product | undefined) {
  return (product as Product & { richMock?: any } | undefined)?.richMock;
}

function clampDiscount(amount: number, max: number) {
  return Math.max(0, Math.min(Math.round(amount), Math.max(0, Math.round(max))));
}

function buildSavingPlan(product: Product, originalPrice: number, shipping: number) {
  const richMock = getRichMock(product);
  const activities = Array.isArray(richMock?.activityInfo) ? richMock.activityInfo : [];
  const currentPrice = product.price || 0;
  const baseDiscount = Math.max(0, originalPrice - currentPrice);
  const categoryText = `${richMock?.category || ''} ${richMock?.subCategory || ''} ${product.title} ${product.specs}`;
  const steps: SavingStep[] = [];
  const usedLabels = new Set<string>();

  activities.forEach((activity: any) => {
    const label = String(activity.activity_name || activity.activity_type || '').trim();
    const amount = clampDiscount(Number(activity.discount_value) || 0, originalPrice * 0.45);
    if (!label || !amount || usedLabels.has(label)) return;
    usedLabels.add(label);
    steps.push({
      label,
      amount,
      description: String(activity.display_text || activity.threshold || activity.activity_description || '平台活动可叠加使用'),
      source: /券|618|满减/.test(label) ? 'coupon' : 'platform',
    });
  });

  if (/3C|数码|手机|平板|电脑|家电|相机|耳机|显示器/.test(categoryText)) {
    steps.push({
      label: '国补资格核验',
      amount: clampDiscount(currentPrice * 0.1, 500),
      description: '按 3C/数码类国补口径预估，需在平台下单页完成地区和实名资格校验',
      source: 'subsidy',
    });
  }

  if (!usedLabels.has('618 专属券')) {
    steps.push({
      label: '618 专属券',
      amount: clampDiscount(currentPrice >= 3000 ? 120 : currentPrice >= 1000 ? 60 : 30, currentPrice * 0.08),
      description: '活动会场领取，通常可与平台满减、店铺券叠加',
      source: 'coupon',
    });
  }

  steps.push({
    label: '购物金充值膨胀',
    amount: clampDiscount(currentPrice * 0.025, 180),
    description: '按“充购物金送膨胀金”预估，适合确定会在该平台/店铺下单时使用',
    source: 'gold',
  });

  steps.push({
    label: '支付立减 / 银行券',
    amount: clampDiscount(currentPrice >= 3000 ? 80 : currentPrice >= 1000 ? 40 : 15, currentPrice * 0.05),
    description: '结算页选择指定支付方式或银行卡，以下单页实时可用为准',
    source: 'payment',
  });

  if (shipping > 0) {
    steps.push({
      label: '运费券',
      amount: clampDiscount(shipping, shipping),
      description: '优先选择平台包邮券或店铺会员免邮',
      source: 'shipping',
    });
  }

  const topSteps = steps
    .filter((step) => step.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const activityTotal = topSteps.reduce((sum, step) => sum + step.amount, 0);
  const fallbackTotal = Math.max(baseDiscount, activityTotal);
  const finalPrice = Math.max(0, originalPrice + shipping - fallbackTotal);

  return {
    steps: topSteps,
    totalDiscount: fallbackTotal,
    finalPrice,
    baseDiscount,
    savedMoreThanCurrent: Math.max(0, currentPrice + shipping - finalPrice),
  };
}

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { searchProducts, aiReasoning, favoriteProducts, toggleFavorite } = useAppStore();
  const routedProduct = (location.state as { product?: Product } | null)?.product;
  const products = useMemo(() => {
    const productMap = new Map<string, Product>();
    [...readCachedProducts(), ...searchProducts, ...favoriteProducts, ...(routedProduct ? [routedProduct] : [])].forEach((item) => {
      productMap.set(item.id, item);
    });
    return Array.from(productMap.values());
  }, [favoriteProducts, routedProduct, searchProducts]);
  const product = products.find(item => item.id === id);
  
  const [agentData, setAgentData] = useState<any>(null);

  useEffect(() => {
    if (!product) return;
    setAgentData(null);
    fetch('/api/agent/product-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    })
      .then((res) => res.json())
      .then((data) => setAgentData(data))
      .catch(() => {
        setAgentData(null);
      });
  }, [product?.id]);

  const originalPrice = product?.originalPrice || product?.price || 0;
  const shipping = product?.shipping || 0;
  const isFavorite = product ? favoriteProducts.some((item) => item.id === product.id) : false;
  const comparisonCard = agentData?.comparison_card;
  const reputationCard = agentData?.reputation_card;
  const savingPlanCard = agentData?.saving_plan_card;
  const priceWatchCard = agentData?.price_watch_card;
  const reputationClusters = Array.isArray(reputationCard?.clusters) ? reputationCard.clusters : [];
  const promptPositiveClusters = Array.isArray(reputationCard?.positive_clusters) ? reputationCard.positive_clusters : [];
  const promptNegativeClusters = Array.isArray(reputationCard?.negative_clusters) ? reputationCard.negative_clusters : [];
  const priceHistory: PriceHistoryPoint[] = Array.isArray(product?.price_history) && product.price_history.length
    ? product.price_history
    : Array.isArray(agentData?.price_history)
      ? agentData.price_history
      : [];
  const localReviews = product?.review_comments || [];
  const localReviewCount = localReviews.length;
  const localPositiveRate = localReviewCount
    ? Math.round((localReviews.filter((review) => review.sentiment === 'positive').length / localReviewCount) * 100)
    : null;
  const localReviewClusters = useMemo(() => {
    const counts = localReviews.reduce<Record<string, { label: string; sentiment: 'positive' | 'negative'; count: number }>>((result, review) => {
      const key = `${review.sentiment}-${review.tag}`;
      result[key] ||= { label: review.tag, sentiment: review.sentiment, count: 0 };
      result[key].count += 1;
      return result;
    }, {});
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [localReviews]);
  const reputationPositiveClusters = promptPositiveClusters.length
    ? promptPositiveClusters.slice(0, 3)
    : reputationClusters.length
      ? reputationClusters.filter((cluster: any) => cluster.sentiment === 'positive').slice(0, 3)
      : localReviewClusters.filter((cluster) => cluster.sentiment === 'positive').slice(0, 3);
  const reputationNegativeClusters = promptNegativeClusters.length
    ? promptNegativeClusters.slice(0, 3)
    : reputationClusters.length
      ? reputationClusters.filter((cluster: any) => cluster.sentiment === 'negative').slice(0, 3)
      : localReviewClusters.filter((cluster) => cluster.sentiment === 'negative').slice(0, 3);
  const reputationSummary = reputationCard?.summary
    || `好评主要集中在${reputationPositiveClusters.map((cluster: any) => cluster.label).join('、') || '使用体验'}；差评多提到${reputationNegativeClusters.map((cluster: any) => cluster.label).join('、') || '售后规则'}。`;
  const productReasonParts = (product?.reason || '').split(/\s*优惠：\s*/, 2);
  const productReasonConclusion = productReasonParts[0]?.trim();
  const productReasonPromotion = productReasonParts[1]
    ?.split('；')
    .map((item) => item.split(/[，,]/)[0].trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('；');
  const comparisonConclusion = productReasonConclusion || comparisonCard?.conclusion || aiReasoning || '比价军师正在结合价格、渠道、规格和售后稳定性判断是否值得下单。';
  const comparisonPromotion = productReasonPromotion || comparisonCard?.promotion?.summary;

  if (!product) {
    return (
      <div className="h-full bg-gray-50 flex flex-col relative">
        <div className="pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+12px)] pb-4 px-4 flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-800">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-medium">商品详情</h1>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-500 mb-4">未找到该商品的线上详情，请从结果页重新进入。</p>
          <button onClick={() => navigate('/results')} className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm">
            返回结果页
          </button>
        </div>
      </div>
    );
  }

  const savingPlan = buildSavingPlan(product, originalPrice, shipping);
  const effectiveSavingSteps = Array.isArray(savingPlanCard?.saving_steps) && savingPlanCard.saving_steps.length
    ? savingPlanCard.saving_steps.map((step: any) => ({
      label: step.name || '已知优惠',
      amount: Number(step.amount) || 0,
      description: step.condition || '以下单页为准',
      source: 'platform' as const,
    })).filter((step: SavingStep) => step.amount > 0).slice(0, 3)
    : savingPlan.steps;
  const effectiveFinalPrice = Number(savingPlanCard?.estimated_final_price) || savingPlan.finalPrice;
  const effectiveTotalSaving = Number(savingPlanCard?.total_saving) || savingPlan.totalDiscount;

  return (
    <div className="h-full findly-surface flex flex-col relative">
      {/* Header */}
      <div className="mt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+12px)] mx-4 h-12 px-3 grid grid-cols-[32px_1fr_32px] items-center bg-white/85 backdrop-blur-md shrink-0 z-20 border border-[#DDEFE4] rounded-[22px] shadow-[0_6px_16px_rgba(23,23,23,0.05)]">
        <button onClick={() => navigate(-1)} className="w-8 h-8 -ml-1 flex items-center justify-center text-gray-800 rounded-xl active:bg-gray-100">
          <ChevronLeft size={21} />
        </button>
        <h1 className="text-center text-[15px] font-bold text-[#171717]">商品详情</h1>
        <div />
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(86px+var(--phone-safe-bottom,0px))]">
        {/* Product Basic Info */}
        <div className="bg-white p-6 mb-3 flex gap-4">
          <img src={product.image} alt={product.title} className="w-28 h-28 rounded-2xl object-cover bg-gray-50 flex-shrink-0 border border-gray-100" />
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 mb-2">{product.title}</h2>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.specs}</p>
            <div className="flex items-center">
              <span className="bg-gray-100 px-2 py-1 rounded-md text-xs text-gray-700 font-medium">
                {product.platform}
              </span>
            </div>
          </div>
        </div>

        {/* Core Decision Info */}
        <div className="bg-white p-6 mb-3">
          <div className="mb-4 flex items-start justify-between gap-4">
            <AgentPill agent={agentById.compare} label="比价军师" />
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-gray-500">预估到手价</p>
              <div className="flex items-baseline justify-end gap-0.5 text-red-500">
                <span className="text-base font-bold">¥</span>
                <span className="text-3xl font-bold tracking-tight">{product.price.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#F7FBF8] border border-[#DDEFE4] rounded-2xl p-4 flex gap-3">
            <div className="w-1 h-auto bg-[#9BE7B7] rounded-full"></div>
            <div className="text-sm text-[#171717] leading-relaxed">
              <p>{comparisonConclusion}</p>
              {comparisonPromotion && (
                <p className="mt-3">
                  <span className="font-semibold text-[#3D8B5D]">优惠：</span>
                  {comparisonPromotion}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 mb-3">
          <AgentCard agent="reputation">
            <p className="mt-3 text-[12px] leading-relaxed text-gray-600">{reputationSummary}</p>
            {(reputationCard?.review_count || reputationCard?.review_sample_size || localReviewCount) > 0 && (
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-gray-400">模拟评价聚类</span>
                <span className="text-gray-500">
                  {reputationCard?.review_count || reputationCard?.review_sample_size || localReviewCount} 条
                  {(reputationCard?.positive_rate || localPositiveRate) ? ` · 正向约 ${reputationCard?.positive_rate || localPositiveRate}%` : ''}
                </span>
              </div>
            )}
            {(reputationPositiveClusters.length > 0 || reputationNegativeClusters.length > 0) && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-bold text-[#3D8B5D]">好评</p>
                  <div className="grid grid-cols-3 gap-2">
                    {reputationPositiveClusters.map((cluster: any) => (
                      <span key={`positive-${cluster.label}`} className="rounded-xl border border-[#BFE7CF] bg-[#E8FAF4] px-2 py-2 text-center text-[11px] font-semibold text-[#2F7D52]">
                        {cluster.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold text-[#E64B63]">差评</p>
                  <div className="grid grid-cols-3 gap-2">
                    {reputationNegativeClusters.map((cluster: any) => (
                      <span key={`negative-${cluster.label}`} className="rounded-xl border border-[#FFD6DC] bg-[#FFF1F2] px-2 py-2 text-center text-[11px] font-semibold text-[#C63D55]">
                        {cluster.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </AgentCard>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white p-4 mb-3">
          <AgentCard agent="saving">
            <div className="mt-3 rounded-[22px] bg-[#F2FBF5] border border-[#BFE7CF] p-3 text-[12px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-[#2F7D52]">最省下单方案</p>
                  <p className="mt-0.5 text-[10px] text-[#3D8B5D]/70">按已知可复核优惠计算</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#3D8B5D]/70">最终到手价</p>
                  <p className="text-2xl font-black text-red-500">¥{effectiveFinalPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>商品标价</span>
                  <span>¥{originalPrice.toLocaleString()}</span>
                </div>
              {effectiveSavingSteps.map((step: SavingStep) => (
                <div key={`${step.label}-${step.amount}`} className="flex items-start justify-between gap-3 text-gray-700">
                  <span className="min-w-0 font-semibold text-[#171717]">{step.label}</span>
                  <span className="shrink-0 font-bold text-red-500">- ¥{step.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-gray-700">
                <span>预估运费</span>
                <span>{shipping ? `¥${shipping.toLocaleString()}` : '包邮'}</span>
              </div>
              <div className="h-px bg-[#BFE7CF]" />
              <div className="flex justify-between font-bold text-[#171717]">
                <span>优惠合计</span>
                <span className="text-red-500">- ¥{effectiveTotalSaving.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-[#171717]">
                <span>最省到手价</span>
                <span className="text-red-500">¥{effectiveFinalPrice.toLocaleString()}</span>
              </div>
              </div>
            </div>
          </AgentCard>
        </div>

        {priceHistory.length > 1 && (
          <div className="bg-white p-4 mb-3">
            <AgentCard
              agent="watch"
              body={priceWatchCard?.reason || priceWatchCard?.trend_summary || '我会持续观察价格波动和活动节点，帮你判断现在买还是继续等。'}
            >
              <PriceTrendChart history={priceHistory} />
            </AgentCard>
          </div>
        )}

      </div>

      {/* Bottom Action Bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[78px] bg-gradient-to-t from-[#F7FBF8] via-[#F7FBF8] to-[#F7FBF8]/0" />
      <div
        className="absolute left-[14px] right-[14px] p-2.5 bg-white/94 backdrop-blur-xl shadow-[0_14px_32px_rgba(23,23,23,0.10)] z-30 border border-[#DDEFE4] rounded-[24px]"
        style={{ bottom: 6 }}
      >
        <div className="grid grid-cols-[44px_1fr] gap-2.5">
          <button
            onClick={() => toggleFavorite(product)}
            className="h-11 rounded-[15px] bg-[#F7FBF8] border border-[#DDEFE4] flex items-center justify-center active:scale-95 transition-transform"
            aria-label="收藏"
          >
            <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-[#171717]'} />
          </button>
          <button
            onClick={() => product.url && window.open(product.url, '_blank')}
            className="h-11 rounded-[15px] bg-[#9BE7B7] text-[#171717] font-bold text-[14px] shadow-[0_8px_18px_rgba(75,170,114,0.18)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <ShoppingBag size={17} />
            去平台购买
          </button>
        </div>
      </div>
    </div>
  );
}

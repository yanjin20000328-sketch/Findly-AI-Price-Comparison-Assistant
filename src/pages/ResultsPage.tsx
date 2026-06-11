import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Check, X, Search, LayoutGrid, List, Heart, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import type { AgentMode, Product } from '../store';
import { AgentAvatar, AgentPill, agentById } from '../components/Brand';
import { AgentDiscussionStack } from '../components/AgentWidgets';
import type { AgentDiscussionTurnItem } from '../components/AgentWidgets';

const TAG_PRIORITY_RULES = [
  { pattern: /自营|官方|旗舰/, score: 100 },
  { pattern: /退换|无理由|售后/, score: 90 },
  { pattern: /同款|匹配/, score: 80 },
  { pattern: /百亿补贴|补贴/, score: 74 },
  { pattern: /尺码|换算|需确认|风险/, score: 68 },
  { pattern: /海外|Amazon/i, score: 58 },
  { pattern: /达人|试穿|穿搭/, score: 48 },
  { pattern: /宽松|薄款|材质|格纹|棉/, score: 38 },
];

const LOW_VALUE_TAG_PATTERN = /低价试错|发货快|热卖|爆款|好评|销量|参考/;
const AGENT_NAME_TO_ID = {
  比价军师: 'compare',
  省钱达人: 'saving',
  口碑探员: 'reputation',
  盯价哨兵: 'watch',
} as const;

function getSupplementalRequirements(query: string) {
  const marker = '补充要求：';
  const markerIndex = query.indexOf(marker);
  return markerIndex >= 0 ? query.slice(markerIndex + marker.length).trim() : '';
}

function getSupplementalShoppingPreferences(requirements: string) {
  const preferences: string[] = [];
  if (/官方店|官方|自营|旗舰/.test(requirements)) preferences.push('官方店优先');
  if (/预算|低价|便宜|价格/.test(requirements)) preferences.push('价格合适');
  if (/办公/.test(requirements)) preferences.push('日常办公');
  return preferences;
}

function getBudgetLimit(requirements: string) {
  const match = requirements.match(/预算\s*([\d.]+)\s*(万|w|千|k)?\s*(?:元)?\s*内/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2]?.toLowerCase();
  if (unit === '万' || unit === 'w') return amount * 10000;
  if (unit === '千' || unit === 'k') return amount * 1000;
  return amount;
}

function applySupplementalRequirements(products: Product[], requirements: string) {
  if (!requirements.trim()) return products;

  const wantsOfficial = /官方店|官方|自营|旗舰/.test(requirements);
  const wantsLowPrice = /低价优先|便宜优先|价格优先/.test(requirements);
  const wantsOffice = /日常办公|办公/.test(requirements);
  const budgetLimit = getBudgetLimit(requirements);
  const withinBudget = budgetLimit === null ? products : products.filter((product) => product.price <= budgetLimit);
  const candidates = withinBudget.length > 0 ? withinBudget : products;

  const score = (product: Product) => {
    const text = `${product.title} ${product.specs} ${product.platform} ${product.tags.join(' ')}`;
    return (
      (wantsOfficial && /官方|自营|旗舰|授权/.test(text) ? 100 : 0) +
      (wantsOffice && /办公|商务|轻薄|长续航/.test(text) ? 20 : 0)
    );
  };

  return [...candidates].sort((a, b) => {
    const scoreDifference = score(b) - score(a);
    if (scoreDifference !== 0) return scoreDifference;
    if (wantsLowPrice || budgetLimit !== null) return a.price - b.price;
    return 0;
  });
}

function formatTop1DecisionSummary(summary?: any) {
  if (!summary || typeof summary !== 'object') return '';
  const sections: string[] = [];
  if (Array.isArray(summary.decision_dimensions)) {
    summary.decision_dimensions.slice(0, 3).forEach((dimension: any) => {
      const title = String(dimension.title || '').trim();
      const analysis = String(dimension.analysis || dimension.conclusion || '').trim();
      if (title && analysis) sections.push(`${title}\n\n${analysis}`);
    });
  }
  return sections.join('\n\n');
}

function getUsefulProductTags(product: Product, limit = 2) {
  const uniqueTags = [...new Set(product.tags.map((tag) => tag.trim()).filter(Boolean))];
  const meaningfulTags = uniqueTags.filter((tag) => !LOW_VALUE_TAG_PATTERN.test(tag));
  const candidates = meaningfulTags.length > 0 ? meaningfulTags : uniqueTags;

  return candidates
    .map((tag, index) => {
      const score = TAG_PRIORITY_RULES.find((rule) => rule.pattern.test(tag))?.score ?? 10;
      return { tag, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.tag);
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentImage, selectedProductsForCompare, toggleProductForCompare, clearCompareSelection, aiReasoning, setAiReasoning, top1AgentDiscussion, setTop1AgentDiscussion, favoriteProducts, toggleFavorite, currentSearchQuery, setCurrentSearchQuery, currentVisualProfile, searchProducts, searchResultQuery, setSearchProducts, agentMode, setAgentMode, preferences } = useAppStore();
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showInputPopup, setShowInputPopup] = useState(false);
  const [isTopReasonExpanded, setIsTopReasonExpanded] = useState(false);
  const [isTop1DiscussionExpanded, setIsTop1DiscussionExpanded] = useState(false);
  const [top1DiscussionPhase, setTop1DiscussionPhase] = useState<'thinking' | 'discussing' | 'finalizing' | 'done'>('done');
  const [visibleTop1TurnCount, setVisibleTop1TurnCount] = useState(0);
  const [activeTop1TurnIndex, setActiveTop1TurnIndex] = useState(0);
  const [activeTop1TurnCharCount, setActiveTop1TurnCharCount] = useState(0);
  const [top1ReasonCharCount, setTop1ReasonCharCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [chatInput, setChatInput] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendationRefreshKey, setRecommendationRefreshKey] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTop1ReasonLoading, setIsTop1ReasonLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const lastPlayedTop1DiscussionRef = useRef('');
  const latestTop1RequestRef = useRef('');
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    sort: '综合推荐',
    price: '全部价格',
    platform: '全部平台',
    store: '全部店型'
  });

  const FILTER_CONFIG: Record<string, string[]> = {
    '综合推荐': ['综合推荐', '价格最低', '销量最高'],
    '价格区间': ['全部价格', '10000以下', '10000-11000', '11000以上'],
    '平台': ['全部平台', '淘宝', '天猫', 'Amazon', '京东', '拼多多', '抖音商城'],
    '店铺类型': ['全部店型', '自营/官方', '其他']
  };

  const top1DiscussionTurns: AgentDiscussionTurnItem[] = useMemo(() => (
    top1AgentDiscussion?.debate_turns?.length
      ? top1AgentDiscussion.debate_turns.map((turn) => ({
        agent: AGENT_NAME_TO_ID[turn.agent as keyof typeof AGENT_NAME_TO_ID] || 'compare',
        target: turn.target,
        message: turn.message,
      }))
      : []
  ), [top1AgentDiscussion]);
  const currentTopProductId = displayProducts[0]?.id || '';
  const top1DecisionSummaryText = useMemo(
    () => formatTop1DecisionSummary(top1AgentDiscussion?.decision_summary),
    [top1AgentDiscussion?.decision_summary],
  );
  const top1FinalRecommendation = top1DecisionSummaryText || top1AgentDiscussion?.final_recommendation || '综合建议：优先看 Top 1。';
  const showTop1Discussion = agentMode === 'discussion' && top1DiscussionTurns.length > 0;
  const top1QuickReasonText = useMemo(() => {
    return top1AgentDiscussion?.normal_summary || aiReasoning || '综合价格、匹配度和风险后，这个候选更适合作为当前 Top 1。';
  }, [aiReasoning, top1AgentDiscussion]);
  const top1ReasonText = agentMode === 'discussion' ? top1FinalRecommendation : top1QuickReasonText;
  const top1DiscussionSignature = useMemo(() => {
    if (!top1AgentDiscussion?.debate_turns?.length || !currentTopProductId) return '';
    return JSON.stringify({
      query: currentSearchQuery.trim(),
      topProductId: currentTopProductId,
      final: top1AgentDiscussion.final_recommendation,
      turns: top1AgentDiscussion.debate_turns.map((turn) => ({
        agent: turn.agent,
        target: turn.target,
        message: turn.message,
      })),
    });
  }, [currentSearchQuery, currentTopProductId, top1AgentDiscussion]);
  const isTop1Live = top1DiscussionPhase !== 'done' && showTop1Discussion;
  const visibleTop1DiscussionTurns = top1DiscussionPhase === 'discussing'
    ? top1DiscussionTurns.slice(0, visibleTop1TurnCount + 1)
    : top1DiscussionTurns;
  const activeTop1Turn = top1DiscussionTurns[activeTop1TurnIndex];
  const activeTop1TurnText = top1DiscussionPhase === 'discussing'
    ? (activeTop1Turn?.message || '').slice(0, activeTop1TurnCharCount)
    : undefined;
  const visibleTop1ReasonText = top1DiscussionPhase === 'finalizing'
    ? top1ReasonText.slice(0, top1ReasonCharCount)
    : top1ReasonText;
  const reasonHasMore = top1ReasonText.length > 72;
  const top1LoadingText = agentMode === 'discussion' ? 'Agent 正在认真讨论中...' : 'Findly 正在生成理由...';

  const handleTop1ModeChange = (mode: AgentMode) => {
    if (mode === agentMode) return;
    setAgentMode(mode);
    setIsTopReasonExpanded(false);
    setIsTop1DiscussionExpanded(false);
  };

  const renderTop1ModeToggle = () => (
    <div className="flex h-7 shrink-0 items-center rounded-full border border-[#BFE7CF] bg-white/72 p-0.5 shadow-[0_6px_14px_rgba(75,170,114,0.08)]">
      {(['normal', 'discussion'] as const).map((mode) => {
        const isActive = agentMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => handleTop1ModeChange(mode)}
            className={`h-6 rounded-full px-2.5 text-[11px] font-bold transition-colors ${
              isActive ? 'bg-[#4BAA72] text-white shadow-[0_4px_10px_rgba(75,170,114,0.20)]' : 'text-[#3D8B5D]'
            }`}
            aria-label={`切换到${mode === 'discussion' ? '讨论' : '普通'}模式`}
          >
            {mode === 'discussion' ? '讨论' : '普通'}
          </button>
        );
      })}
    </div>
  );

  const renderReasonCard = (text: string, isStreaming = false, showModeToggle = true) => (
    <motion.div
      className="rounded-[24px] border border-[#BFE7CF] bg-[#F2FBF5] px-4 py-3 shadow-[0_12px_26px_rgba(75,170,114,0.10)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold leading-none text-[#2F7D52]">选择理由</p>
        {!isStreaming && showModeToggle && renderTop1ModeToggle()}
      </div>
      {showTop1Discussion && renderCompactTop1Discussion()}
      <div className="relative">
        <p className={`mt-2 whitespace-pre-line text-[13px] font-semibold leading-relaxed text-[#171717] ${!isStreaming && reasonHasMore && !isTopReasonExpanded ? 'line-clamp-3' : ''}`}>
          {text}
          {isStreaming && <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-full bg-[#4BAA72]" />}
        </p>
        {!isStreaming && reasonHasMore && !isTopReasonExpanded && (
          <button
            type="button"
            onClick={() => setIsTopReasonExpanded(true)}
            className="absolute bottom-1 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-white/80 bg-[#F2FBF5]/90 text-[#23663D] shadow-[0_4px_12px_rgba(35,102,61,0.12)] backdrop-blur-[2px] active:scale-95 transition-transform"
            aria-label="展开选择理由"
          >
            <ChevronDown size={16} strokeWidth={3} />
          </button>
        )}
      </div>
      {!isStreaming && reasonHasMore && isTopReasonExpanded && (
        <button
          type="button"
          onClick={() => setIsTopReasonExpanded(false)}
          className="mx-auto mt-1 flex h-6 w-8 items-center justify-center rounded-full text-[#5A9D72] active:bg-white/60 active:scale-95 transition-transform"
          aria-label="收起选择理由"
        >
          <ChevronDown size={15} className="rotate-180" />
        </button>
      )}
    </motion.div>
  );

  const renderTop1DiscussionProcessCard = (isStreaming = false) => (
    <AgentDiscussionStack
      items={isStreaming ? visibleTop1DiscussionTurns : top1DiscussionTurns}
      conflictText={top1AgentDiscussion?.conflict_summary}
      collapsed={!isStreaming && !isTop1DiscussionExpanded}
      onToggle={isStreaming ? undefined : () => setIsTop1DiscussionExpanded((expanded) => !expanded)}
      activeIndex={isStreaming ? activeTop1TurnIndex : undefined}
      activeText={isStreaming ? activeTop1TurnText : undefined}
    />
  );

  const renderCompactTop1Discussion = () => {
    if (!showTop1Discussion) return null;

    return (
      <div className="mb-2.5 mt-2 rounded-2xl border border-[#DDEFE4]/70 bg-white/46 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setIsTop1DiscussionExpanded((expanded) => !expanded)}
          className="flex w-full items-center gap-1.5 text-left active:scale-[0.995] transition-transform"
          aria-label={isTop1DiscussionExpanded ? '收起讨论过程' : '展开讨论过程'}
        >
          <Network size={13} strokeWidth={1.9} className="text-[#3D8B5D]" />
          <span className="text-[11px] font-medium text-[#3D8B5D]">讨论过程</span>
          <ChevronDown size={13} className={`ml-auto text-[#7A8A82] transition-transform ${isTop1DiscussionExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isTop1DiscussionExpanded && (
          <div className="mt-2 space-y-1.5 border-t border-[#DDEFE4]/70 pt-2">
            {top1AgentDiscussion?.conflict_summary && (
              <p className="rounded-xl bg-[#F7FBF8] px-2.5 py-1.5 text-[11px] font-medium leading-relaxed text-[#3D8B5D]">
                {top1AgentDiscussion.conflict_summary}
              </p>
            )}
            {top1DiscussionTurns.map((item, index) => {
              const agent = agentById[item.agent];
              return (
                <div key={`${item.agent}-${index}-${item.message}`} className="flex gap-2 rounded-xl bg-white/72 px-2.5 py-1.5">
                  <AgentAvatar agent={agent} className="mt-0.5 h-5 w-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[#2F7D52]">{agent.name}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[#6B7280]">{item.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (agentMode !== 'discussion' || !top1DiscussionSignature) {
      setTop1DiscussionPhase('done');
      setVisibleTop1TurnCount(0);
      setActiveTop1TurnIndex(0);
      setActiveTop1TurnCharCount(0);
      setTop1ReasonCharCount(top1ReasonText.length);
      setIsTopReasonExpanded(false);
      setIsTop1DiscussionExpanded(false);
      return;
    }

    if (lastPlayedTop1DiscussionRef.current === top1DiscussionSignature) {
      setTop1DiscussionPhase('done');
      setVisibleTop1TurnCount(0);
      setActiveTop1TurnIndex(0);
      setActiveTop1TurnCharCount(0);
      setTop1ReasonCharCount(top1ReasonText.length);
      setIsTop1DiscussionExpanded(false);
      return;
    }

    lastPlayedTop1DiscussionRef.current = top1DiscussionSignature;

    setTop1DiscussionPhase('thinking');
    setVisibleTop1TurnCount(0);
    setActiveTop1TurnIndex(0);
    setActiveTop1TurnCharCount(0);
    setTop1ReasonCharCount(0);
    setIsTopReasonExpanded(false);
    setIsTop1DiscussionExpanded(true);

    const timer = window.setTimeout(() => setTop1DiscussionPhase('discussing'), 620);
    return () => window.clearTimeout(timer);
  }, [agentMode, top1DiscussionSignature, top1ReasonText.length]);

  useEffect(() => {
    if (top1DiscussionPhase !== 'discussing' || !top1DiscussionTurns.length) return;

    const current = top1DiscussionTurns[activeTop1TurnIndex];
    if (!current) {
      setTop1DiscussionPhase('finalizing');
      setIsTopReasonExpanded(false);
      return;
    }

    if (activeTop1TurnCharCount < current.message.length) {
      const timer = window.setTimeout(() => {
        setActiveTop1TurnCharCount((count) => Math.min(current.message.length, count + 2));
      }, 24);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const nextIndex = activeTop1TurnIndex + 1;
      if (nextIndex >= top1DiscussionTurns.length) {
        setTop1DiscussionPhase('finalizing');
        setIsTopReasonExpanded(false);
        setIsTop1DiscussionExpanded(false);
      } else {
        setActiveTop1TurnIndex(nextIndex);
        setVisibleTop1TurnCount(nextIndex);
        setActiveTop1TurnCharCount(0);
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [top1DiscussionPhase, top1DiscussionTurns, activeTop1TurnIndex, activeTop1TurnCharCount]);

  useEffect(() => {
    if (top1DiscussionPhase !== 'finalizing') return;

    if (top1ReasonCharCount < top1ReasonText.length) {
      const timer = window.setTimeout(() => {
        setTop1ReasonCharCount((count) => Math.min(top1ReasonText.length, count + 2));
      }, 22);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setTop1DiscussionPhase('done'), 520);
    return () => window.clearTimeout(timer);
  }, [top1DiscussionPhase, top1ReasonCharCount, top1ReasonText]);

  const formatSourceErrors = (sourceErrors: unknown) => {
    if (!sourceErrors || typeof sourceErrors !== 'object') return '';
    const labels: Record<string, string> = {
      taobao: '淘宝',
      amazon: 'Amazon',
      jd: '京东',
      tiktokShop: 'TikTok Shop',
    };
    return Object.entries(sourceErrors as Record<string, string>)
      .map(([source, message]) => `${labels[source] || source}: ${message}`)
      .join('；');
  };

  const fetchSearchResults = async (query: string, visualProfile: unknown, mode: AgentMode, requirements: string) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          query,
          visualProfile,
          collaborationMode: mode === 'discussion' ? 'debate' : 'quick',
          debateEnabled: mode === 'discussion',
          userIntent: mode === 'discussion' ? 'demo_showcase' : 'immediate_result',
          userPreferences: {
            ...preferences,
            shoppingPref: [...new Set([...preferences.shoppingPref, ...getSupplementalShoppingPreferences(requirements)])],
          },
          skipAi: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.details || json?.error || '搜索接口请求失败');
      }
      return json;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('搜索请求超时，请确认后端服务已启动');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const fetchTop1Discussion = async (query: string, visualProfile: unknown, products: Product[], mode: AgentMode, requirements: string) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch('/api/top1-discussion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          query,
          visualProfile,
          products,
          collaborationMode: mode === 'discussion' ? 'debate' : 'quick',
          debateEnabled: mode === 'discussion',
          userIntent: mode === 'discussion' ? 'demo_showcase' : 'immediate_result',
          userPreferences: {
            ...preferences,
            shoppingPref: [...new Set([...preferences.shoppingPref, ...getSupplementalShoppingPreferences(requirements)])],
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.details || json?.error || 'Top1 讨论接口请求失败');
      }
      return json;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Top1 讨论请求超时');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  // 初次加载时请求多平台真实数据
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      const query = currentSearchQuery.trim();
      const requirements = getSupplementalRequirements(query);
      // Fetch the richer discussion payload once. It also contains normal_summary,
      // so switching modes is a local presentation change with no model request.
      const requestedMode: AgentMode = 'discussion';
      const requestId = `${requestedMode}-${query}-${Date.now()}`;
      const isActiveRequest = () => (
        !cancelled &&
        latestTop1RequestRef.current === requestId
      );
      latestTop1RequestRef.current = requestId;

      if (!query) {
        setAllProducts([]);
        setDisplayProducts([]);
        setSearchError('');
        setIsLoading(false);
        setIsTop1ReasonLoading(false);
        setIsRecommending(false);
        return;
      }

      const hasCachedProducts = searchResultQuery === query && searchProducts.length > 0;
      if (hasCachedProducts) {
        setAllProducts(searchProducts);
        setDisplayProducts(searchProducts);
      }

      setIsLoading(!hasCachedProducts);
      setIsTop1ReasonLoading(true);
      setSearchError('');
      try {
        const json = await fetchSearchResults(query, currentVisualProfile, requestedMode, requirements);
        if (!isActiveRequest()) return;

        const products = applySupplementalRequirements(Array.isArray(json.data) ? json.data : [], requirements);
        const sourceErrorText = formatSourceErrors(json.sourceErrors);
        if (products.length > 0) {
          setAllProducts(products);
          setDisplayProducts(products);
          setSearchProducts(products, query);
          sessionStorage.setItem('searchProducts', JSON.stringify(json.data));
          sessionStorage.setItem('searchQuery', query);
          if (json.visualProfile) sessionStorage.setItem('visualProfile', JSON.stringify(json.visualProfile));
          setAiReasoning(json.reasoning || null);
          // /api/search returns a local fallback discussion; wait for the dedicated
          // Top1 endpoint so the discussion animation does not play twice.
          setTop1AgentDiscussion(null);
          setIsTop1ReasonLoading(true);
          setSearchError(sourceErrorText);
          fetchTop1Discussion(query, json.visualProfile || currentVisualProfile, products, requestedMode, requirements)
            .then((top1Json) => {
              if (!isActiveRequest()) return;
              const modelSortedProducts = top1Json.topProductId
                ? [...products].sort((a, b) => {
                  if (a.id === top1Json.topProductId) return -1;
                  if (b.id === top1Json.topProductId) return 1;
                  return 0;
                })
                : products;
              const nextProducts = applySupplementalRequirements(modelSortedProducts, requirements);
              setAllProducts(nextProducts);
              setDisplayProducts(nextProducts);
              setSearchProducts(nextProducts, query);
              sessionStorage.setItem('searchProducts', JSON.stringify(nextProducts));
              setAiReasoning(top1Json.reasoning || null);
              setTop1AgentDiscussion(top1Json.agentDiscussion || null);
              setIsTop1ReasonLoading(false);
              setIsRecommending(false);
            })
            .catch((error) => {
              console.error(error);
              if (isActiveRequest()) {
                setIsTop1ReasonLoading(false);
                setIsRecommending(false);
              }
            });
        } else {
          if (!hasCachedProducts) {
            setAllProducts([]);
            setDisplayProducts([]);
            setSearchProducts([], query);
            sessionStorage.removeItem('searchProducts');
          }
          setAiReasoning(null);
          setTop1AgentDiscussion(null);
          setIsTop1ReasonLoading(false);
          setIsRecommending(false);
          setSearchError(sourceErrorText || '没有找到可展示的商品结果');
        }
      } catch (e) {
        console.error("爬虫接口请求失败", e);
        if (!isActiveRequest()) return;
        if (!hasCachedProducts) {
          setAllProducts([]);
          setDisplayProducts([]);
          setSearchProducts([], query);
          sessionStorage.removeItem('searchProducts');
        }
        setAiReasoning(null);
        setTop1AgentDiscussion(null);
        setIsTop1ReasonLoading(false);
        setIsRecommending(false);
        setSearchError(e instanceof Error ? e.message : '搜索接口请求失败');
      } finally {
        if (isActiveRequest()) setIsLoading(false);
      }
    };
    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [currentSearchQuery, currentVisualProfile, recommendationRefreshKey, setAiReasoning, setSearchProducts, setTop1AgentDiscussion]);

  useEffect(() => {
    let result = [...allProducts];

    if (filterOptions.platform !== '全部平台') {
      result = result.filter(p => p.platform.includes(filterOptions.platform));
    }

    if (filterOptions.price === '10000以下') {
      result = result.filter(p => p.price < 10000);
    } else if (filterOptions.price === '10000-11000') {
      result = result.filter(p => p.price >= 10000 && p.price <= 11000);
    } else if (filterOptions.price === '11000以上') {
      result = result.filter(p => p.price > 11000);
    }

    if (filterOptions.store === '自营/官方') {
      result = result.filter(p => p.platform.includes('自营') || p.platform.includes('官方'));
    } else if (filterOptions.store === '其他') {
      result = result.filter(p => !p.platform.includes('自营') && !p.platform.includes('官方'));
    }

    if (filterOptions.sort === '价格最低') {
      result.sort((a, b) => a.price - b.price);
    } else if (filterOptions.sort === '销量最高') {
      const parseSales = (s: string) => {
        if (s.includes('w')) return parseFloat(s.replace(/[^\d.]/g, '')) * 10000;
        return parseInt(s.replace(/[^\d]/g, '')) || 0;
      };
      result.sort((a, b) => parseSales(b.sales) - parseSales(a.sales));
    }

    setDisplayProducts(result);
  }, [filterOptions, allProducts]);

  const toggleCompareMode = () => {
    if (isCompareMode) {
      setIsCompareMode(false);
      clearCompareSelection();
    } else {
      setIsCompareMode(true);
    }
  };

  const handleStartCompare = () => {
    if (selectedProductsForCompare.length >= 2) {
      navigate('/compare');
    }
  };

  const handleChipClick = (tag: string) => {
    setChatInput(prev => {
      if (!prev) return tag;
      const terms = prev.split(',').map(t => t.trim());
      if (terms.includes(tag)) {
        return terms.filter(t => t !== tag).join(', ');
      }
      return prev + (prev.endsWith(', ') || prev.endsWith(',') ? '' : ', ') + tag;
    });
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    const requirements = chatInput.trim();
    const baseQuery = currentVisualProfile?.product_name?.trim()
      || currentSearchQuery.split('补充要求：')[0].replace(/[，,\s]+$/, '').trim();
    const nextQuery = `${baseQuery}，补充要求：${requirements}`;
    setIsRecommending(true);
    setCurrentSearchQuery(nextQuery);
    setRecommendationRefreshKey((key) => key + 1);
    sessionStorage.setItem('searchQuery', nextQuery);
    setShowInputPopup(false);
  };

  return (
    <div className="h-full findly-surface flex flex-col relative">
      {/* Header & Input Area */}
      <div className="px-3 mt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+12px)] pb-1.5 shrink-0 z-20">
        <div className="bg-white/88 backdrop-blur-xl rounded-[26px] border border-[#DDEFE4] shadow-[0_12px_28px_rgba(23,23,23,0.07)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 -ml-1 flex items-center justify-center bg-gray-100 rounded-full text-gray-800 shrink-0 active:scale-95 transition-transform">
            <ChevronLeft size={18} />
          </button>
          
          <button
            type="button"
            onClick={() => setShowInputPopup(true)}
            className="flex-1 h-[38px] bg-[#F7FBF8] rounded-full flex items-center px-2 gap-1.5 shadow-[0_4px_16px_rgba(23,23,23,0.05)] cursor-text border border-[#DDEFE4] min-w-0 text-left"
          >
            {currentImage && (
              <img src={currentImage} alt="thumb" className="w-6 h-6 rounded-full object-cover shrink-0 ml-0.5" />
            )}
            <span className="flex-1 text-gray-400 text-[12px] truncate">
              {isRecommending ? '正在更新推荐...' : chatInput || "+ 补充要求：预算、品牌或偏好"}
            </span>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-gray-800 shrink-0 mr-0.5">
              <Search size={16} strokeWidth={2} />
            </div>
          </button>
        </div>

        {/* Filters & View Toggle */}
        <div className="relative z-30 mt-3">
          <div className="flex items-center gap-2 relative bg-white/80 z-20 min-w-0">
            <div className="flex-1 min-w-0 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium w-max min-w-full">
              {Object.keys(FILTER_CONFIG).map((filterKey) => {
                const isActive = activeDropdown === filterKey;
                let displayLabel = filterKey;
                if (filterKey === '综合推荐' && filterOptions.sort !== '综合推荐') displayLabel = filterOptions.sort;
                if (filterKey === '价格区间' && filterOptions.price !== '全部价格') displayLabel = filterOptions.price;
                if (filterKey === '平台' && filterOptions.platform !== '全部平台') displayLabel = filterOptions.platform;
                if (filterKey === '店铺类型' && filterOptions.store !== '全部店型') displayLabel = filterOptions.store;

                const isModified = displayLabel !== filterKey;

                return (
                  <button 
                    key={filterKey}
                    onClick={() => setActiveDropdown(isActive ? null : filterKey)}
                    className={`h-8 px-3 rounded-full bg-[#F7FBF8] border border-[#DDEFE4] flex items-center justify-center gap-1 transition-colors shrink-0 whitespace-nowrap ${isActive || isModified ? 'text-[#171717] font-semibold' : 'hover:text-gray-900'}`}
                >
                    <span>{displayLabel}</span>
                    <ChevronDown size={11} className={`shrink-0 transition-transform ${isActive ? 'rotate-180 text-[#9BE7B7]' : isModified ? 'text-[#9BE7B7]' : 'text-gray-400'}`}/>
                  </button>
                )
              })}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                className="text-gray-500 hover:text-gray-900 active:scale-95 transition-transform flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 shadow-sm"
                aria-label="切换 Feed 流展示方式"
              >
                {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
              </button>
              <button 
                onClick={toggleCompareMode}
                className={`h-8 text-[12px] font-semibold px-3 rounded-full flex-shrink-0 transition-colors shadow-sm whitespace-nowrap ${isCompareMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {isCompareMode ? '取消对比' : 'AI 对比'}
              </button>
            </div>
          </div>

          {/* Dropdown Panel */}
          <AnimatePresence>
            {activeDropdown && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-black/5"
                  onClick={() => setActiveDropdown(null)}
                />
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 w-full bg-white rounded-b-2xl shadow-[0_10px_24px_rgba(23,23,23,0.06)] border-t border-gray-100 p-2 z-20 mt-3"
                >
                  <div className="flex flex-col">
                    {FILTER_CONFIG[activeDropdown].map(option => {
                      let isSelected = false;
                      if (activeDropdown === '综合推荐') isSelected = filterOptions.sort === option;
                      if (activeDropdown === '价格区间') isSelected = filterOptions.price === option;
                      if (activeDropdown === '平台') isSelected = filterOptions.platform === option;
                      if (activeDropdown === '店铺类型') isSelected = filterOptions.store === option;

                      return (
                        <button 
                          key={option}
                          onClick={() => {
                            setFilterOptions(prev => ({
                              ...prev,
                              sort: activeDropdown === '综合推荐' ? option : prev.sort,
                              price: activeDropdown === '价格区间' ? option : prev.price,
                              platform: activeDropdown === '平台' ? option : prev.platform,
                              store: activeDropdown === '店铺类型' ? option : prev.store,
                            }));
                            setActiveDropdown(null);
                          }}
                          className={`text-left px-4 py-3 text-sm rounded-xl transition-colors ${isSelected ? 'bg-[#E9F8EF] text-[#4BAA72] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(132px+var(--phone-safe-bottom,0px))]">
        {isLoading && displayProducts.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
            <span className="w-8 h-8 rounded-full border-4 border-[#9BE7B7] border-t-transparent animate-spin mb-4" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
            <Search size={40} className="mb-4 text-gray-300" />
            <p>{searchError || '没有找到符合筛选条件的商品'}</p>
            <button 
              onClick={() => setFilterOptions({ sort: '综合推荐', price: '全部价格', platform: '全部平台', store: '全部店型' })}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 active:scale-95"
            >
              重置筛选
            </button>
          </div>
        ) : (
          <>
            {/* Top 1 AI Recommendation Card (Combined Summary & Product) */}
            {searchError && (
              <div className="mb-4 rounded-2xl bg-[#F2FBF5] border border-[#DDEFE4] px-4 py-3 text-[12px] text-[#3D8B5D] leading-relaxed">
                Findly 已先展示可用平台结果，部分真实数据源暂时不可用：{searchError}
              </div>
            )}

            {!isCompareMode && displayProducts.length > 0 && (
              <div className="bg-white rounded-[24px] p-4 mb-4 shadow-[0_10px_30px_rgba(23,23,23,0.06)] border border-[#DDEFE4] relative overflow-hidden">
                <div className="flex items-center mb-3">
                  <AgentPill agent={agentById.compare} label="Top 1 推荐" />
                </div>

                <div 
                  className="flex gap-3 cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => navigate(`/product/${displayProducts[0].id}`)}
                >
                  <div className="relative w-20 h-20 rounded-2xl bg-[#E9F8EF] flex items-center justify-center shrink-0">
                    <img src={displayProducts[0].image} alt="Top 1" className="w-16 h-16 object-cover mix-blend-multiply opacity-90" />
                    <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-[#171717]/70">
                      Top Choice
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0 py-0.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/product/${displayProducts[0].id}`);
                      }}
                      className="text-left text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-1 active:text-[#4BAA72] transition-colors"
                    >
                      {displayProducts[0].title}
                    </button>
                    <p className="text-[11px] text-gray-500 mb-1.5 truncate">
                      {displayProducts[0].platform.replace(' ', ' · ')} · {displayProducts[0].sales.replace('已售 ', '销量 ')}
                    </p>
                    <div className="mt-auto text-lg font-bold text-[#FF2D55] tracking-tight">
                      <span className="text-xs mr-0.5">¥</span>{displayProducts[0].price.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                  {isTop1Live ? (
                    top1DiscussionPhase === 'thinking' ? (
                      <div className="rounded-[24px] border border-[#DDEFE4] bg-white/86 p-4 shadow-[0_10px_24px_rgba(23,23,23,0.04)]">
                        <div className="mb-4 flex items-center gap-2">
                          <Network size={17} className="text-[#3D8B5D]" />
                          <p className="text-[14px] font-semibold text-[#171717]">讨论过程</p>
                        </div>
                        <div className="space-y-2">
                          <motion.div
                            className="h-3 w-4/5 rounded-full bg-[#E9F8EF]"
                            animate={{ opacity: [0.38, 0.9, 0.38] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <motion.div
                            className="h-3 w-2/3 rounded-full bg-[#F0F5F2]"
                            animate={{ opacity: [0.28, 0.78, 0.28] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.18 }}
                          />
                        </div>
                      </div>
                    ) : top1DiscussionPhase === 'discussing' ? (
                      renderTop1DiscussionProcessCard(true)
                    ) : (
                      renderReasonCard(visibleTop1ReasonText, top1DiscussionPhase === 'finalizing')
                    )
                  ) : isTop1ReasonLoading ? (
                    <div className="rounded-[24px] border border-[#BFE7CF] bg-[#F2FBF5] px-4 py-3 shadow-[0_12px_26px_rgba(75,170,114,0.10)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] font-bold leading-none text-[#2F7D52]">选择理由</p>
                        {renderTop1ModeToggle()}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#3D8B5D]">
                        <span className="h-4 w-4 rounded-full border-2 border-[#BFE7CF] border-t-[#4BAA72] animate-spin" />
                        <span>{top1LoadingText}</span>
                      </div>
                    </div>
                  ) : agentMode === 'discussion' && showTop1Discussion ? (
                    renderReasonCard(top1ReasonText)
                  ) : (
                    renderReasonCard(top1ReasonText)
                  )}
                </div>
              </div>
            )}

            {/* List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
              {(isCompareMode ? displayProducts : displayProducts.slice(1)).map((product) => {
            const isSelected = selectedProductsForCompare.some(p => p.id === product.id);
            const isFavorite = favoriteProducts.some(p => p.id === product.id);
            const usefulTags = getUsefulProductTags(product, viewMode === 'grid' ? 1 : 2);

            if (viewMode === 'grid') {
              return (
                <div 
                  key={product.id} 
                  className={`bg-white rounded-2xl p-3 flex flex-col shadow-[0_8px_22px_rgba(23,23,23,0.04)] border transition-all relative ${isSelected ? 'border-[#4BAA72] ring-1 ring-[#4BAA72]/20' : 'border-transparent'}`}
                  onClick={() => {
                    if (isCompareMode) toggleProductForCompare(product);
                    else navigate(`/product/${product.id}`);
                  }}
                >
                  {isCompareMode && (
                    <div className="absolute top-2 left-2 z-10 bg-white rounded-full">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#4BAA72] border-[#4BAA72]' : 'border-gray-300'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  )}
                  
                  {/* Favorite Button (Grid) */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product);
                    }}
                    className="absolute top-4 right-4 z-10 w-7 h-7 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm"
                  >
                    <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"} />
                  </button>

                  <img src={product.image} alt={product.title} className="w-full aspect-square rounded-xl object-cover bg-gray-50 mb-2" />
                  <h4 className="text-[12px] font-medium text-gray-900 line-clamp-2 leading-snug mb-1">{product.title}</h4>
                  <div className="mb-1.5 text-[9px] text-gray-400 leading-tight">
                    <p className="truncate">{product.platform}</p>
                    <p className="mt-0.5">{product.sales}</p>
                  </div>
                  {usefulTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {usefulTags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#F2FBF5] text-[#3D8B5D] border border-[#DDEFE4]">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-1">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-[10px] font-bold text-red-500">¥</span>
                      <span className="text-[15px] font-bold text-red-500 leading-none">{product.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={product.id} className="relative">
                <div 
                  className={`bg-white rounded-2xl p-3 flex gap-3 shadow-sm border transition-all relative ${isSelected ? 'border-[#4BAA72] shadow-md ring-1 ring-[#4BAA72]/20' : 'border-transparent'}`}
                  onClick={() => {
                    if (isCompareMode) toggleProductForCompare(product);
                    else navigate(`/product/${product.id}`);
                  }}
                >
                  {isCompareMode && (
                    <div className="absolute top-1/2 -translate-y-1/2 -left-3 z-10 bg-white rounded-full">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#4BAA72] border-[#4BAA72]' : 'border-gray-300'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  )}

                  {/* Favorite Button (List) */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product);
                    }}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Heart size={16} className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"} />
                  </button>

                  <img src={product.image} alt={product.title} className="w-20 h-20 rounded-xl object-cover bg-gray-50 flex-shrink-0" />
                  
                  <div className="flex-1 flex flex-col min-w-0 pr-6">
                    <h4 className="text-[13px] font-medium text-gray-900 line-clamp-2 leading-snug">{product.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{product.specs}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400 min-w-0">
                      <span className="truncate">{product.platform}</span>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0">{product.sales}</span>
                    </div>
                    
                    {usefulTags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {usefulTags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#F2FBF5] text-[#3D8B5D] border border-[#DDEFE4] font-medium">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex justify-end pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] font-bold text-red-500">¥</span>
                        <span className="text-base font-bold text-red-500 leading-none">{product.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>

      {!isCompareMode && (
        <button
          onClick={() => navigate('/main/collection')}
          className="absolute right-6 bottom-[calc(var(--phone-safe-bottom,0px)+76px)] z-30 w-14 h-14 rounded-full glass flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.12)] active:scale-95 transition-transform"
          aria-label="打开我的收藏"
        >
          <Heart size={20} className="text-gray-800" />
          {favoriteProducts.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
              {favoriteProducts.length}
            </span>
          )}
        </button>
      )}

      {/* Compare Mode Bottom Bar */}
      <AnimatePresence>
        {isCompareMode && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute phone-bottom-panel p-5 glass shadow-[0_18px_40px_rgba(0,0,0,0.12)] z-30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">已选 {selectedProductsForCompare.length} 个方案</p>
                <p className="text-xs text-gray-500">最多选择 5 个</p>
              </div>
              <button 
                onClick={handleStartCompare}
                disabled={selectedProductsForCompare.length < 2}
                className={`px-8 py-3 rounded-xl font-medium shadow-sm transition-all ${
                  selectedProductsForCompare.length >= 2 
                    ? 'bg-gray-900 text-white active:scale-95' 
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                开始对比
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Popup Sheet */}
      <AnimatePresence>
        {showInputPopup && (
          <>
            <div
              className="absolute inset-0 bg-[#171717]/18 z-40"
              onClick={() => setShowInputPopup(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-4 bottom-[calc(var(--phone-safe-bottom,0px)+8px)] z-50 h-[52%] rounded-[34px] border border-white/70 bg-white/62 px-5 pt-4 pb-5 shadow-[0_26px_70px_rgba(23,23,23,0.22)] backdrop-blur-2xl flex flex-col overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/76 via-[#F7FBF8]/50 to-white/68" />
              <div className="pointer-events-none absolute inset-x-8 top-2 h-24 rounded-full bg-[#9BE7B7]/16 blur-2xl" />
              <div className="relative z-10 mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#DDEFE4]" />

              <div className="relative z-10 mb-4 flex items-start justify-between gap-4">
                <h3 className="pt-2 text-[25px] font-bold leading-tight tracking-tight text-[#171717]">补充要求</h3>
                <button
                  onClick={() => setShowInputPopup(false)}
                  className="h-11 w-11 rounded-full bg-white/58 text-[#4B5563] flex items-center justify-center shadow-[0_8px_18px_rgba(23,23,23,0.08)] active:scale-95 transition-transform shrink-0 backdrop-blur-xl"
                  aria-label="关闭补充要求"
                >
                  <X size={24} strokeWidth={2.2} />
                </button>
              </div>

              <div className="relative z-10 mb-4 flex gap-3 rounded-[28px] border border-white/70 bg-white/58 p-3 shadow-[0_12px_32px_rgba(23,23,23,0.08)] backdrop-blur-xl">
                {currentImage ? (
                  <img src={currentImage} alt="thumb" className="h-14 w-14 rounded-2xl bg-gray-50 object-cover shadow-sm shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-[#E9F8EF]/70 border border-[#DDEFE4] text-[#3D8B5D] flex items-center justify-center shadow-sm shrink-0">
                    <Search size={23} strokeWidth={2} />
                  </div>
                )}
                <textarea
                  autoFocus
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="告诉 Findly 更多商品信息"
                  className="min-h-14 flex-1 resize-none bg-transparent py-1 text-[18px] leading-snug text-[#171717] outline-none placeholder:text-[#A0A8B5]"
                  rows={2}
                />
              </div>

              <div className="relative z-10 mb-4 grid grid-cols-2 gap-2">
                {['官方店', '预算 1.3w 内', '低价优先', '日常办公'].map(tag => {
                  const isSelected = chatInput.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleChipClick(tag)}
                      className={`h-8 rounded-full border px-3 text-[12px] font-semibold shadow-[0_5px_12px_rgba(23,23,23,0.07)] transition-all active:scale-95 ${
                        isSelected
                          ? 'border-[#9BE7B7] bg-[#E9F8EF]/90 text-[#3D8B5D]'
                          : 'border-white/70 bg-white/64 text-[#171717]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleChatSubmit}
                disabled={isRecommending || !chatInput.trim()}
                className={`relative z-10 mt-auto h-14 w-full rounded-full text-[18px] font-bold shadow-[0_14px_28px_rgba(23,23,23,0.10)] transition-all flex items-center justify-center gap-2 ${
                  isRecommending || !chatInput.trim()
                    ? 'bg-[#D6DCE5]/86 text-[#6B7280] shadow-none'
                    : 'bg-[#171717] text-white active:scale-[0.98]'
                }`}
              >
                {isRecommending && <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {isRecommending ? '正在更新推荐...' : '更新推荐'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

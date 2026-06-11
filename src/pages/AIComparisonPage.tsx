import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import type { AgentDiscussion, AgentMode, Product } from '../store';
import { AgentPill, FindlyMark, agentById } from '../components/Brand';
import { AgentDiscussionStack } from '../components/AgentWidgets';
import type { AgentDiscussionTurnItem } from '../components/AgentWidgets';

const COMPARE_DIMENSIONS = [
  { key: 'price', label: '到手价' },
  { key: 'platform', label: '平台来源' },
  { key: 'storeType', label: '店铺类型' },
  { key: 'shipping', label: '发货/配送' },
  { key: 'afterSales', label: '售后' },
  { key: 'sales', label: '销量样本' },
  { key: 'suitableFor', label: '适合人群' },
  { key: 'risks', label: '注意风险' }
];

interface CompareRow {
  productId: string;
  storeType?: string;
  shipping?: string;
  afterSales?: string;
  suitableFor?: string;
  risks?: string;
}

interface ComparisonDimensionValue {
  product_id: string;
  value: string;
}

interface ComparisonDimensionRow {
  dimension: string;
  values: ComparisonDimensionValue[];
}

interface SelectionAdvice {
  scenario: string;
  product_id: string;
  reason: string;
}

interface CompareResult {
  recommended_product_id?: string;
  conclusion?: string[];
  comparison_rows?: ComparisonDimensionRow[];
  selection_advice?: SelectionAdvice[];
  missing_information?: string[];
  summary: string;
  rows: CompareRow[];
  answer: string;
}

interface AskTurn {
  id: string;
  question: string;
  answer: string;
  status: 'thinking' | 'streaming' | 'done' | 'error';
  agentDiscussion?: AgentDiscussion | null;
  error?: string;
  requestToken?: string;
}

interface TurnStreamState {
  turnId: string;
  answerCharCount: number;
}

const AGENT_NAME_TO_ID = {
  比价军师: 'compare',
  省钱达人: 'saving',
  口碑探员: 'reputation',
  盯价哨兵: 'watch',
} as const;

function readCachedProducts(): Product[] {
  try {
    return JSON.parse(sessionStorage.getItem('searchProducts') || '[]');
  } catch {
    return [];
  }
}

export default function AIComparisonPage() {
  const navigate = useNavigate();
  const { selectedProductsForCompare, agentMode, setAgentMode, currentVisualProfile, preferences, addBotConversationHistory } = useAppStore();
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const [askTurns, setAskTurns] = useState<AskTurn[]>([]);
  const [expandedTurnIds, setExpandedTurnIds] = useState<Set<string>>(new Set());
  const [turnStream, setTurnStream] = useState<TurnStreamState | null>(null);
  const [thinkingAgentIndex, setThinkingAgentIndex] = useState(0);
  const compareProducts = useMemo(() => {
    if (selectedProductsForCompare.length > 0) return selectedProductsForCompare;
    return readCachedProducts().slice(0, 2);
  }, [selectedProductsForCompare]);

  const rowMap = useMemo(() => {
    const map = new Map<string, CompareRow>();
    compareResult?.rows.forEach((row) => {
      if (row.productId) map.set(row.productId, row);
    });
    return map;
  }, [compareResult]);

  const mapDiscussionTurns = (discussion?: AgentDiscussion | null): AgentDiscussionTurnItem[] => (
    discussion?.debate_turns?.map((turn) => ({
      agent: AGENT_NAME_TO_ID[turn.agent as keyof typeof AGENT_NAME_TO_ID] || 'compare',
      target: turn.target,
      message: turn.message,
    })) || []
  );

  const renderModeToggle = (turn?: AskTurn) => (
    <div className="flex h-7 shrink-0 items-center rounded-full border border-[#BFE7CF] bg-white/72 p-0.5 shadow-[0_6px_14px_rgba(75,170,114,0.08)]">
      {(['normal', 'discussion'] as const).map((mode) => {
        const isActive = agentMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeChange(mode, turn)}
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

  const finishTurn = (turnId: string, answer: string, agentDiscussion?: AgentDiscussion | null, requestToken?: string) => {
    setAskTurns((turns) => turns.map((turn) => {
      if (turn.id !== turnId) return turn;
      if (requestToken && turn.requestToken !== requestToken) return turn;
      return {
        ...turn,
        answer,
        agentDiscussion,
        status: answer ? 'streaming' : 'done',
        error: undefined,
      };
    }));
  };

  const failTurn = (turnId: string, message: string, requestToken?: string) => {
    setAskTurns((turns) => turns.map((turn) => {
      if (turn.id !== turnId) return turn;
      if (requestToken && turn.requestToken !== requestToken) return turn;
      return {
        ...turn,
        status: 'error',
        error: message,
      };
    }));
  };

  const toggleTurnExpanded = (turnId: string) => {
    setExpandedTurnIds((current) => {
      const next = new Set(current);
      if (next.has(turnId)) {
        next.delete(turnId);
      } else {
        next.add(turnId);
      }
      return next;
    });
  };

  useEffect(() => {
    const streamingTurn = askTurns.find((turn) => turn.status === 'streaming');
    if (!streamingTurn) {
      if (turnStream) setTurnStream(null);
      return;
    }
    if (turnStream?.turnId !== streamingTurn.id) {
      setTurnStream({
        turnId: streamingTurn.id,
        answerCharCount: 0,
      });
    }
  }, [askTurns, turnStream]);

  useEffect(() => {
    const hasThinkingTurn = askTurns.some((turn) => turn.status === 'thinking');
    if (!hasThinkingTurn) return;

    const timer = window.setInterval(() => {
      setThinkingAgentIndex((index) => (index + 1) % 4);
    }, 760);
    return () => window.clearInterval(timer);
  }, [askTurns]);

  useEffect(() => {
    if (!turnStream) return;

    const turn = askTurns.find((item) => item.id === turnStream.turnId);
    if (!turn || turn.status !== 'streaming') return;

    if (turnStream.answerCharCount < turn.answer.length) {
      const timer = window.setTimeout(() => {
        setTurnStream((state) => state && state.turnId === turn.id
          ? { ...state, answerCharCount: Math.min(turn.answer.length, state.answerCharCount + 4) }
          : state);
      }, 14);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setAskTurns((turns) => turns.map((item) => (
        item.id === turn.id ? { ...item, status: 'done' } : item
      )));
    }, 420);
    return () => window.clearTimeout(timer);
  }, [askTurns, turnStream]);

  const requestComparison = async (nextQuestion = '', mode: AgentMode = agentMode) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch('/api/compare-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          products: compareProducts,
          question: nextQuestion,
          collaborationMode: mode === 'discussion' ? 'debate' : 'quick',
          debateEnabled: mode === 'discussion',
          userIntent: mode === 'discussion' ? (nextQuestion ? 'tradeoff_question' : 'demo_showcase') : 'immediate_result',
          visualProfile: currentVisualProfile,
          userPreferences: preferences,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.details || data?.error || 'AI 对比生成失败');
      }
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('AI 对比请求超时，请稍后再试');
      }
      throw err;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const applyCompareData = (data: any) => {
    const conclusion = Array.isArray(data.conclusion) ? data.conclusion.filter(Boolean) : [];
    setCompareResult({
      recommended_product_id: data.recommended_product_id || '',
      conclusion,
      comparison_rows: Array.isArray(data.comparison_rows) ? data.comparison_rows : [],
      selection_advice: Array.isArray(data.selection_advice) ? data.selection_advice : [],
      missing_information: Array.isArray(data.missing_information) ? data.missing_information : [],
      summary: conclusion.length ? conclusion.join('') : data.summary || 'AI 已完成对比，请结合价格、平台、售后和风险一起判断。',
      rows: Array.isArray(data.rows) ? data.rows : [],
      answer: data.answer || '',
    });
  };

  const getFinalReplyText = (data: any, fallback: string) => (
    data?.agentDiscussion?.final_recommendation
    || data?.answer
    || data?.summary
    || fallback
  );

  const fetchComparison = async () => {
    if (compareProducts.length < 2) return;
    setError('');
    setIsLoading(true);
    try {
      const data = await requestComparison();
      applyCompareData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 对比生成失败');
    } finally {
      setIsLoading(false);
      setIsAsking(false);
    }
  };

  const regenerateTurnForMode = async (turn: AskTurn, mode: AgentMode) => {
    const requestToken = `${turn.id}-${mode}-${Date.now()}`;
    setError('');
    setIsAsking(true);
    setTurnStream(null);
    setAskTurns((turns) => turns.map((item) => (
      item.id === turn.id
        ? {
          ...item,
          answer: '',
          agentDiscussion: null,
          error: undefined,
          requestToken,
          status: 'thinking',
        }
        : item
    )));
    setExpandedTurnIds((current) => new Set(current).add(turn.id));

    try {
      const data = await requestComparison(turn.question, mode);
      applyCompareData(data);
      finishTurn(
        turn.id,
        getFinalReplyText(data, 'Findly 已按新模式重新生成最终总结，可以结合上方对比表继续判断。'),
        data.agentDiscussion || null,
        requestToken,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 对比生成失败';
      failTurn(turn.id, message, requestToken);
      setError(message);
    } finally {
      setIsAsking(false);
    }
  };

  const handleModeChange = (mode: AgentMode, turn?: AskTurn) => {
    if (mode === agentMode) return;
    setAgentMode(mode);
    if (turn && turn.question) {
      regenerateTurnForMode(turn, mode);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [compareProducts]);

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || isAsking) return;
    const nextQuestion = question.trim();
    const turnId = `${Date.now()}`;
    const requestMode = agentMode;
    const requestToken = `${turnId}-${requestMode}-${Date.now()}`;
    setQuestion('');
    setIsAsking(true);
    setError('');
    setAskTurns((turns) => [
      ...turns,
      {
        id: turnId,
        question: nextQuestion,
        answer: '',
        status: 'thinking',
        requestToken,
      },
    ]);
    setExpandedTurnIds((current) => new Set(current).add(turnId));

    try {
      const data = await requestComparison(nextQuestion, requestMode);
      applyCompareData(data);
      const finalReply = getFinalReplyText(data, 'Findly 已完成这次追问的最终总结，可以结合上方对比表继续判断。');
      finishTurn(
        turnId,
        finalReply,
        data.agentDiscussion || null,
        requestToken,
      );
      addBotConversationHistory({
        question: nextQuestion,
        answer: finalReply,
        mode: requestMode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 对比生成失败';
      failTurn(turnId, message, requestToken);
      setError(message);
    } finally {
      setIsAsking(false);
    }
  };

  if (compareProducts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-gray-500">未选择对比商品</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-900 text-white rounded-full">返回</button>
      </div>
    );
  }

  return (
    <div className="h-full findly-surface flex flex-col relative">
      {/* Header */}
      <div className="mt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+18px)] mx-8 h-12 px-3 grid grid-cols-[36px_1fr_36px] items-center bg-white/85 backdrop-blur-md shrink-0 z-20 border border-[#DDEFE4] rounded-3xl shadow-[0_8px_22px_rgba(23,23,23,0.06)]">
        <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-1 flex items-center justify-center text-gray-800 rounded-2xl active:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center justify-center gap-2">
          <FindlyMark className="w-7 h-7 shadow-[0_6px_14px_rgba(23,23,23,0.08)]" />
          <h1 className="text-base font-bold text-[#171717] tracking-tight">Findly 帮你对比</h1>
        </div>
        <div />
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(112px+var(--phone-safe-bottom,0px))]">
        {/* AI Summary */}
        <div className="p-4">
          <div className="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(23,23,23,0.06)] border border-[#DDEFE4]">
            <div className="flex items-center justify-between mb-3">
              <AgentPill agent={agentById.compare} label="AI 推荐理由" />
              <span className="text-[11px] text-gray-500">{compareProducts.length} 个方案</span>
            </div>
            {isLoading ? (
              <div className="space-y-2 py-1">
                <div className="h-3 w-5/6 rounded-full bg-[#E9F8EF] animate-pulse" />
                <div className="h-3 w-2/3 rounded-full bg-[#F0F5F2] animate-pulse" />
              </div>
            ) : (
              <div className="space-y-2">
                {(compareResult?.conclusion?.length ? compareResult.conclusion : [compareResult?.summary || '等待 AI 生成对比结论。']).map((line, index) => (
                  <p key={`${line}-${index}`} className="text-sm text-gray-600 leading-relaxed">{line}</p>
                ))}
                {compareResult?.selection_advice?.length ? (
                  <div className="rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] px-3 py-2 text-[11px] text-[#3D8B5D] space-y-1">
                    {compareResult.selection_advice.slice(0, 2).map((item) => (
                      <p key={`${item.scenario}-${item.product_id}`}><span className="font-bold">{item.scenario}：</span>{item.reason}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-3xl shadow-sm border border-[#DDEFE4] overflow-hidden flex">
            {/* Left Column (Labels) */}
            <div className="w-20 flex-shrink-0 bg-gray-50/50 border-r border-gray-100 flex flex-col">
              <div className="h-32 border-b border-gray-100"></div> {/* Empty space for headers */}
              {COMPARE_DIMENSIONS.map(dim => (
                <div key={dim.key} className="h-14 flex items-center justify-center text-xs text-gray-500 font-medium border-b border-gray-100 last:border-0">
                  {dim.label}
                </div>
              ))}
            </div>

            {/* Right Scrollable Columns */}
            <div className="flex-1 overflow-x-auto hide-scrollbar flex">
              {compareProducts.map((item, idx) => (
                <div key={item.id} className="w-32 flex-shrink-0 border-r border-gray-100 last:border-0 flex flex-col">
                  {/* Product Header */}
                  <div 
                    className="h-32 p-3 border-b border-gray-100 flex flex-col items-center justify-center gap-2 cursor-pointer active:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    <div className="relative">
                      <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#4BAA72] text-white rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-sm border-2 border-white">
                        {idx + 1}
                      </div>
                      <img src={item.image} alt="product" className="w-14 h-14 rounded-lg object-cover bg-gray-50" />
                    </div>
                    <p className="text-[10px] text-gray-600 line-clamp-2 text-center leading-tight">{item.title}</p>
                  </div>

                  {/* Dimension Values */}
                  {COMPARE_DIMENSIONS.map(dim => (
                    <div key={dim.key} className="h-14 p-2 flex items-center justify-center text-xs text-gray-900 border-b border-gray-100 last:border-0 text-center font-medium">
                      {dim.key === 'price' ? (
                        <span className="text-red-500">¥{item.price}</span>
                      ) : dim.key === 'platform' ? (
                        item.platform
                      ) : dim.key === 'sales' ? (
                        item.sales
                      ) : (
                        rowMap.get(item.id)?.[dim.key as keyof CompareRow] || ''
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Follow-up Chat */}
        <div className="px-4 pb-5">
          <div className="space-y-3">
            {askTurns.length === 0 ? (
              <div className="flex justify-start">
                <div className="max-w-[94%] rounded-[24px] rounded-tl-md border border-[#BFE7CF] bg-[#F2FBF5] px-4 py-3 shadow-[0_12px_26px_rgba(75,170,114,0.10)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#2F7D52]">
                      <Sparkles size={15} />
                      <span>继续追问</span>
                    </div>
                    {renderModeToggle()}
                  </div>
                  <p className="text-[13px] font-medium text-[#6A7B72] leading-relaxed">
                    继续补充预算、场景或平台偏好。
                  </p>
                </div>
              </div>
            ) : (
              askTurns.map((turn) => {
                const isExpanded = expandedTurnIds.has(turn.id);
                const discussionTurns = mapDiscussionTurns(turn.agentDiscussion);
                const streamState = turnStream?.turnId === turn.id ? turnStream : null;
                const shouldShowDiscussion = agentMode === 'discussion' && turn.status === 'done' && discussionTurns.length > 0;
                const thinkingAgents = [agentById.compare, agentById.saving, agentById.reputation, agentById.watch];
                const activeThinkingAgent = thinkingAgents[thinkingAgentIndex % thinkingAgents.length];
                const visibleAnswer = turn.status === 'streaming'
                  ? turn.answer.slice(0, streamState?.answerCharCount || 0)
                  : turn.answer;
                const isAnswerStreaming = turn.status === 'streaming';
                return (
                  <div key={turn.id} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-[24px] rounded-tr-md bg-[#2F7D52] px-4 py-3 text-sm leading-relaxed text-white shadow-[0_10px_24px_rgba(47,125,82,0.18)]">
                        {turn.question}
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="max-w-[94%] rounded-[24px] rounded-tl-md border border-[#BFE7CF] bg-[#F2FBF5] px-4 py-3 shadow-[0_12px_26px_rgba(75,170,114,0.10)]">
                        {turn.status === 'thinking' && (
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <FindlyMark className="h-5 w-5" />
                                <p className="whitespace-nowrap text-[11px] font-bold text-[#2F7D52]">
                                  {agentMode === 'discussion' ? 'Findly 正在组织讨论' : 'Findly 正在分析'}
                                </p>
                              </div>
                              {renderModeToggle(turn)}
                            </div>
                            {agentMode === 'discussion' ? (
                              <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#BFE7CF] bg-white/78 px-3 py-2">
                                <Loader2 size={15} className="shrink-0 animate-spin text-[#4BAA72]" />
                                <span className="text-[12px] font-bold text-[#2F7D52]">{activeThinkingAgent.name}</span>
                                <span className="min-w-0 flex-1 text-[12px] font-semibold text-[#6A7B72]">正在协同思考</span>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#BFE7CF] bg-white/78 px-3 py-2">
                                <Loader2 size={15} className="shrink-0 animate-spin text-[#4BAA72]" />
                                <span className="text-[12px] font-bold text-[#2F7D52]">快速分析中</span>
                                <span className="min-w-0 flex-1 text-[12px] font-semibold text-[#6A7B72]">正在整理最终总结</span>
                              </div>
                            )}
                          </div>
                        )}

                        {(turn.status === 'streaming' || turn.status === 'done') && (
                          <>
                            {(visibleAnswer || isAnswerStreaming || turn.status === 'done') && (
                              <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FindlyMark className="h-6 w-6" />
                                    <p className="text-[13px] font-bold text-[#2F7D52]">Findly 回复</p>
                                  </div>
                                  {renderModeToggle(turn)}
                                </div>
                                <p className="text-sm font-semibold leading-relaxed text-[#171717]">
                                  {visibleAnswer}
                                  {isAnswerStreaming && <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-full bg-[#4BAA72]" />}
                                </p>
                              </div>
                            )}
                            {shouldShowDiscussion && (
                              <div className="mt-3 border-t border-[#D7EBDD]">
                                <AgentDiscussionStack
                                  embedded
                                  items={discussionTurns}
                                  collapsed={!isExpanded}
                                  onToggle={() => toggleTurnExpanded(turn.id)}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {turn.status === 'error' && (
                          <p className="mt-3 text-sm text-red-500 leading-relaxed">
                            {turn.error || '这次追问生成失败，请稍后再试。'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chat Input */}
      <div className="absolute phone-bottom-panel p-2.5 bg-white/92 backdrop-blur-xl shadow-[0_18px_40px_rgba(23,23,23,0.12)] z-30 border border-[#DDEFE4]">
        <form onSubmit={handleAsk} className="h-12 rounded-[24px] border border-[#BFE7CF] bg-[#F2FBF5] px-2.5 flex items-center gap-2 shadow-[0_12px_26px_rgba(75,170,114,0.10)]">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-white/82 p-1 text-[#2F7D52]">
            <FindlyMark className="h-5 w-5" />
          </div>
          <input 
            type="text" 
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder=""
            className="flex-1 min-w-0 bg-transparent text-[14px] text-[#171717] outline-none placeholder:text-[#8FA39A]"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="h-8 w-8 rounded-full bg-[#4BAA72] text-white disabled:text-[#9AA6A0] disabled:bg-white/70 shrink-0 flex items-center justify-center shadow-[0_8px_18px_rgba(75,170,114,0.22)] disabled:shadow-none transition-colors"
            aria-label="发送"
          >
            {isAsking ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.8} />}
          </button>
        </form>
      </div>
    </div>
  );
}

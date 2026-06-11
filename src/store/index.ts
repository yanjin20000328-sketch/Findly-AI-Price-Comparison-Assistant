import { create } from 'zustand';

interface UserPreferences {
  gender: string;
  ageGroup: string;
  shoppingPref: string[];
  platforms: string[];
}

export interface VisualProfile {
  product_name: string;
  category: string;
  brand: string;
  model: string;
  attributes: string[];
  taobao_query: string;
  amazon_query: string;
  fallback_queries: string[];
  exclude_terms: string[];
  confidence: number;
}

export interface Product {
  id: string;
  title: string;
  specs: string;
  price: number;
  tags: string[];
  sales: string;
  platform: string;
  image: string;
  url?: string;
  source?: 'taobao' | 'amazon' | string;
  sourceQuery?: string;
  originalPrice?: number;
  shipping?: number;
  reason?: string;
  itemIdStr?: string;
  rawId?: string;
  price_history?: {
    date: string;
    label: string;
    price: number;
    event?: string;
  }[];
  review_comments?: {
    id: string;
    rating: number;
    sentiment: 'positive' | 'negative';
    tag: string;
    content: string;
    created_at: string;
  }[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: number;
}

export interface BotConversationHistoryItem {
  id: string;
  question: string;
  answer: string;
  mode: AgentMode;
  createdAt: number;
}

export interface AgentDiscussionBubble {
  agent: string;
  role: string;
  message: string;
}

export interface AgentDiscussionTurn {
  agent: string;
  stance: 'opening' | 'pushback' | 'risk_check' | 'timing_check' | 'synthesis' | string;
  target: string;
  message: string;
}

export interface AgentDiscussionModeSwitch {
  default_mode: 'quick';
  quick_label: string;
  debate_label: string;
  recommendation: string;
}

export interface AgentDecisionDimension {
  title: string;
  analysis?: string;
  conclusion?: string;
  evidence?: string[];
  watch_out?: string;
}

export interface AgentDecisionSummary {
  final_summary?: string;
  decision_dimensions?: AgentDecisionDimension[];
  agent_consensus?: string;
  key_disagreement?: string;
  buying_action?: string;
  risk_tips?: string[];
}

export interface AgentDiscussion {
  collaboration_mode?: 'quick' | 'debate';
  debate_enabled?: boolean;
  mode_switch?: AgentDiscussionModeSwitch;
  agent_bubble: AgentDiscussionBubble[];
  debate_turns?: AgentDiscussionTurn[];
  conflict_summary?: string;
  final_recommendation: string;
  normal_summary?: string;
  decision_summary?: AgentDecisionSummary | null;
  display_mode: 'top1_expand' | 'compare_followup';
}

export type AgentMode = 'discussion' | 'normal';

interface AppState {
  hasCompletedLanding: boolean;
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  completeLanding: () => void;

  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;
  
  currentImage: string | null;
  setCurrentImage: (image: string | null) => void;
  
  currentSearchQuery: string;
  setCurrentSearchQuery: (query: string) => void;

  searchHistory: SearchHistoryItem[];
  addSearchHistory: (query: string) => void;

  botConversationHistory: BotConversationHistoryItem[];
  addBotConversationHistory: (item: Omit<BotConversationHistoryItem, 'id' | 'createdAt'>) => void;

  currentVisualProfile: VisualProfile | null;
  setCurrentVisualProfile: (profile: VisualProfile | null) => void;

  searchProducts: Product[];
  searchResultQuery: string;
  setSearchProducts: (products: Product[], query?: string) => void;
  
  selectedProductsForCompare: Product[];
  toggleProductForCompare: (product: Product) => void;
  clearCompareSelection: () => void;

  aiReasoning: string | null;
  setAiReasoning: (reasoning: string | null) => void;

  top1AgentDiscussion: AgentDiscussion | null;
  setTop1AgentDiscussion: (discussion: AgentDiscussion | null) => void;

  favoriteProducts: Product[];
  toggleFavorite: (product: Product) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedLanding: false,
  agentMode: 'discussion',
  setAgentMode: (mode) => set({ agentMode: mode }),
  preferences: {
    gender: '',
    ageGroup: '',
    shoppingPref: [],
    platforms: [],
  },
  setPreferences: (prefs) => set((state) => ({
    preferences: { ...state.preferences, ...prefs }
  })),
  completeLanding: () => set({ hasCompletedLanding: true }),
  
  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),
  
  currentSearchQuery: '',
  setCurrentSearchQuery: (query) => set((state) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { currentSearchQuery: query };
    const nextHistory = [
      { id: `${Date.now()}`, query: normalizedQuery, createdAt: Date.now() },
      ...state.searchHistory.filter((item) => item.query !== normalizedQuery),
    ].slice(0, 8);
    return { currentSearchQuery: query, searchHistory: nextHistory };
  }),

  searchHistory: [],
  addSearchHistory: (query) => set((state) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return state;
    return {
      searchHistory: [
        { id: `${Date.now()}`, query: normalizedQuery, createdAt: Date.now() },
        ...state.searchHistory.filter((item) => item.query !== normalizedQuery),
      ].slice(0, 8),
    };
  }),

  botConversationHistory: [],
  addBotConversationHistory: (item) => set((state) => {
    const question = item.question.trim();
    const answer = item.answer.trim();
    if (!question) return state;
    const id = `${Date.now()}`;
    return {
      botConversationHistory: [
        { id, question, answer, mode: item.mode, createdAt: Date.now() },
        ...state.botConversationHistory.filter((historyItem) => historyItem.question !== question),
      ].slice(0, 8),
    };
  }),

  currentVisualProfile: null,
  setCurrentVisualProfile: (profile) => set({ currentVisualProfile: profile }),

  searchProducts: [],
  searchResultQuery: '',
  setSearchProducts: (products, query) => set((state) => {
    const normalizedQuery = query?.trim();
    const nextHistory = normalizedQuery
      ? [
          { id: `${Date.now()}`, query: normalizedQuery, createdAt: Date.now() },
          ...state.searchHistory.filter((item) => item.query !== normalizedQuery),
        ].slice(0, 8)
      : state.searchHistory;

    return {
      searchProducts: products,
      searchResultQuery: query ?? state.searchResultQuery,
      searchHistory: nextHistory,
    };
  }),
  
  selectedProductsForCompare: [],
  toggleProductForCompare: (product) => set((state) => {
    const exists = state.selectedProductsForCompare.find(p => p.id === product.id);
    if (exists) {
      return { selectedProductsForCompare: state.selectedProductsForCompare.filter(p => p.id !== product.id) };
    }
    if (state.selectedProductsForCompare.length >= 5) {
      return state; // Max 5
    }
    return { selectedProductsForCompare: [...state.selectedProductsForCompare, product] };
  }),
  clearCompareSelection: () => set({ selectedProductsForCompare: [] }),

  aiReasoning: null,
  setAiReasoning: (reasoning) => set({ aiReasoning: reasoning }),

  top1AgentDiscussion: null,
  setTop1AgentDiscussion: (discussion) => set({ top1AgentDiscussion: discussion }),

  favoriteProducts: [],
  toggleFavorite: (product) => set((state) => {
    const exists = state.favoriteProducts.find(p => p.id === product.id);
    if (exists) {
      return { favoriteProducts: state.favoriteProducts.filter(p => p.id !== product.id) };
    }
    return { favoriteProducts: [...state.favoriteProducts, product] };
  }),
}));

import { ChevronDown, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { AgentMode } from '../store';
import { AgentAvatar, AgentPill, agentById } from './Brand';

export interface AgentBubbleItem {
  agent: keyof typeof agentById;
  title?: string;
  message: string;
}

export interface AgentDiscussionTurnItem {
  agent: keyof typeof agentById;
  target?: string;
  message: string;
}

export function AgentModeSwitch({
  mode,
  onChange,
}: {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
}) {
  const isDiscussion = mode === 'discussion';

  return (
    <button
      type="button"
      onClick={() => onChange(isDiscussion ? 'normal' : 'discussion')}
      className="flex h-7 shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#7B8580] active:scale-95 transition-transform"
      aria-label={isDiscussion ? '当前讨论模式，点击切换到普通模式' : '当前普通模式，点击切换到讨论模式'}
    >
      <span>讨论模式</span>
      <span className={`relative inline-block h-5 w-9 shrink-0 overflow-hidden rounded-full border transition-colors ${
        isDiscussion ? 'border-[#B7DEC6] bg-[#CFEFDC]' : 'border-[#DDE3DF] bg-[#E9EEEB]'
      }`}>
        <span className={`absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(23,23,23,0.14)] transition-transform ${
          isDiscussion ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </span>
    </button>
  );
}

export function AgentModeChip({
  mode,
  onChange,
}: {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
}) {
  const isDiscussion = mode === 'discussion';

  return (
    <button
      type="button"
      onClick={() => onChange(isDiscussion ? 'normal' : 'discussion')}
      className={`h-8 shrink-0 rounded-full border px-3 text-[12px] font-bold transition-colors ${
        isDiscussion
          ? 'border-[#BFE7CF] bg-[#E9F8EF] text-[#2F7D52]'
          : 'border-[#E5E7EB] bg-[#F7FBF8] text-[#6B7280]'
      }`}
      aria-label={isDiscussion ? '当前讨论模式，点击切换到普通模式' : '当前普通模式，点击切换到讨论模式'}
    >
      {isDiscussion ? '讨论' : '普通'}
    </button>
  );
}

export function AgentBubble({ item }: { item: AgentBubbleItem }) {
  const agent = agentById[item.agent];
  return (
    <div className="flex gap-2.5 rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] p-2.5">
      <AgentAvatar agent={agent} className="w-9 h-9" />
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[#171717] leading-tight">{item.title || agent.name}</p>
        <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{item.message}</p>
      </div>
    </div>
  );
}

export function AgentDiscussionStack({
  items,
  conflictText,
  finalText,
  headerAction,
  onCollapse,
  collapsed,
  onToggle,
  activeIndex,
  activeText,
  embedded = false,
}: {
  items: AgentDiscussionTurnItem[];
  conflictText?: string;
  finalText?: string;
  headerAction?: ReactNode;
  onCollapse?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  activeIndex?: number;
  activeText?: string;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? 'pt-3' : 'rounded-[24px] border border-[#DDEFE4] bg-white/86 p-4 shadow-[0_10px_24px_rgba(23,23,23,0.04)]'}>
      <div className={`${collapsed ? '' : 'mb-4'} flex items-center gap-2`}>
        <Network size={17} className="text-[#3D8B5D]" />
        <p className="text-[14px] font-semibold text-[#171717]">{embedded ? '讨论过程' : '讨论模式'}</p>
        <div className="ml-auto flex items-center gap-2">
          {headerAction}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 active:bg-[#F7FBF8] active:scale-95 transition-transform"
              aria-label={collapsed ? '展开讨论模式' : '收起讨论模式'}
            >
              <ChevronDown size={15} className={collapsed ? '' : 'rotate-180'} />
            </button>
          ) : onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 active:bg-[#F7FBF8] active:scale-95 transition-transform"
              aria-label="收起讨论模式"
            >
              <ChevronDown size={15} className="rotate-180" />
            </button>
          ) : !embedded ? (
            <ChevronDown size={15} className="rotate-180 text-gray-400" />
          ) : null}
        </div>
      </div>
      {!collapsed && (
        <div>
          {conflictText && (
            <div className="mb-3 rounded-2xl border border-[#DDEFE4] bg-[#F7FBF8] px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#3D8B5D]">
              {conflictText}
            </div>
          )}
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const agent = agentById[item.agent];
              const message = index === activeIndex ? activeText || '' : item.message;
              return (
                <motion.div
                  key={`${item.agent}-${index}-${item.message}`}
                  className="flex gap-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <AgentAvatar agent={agent} className="mt-0.5 w-7 h-7" />
                  <div className="min-w-0 flex-1 rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-bold text-[#171717]">{agent.name}</p>
                    </div>
                    <p className="mt-1 text-[12px] text-[#6B7280] leading-relaxed">
                      {message}
                      {index === activeIndex && <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-full bg-[#4BAA72]" />}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {finalText && (
            <div className="mt-4 flex gap-2.5">
              <AgentAvatar agent={agentById.compare} className="mt-0.5 w-7 h-7" />
              <div className="min-w-0 flex-1 rounded-2xl bg-[#DFF3E7] border border-[#BFE7CF] px-3 py-2.5 text-[12px] text-[#2F7D52] leading-relaxed shadow-[0_8px_18px_rgba(75,170,114,0.10)]">
                <span className="font-semibold">最终总结：</span>{finalText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentBubbleStack({
  items,
  finalText,
  headerAction,
  onCollapse,
  collapsed,
  onToggle,
  embedded = false,
}: {
  items: AgentBubbleItem[];
  finalText?: string;
  headerAction?: ReactNode;
  onCollapse?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? 'pt-3' : 'rounded-[24px] border border-[#DDEFE4] bg-white/86 p-4 shadow-[0_10px_24px_rgba(23,23,23,0.04)]'}>
      <div className={`${collapsed ? '' : 'mb-4'} flex items-center gap-2`}>
        <Network size={17} className="text-[#3D8B5D]" />
        <p className="text-[14px] font-semibold text-[#171717]">{embedded ? 'Agent 建议' : '普通模式'}</p>
        <div className="ml-auto flex items-center gap-2">
          {headerAction}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 active:bg-[#F7FBF8] active:scale-95 transition-transform"
              aria-label={collapsed ? '展开普通模式' : '收起普通模式'}
            >
              <ChevronDown size={15} className={collapsed ? '' : 'rotate-180'} />
            </button>
          ) : onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 active:bg-[#F7FBF8] active:scale-95 transition-transform"
              aria-label="收起普通模式"
            >
              <ChevronDown size={15} className="rotate-180" />
            </button>
          ) : !embedded ? (
            <ChevronDown size={15} className="rotate-180 text-gray-400" />
          ) : null}
        </div>
      </div>
      {!collapsed && (
        <div>
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const agent = agentById[item.agent];
              return (
                <motion.div
                  key={`${item.agent}-${index}-${item.message}`}
                  className="flex gap-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                >
                  <AgentAvatar agent={agent} className="mt-0.5 w-7 h-7" />
                  <div className="min-w-0 flex-1 rounded-2xl bg-[#F7FBF8] border border-[#DDEFE4] px-3 py-2">
                    <p className="text-[11px] font-bold text-[#171717]">{agent.name}</p>
                    <p className="mt-1 text-[12px] text-[#6B7280] leading-relaxed">{item.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {finalText && (
            <div className="mt-4 flex gap-2.5">
              <AgentAvatar agent={agentById.compare} className="mt-0.5 w-7 h-7" />
              <div className="min-w-0 flex-1 rounded-2xl bg-[#DFF3E7] border border-[#BFE7CF] px-3 py-2.5 text-[12px] text-[#2F7D52] leading-relaxed shadow-[0_8px_18px_rgba(75,170,114,0.10)]">
                <span className="font-semibold">最终总结：</span>{finalText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CollapsedAgentTeaser({ label = 'Agent 讨论' }: { label?: string }) {
  return (
    <div className="mt-3 rounded-[22px] bg-white/86 border border-[#DDEFE4] px-3 py-3 shadow-[0_8px_20px_rgba(23,23,23,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Network size={16} className="text-[#3D8B5D] shrink-0" />
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-[#171717] truncate">{label}</span>
          </div>
        </div>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </div>
    </div>
  );
}

export function AgentCard({
  agent,
  title,
  body,
  children,
}: {
  agent: keyof typeof agentById;
  title?: string;
  body?: string;
  children?: ReactNode;
}) {
  const agentMeta = agentById[agent];
  return (
    <div className="rounded-3xl bg-white border border-[#DDEFE4] p-4 shadow-[0_10px_28px_rgba(23,23,23,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <AgentPill agent={agentMeta} />
      </div>
      {title && <h3 className="mt-3 text-[15px] font-bold text-[#171717] leading-snug">{title}</h3>}
      {body && <p className="mt-1.5 text-[12px] text-gray-500 leading-relaxed">{body}</p>}
      {children}
    </div>
  );
}

import { Search, Sparkles, Tags } from 'lucide-react';
import findlyLogo from '../assets/agents/findly-product-logo.png';
import compareLogo from '../assets/agents/agent-compare.png';
import savingLogo from '../assets/agents/agent-saving.png';
import watchLogo from '../assets/agents/agent-watch.png';
import reputationLogo from '../assets/agents/agent-reputation.png';

export function FindlyMark({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <img src={findlyLogo} alt="Findly AI" loading="eager" decoding="sync" draggable={false} className={`${className} rounded-full object-cover`} />
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <FindlyMark className={compact ? 'w-9 h-9' : 'w-12 h-12'} />
      <div className="leading-tight min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4BAA72]">Findly AI</p>
        {!compact && <h1 className="text-[21px] font-bold tracking-tight text-[#171717] whitespace-nowrap">拍一下，找到更值的</h1>}
      </div>
    </div>
  );
}

export const agents = [
  {
    id: 'compare',
    name: '比价军师',
    role: '价格与渠道',
    tone: '判断在哪里买更值',
    color: '#3D8B5D',
    bg: '#E9F8EF',
    logo: compareLogo,
  },
  {
    id: 'saving',
    name: '省钱达人',
    role: '优惠与买法',
    tone: '算清优惠和到手价',
    color: '#4BAA72',
    bg: '#E8FAF4',
    logo: savingLogo,
  },
  {
    id: 'watch',
    name: '盯价哨兵',
    role: '时机与提醒',
    tone: '跟进降价和新优惠',
    color: '#3D8B5D',
    bg: '#E9F8EF',
    logo: watchLogo,
  },
  {
    id: 'reputation',
    name: '口碑探员',
    role: '口碑与风险',
    tone: '看评价趋势和踩坑点',
    color: '#3D8B5D',
    bg: '#E9F8EF',
    logo: reputationLogo,
  },
];

export const agentById = {
  compare: agents[0],
  saving: agents[1],
  watch: agents[2],
  reputation: agents[3],
};

export function AgentAvatar({ agent = agents[0], className = 'w-8 h-8' }: { agent?: typeof agents[number], className?: string }) {
  return (
    <span className={`${className} rounded-full bg-white border border-[#DDEFE4] shadow-[0_6px_16px_rgba(23,23,23,0.08)] flex items-center justify-center overflow-hidden shrink-0`}>
      <img src={agent.logo} alt={agent.name} className="w-full h-full object-cover" />
    </span>
  );
}

export function AgentPill({ agent = agents[0], label }: { agent?: typeof agents[number], label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-[12px] font-semibold" style={{ backgroundColor: agent.bg, color: agent.color }}>
      <AgentAvatar agent={agent} className="w-6 h-6" />
      <span className="whitespace-nowrap">{label || agent.name}</span>
    </div>
  );
}

export function DecisionStep({ icon: Icon = Search, title, body }: { icon?: typeof Search, title: string, body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/80 p-3 border border-white/70 shadow-sm">
      <div className="w-9 h-9 rounded-2xl bg-[#E9F8EF] text-[#3D8B5D] flex items-center justify-center shrink-0 border border-[#DDEFE4]">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#171717]">{title}</p>
        <p className="text-[12px] text-gray-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export const decisionIcons = {
  search: Search,
  tags: Tags,
  sparkles: Sparkles,
};

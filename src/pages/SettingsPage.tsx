import { Bell, ShieldCheck, SlidersHorizontal } from 'lucide-react';

const settings = [
  { label: '推荐偏好', value: '跟随个人档案', icon: SlidersHorizontal },
  { label: '价格提醒', value: '收藏商品降价时提醒', icon: Bell },
  { label: '隐私与安全', value: '本地 demo 数据保护', icon: ShieldCheck },
];

export default function SettingsPage() {
  return (
    <div className="min-h-full overflow-y-auto hide-scrollbar p-6 pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+78px)] findly-surface">
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">设置</h1>
      </div>

      <div className="mt-5 space-y-3">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full findly-card rounded-3xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#E9F8EF] text-[#4BAA72] flex items-center justify-center">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#171717]">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">{item.value}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

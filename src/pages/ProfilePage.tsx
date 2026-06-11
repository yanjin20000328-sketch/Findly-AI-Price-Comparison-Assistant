import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../store';
import { AgentPill, agents } from '../components/Brand';

const GENDER_OPTIONS = ['男生', '女生', '先保密'];
const AGE_OPTIONS = ['18岁以下', '18-24', '25-34', '35岁以上'];
const PREF_OPTIONS = ['更便宜', '官方店', '发货快', '售后稳', '口碑好'];
const PLATFORM_OPTIONS = ['京东', '淘宝天猫', '拼多多', '抖音', '其他'];

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function PreferenceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[#DDEFE4] bg-[#F7FBF8] p-3">
      <h3 className="mb-2 text-[12px] font-black text-[#17251D]">{title}</h3>
      {children}
    </section>
  );
}

function PreferenceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  const className = selected
    ? 'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors border-[#9FD9B5] bg-[#E9F8EF] text-[#2F7D52]'
    : 'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors border-white bg-white text-[#17251D]/62';

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export default function ProfilePage() {
  const { preferences, setPreferences } = useAppStore();
  const [gender, setGender] = useState(preferences.gender);
  const [ageGroup, setAgeGroup] = useState(preferences.ageGroup);
  const [shoppingPref, setShoppingPref] = useState<string[]>(preferences.shoppingPref);
  const [platforms, setPlatforms] = useState<string[]>(preferences.platforms);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGender(preferences.gender);
    setAgeGroup(preferences.ageGroup);
    setShoppingPref(preferences.shoppingPref);
    setPlatforms(preferences.platforms);
  }, [preferences]);

  const handleSave = () => {
    setPreferences({ gender, ageGroup, shoppingPref, platforms });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar p-6 pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+78px)] findly-surface">
      <AgentPill agent={agents[0]} label="我的 Findly 档案" />

      <div className="mt-3 space-y-3 rounded-3xl border border-[#DDEFE4] bg-white p-4 shadow-sm">
        <PreferenceSection title="怎么称呼你">
          <div className="flex flex-wrap gap-1.5">
            {GENDER_OPTIONS.map((item) => (
              <PreferenceChip key={item} selected={gender === item} onClick={() => setGender(item)}>
                {item}
              </PreferenceChip>
            ))}
          </div>
        </PreferenceSection>

        <PreferenceSection title="年龄段">
          <div className="flex flex-wrap gap-1.5">
            {AGE_OPTIONS.map((item) => (
              <PreferenceChip key={item} selected={ageGroup === item} onClick={() => setAgeGroup(item)}>
                {item}
              </PreferenceChip>
            ))}
          </div>
        </PreferenceSection>

        <PreferenceSection title="购物时最在意">
          <div className="flex flex-wrap gap-1.5">
            {PREF_OPTIONS.map((item) => (
              <PreferenceChip key={item} selected={shoppingPref.includes(item)} onClick={() => setShoppingPref((values) => toggleArrayValue(values, item))}>
                {item}
              </PreferenceChip>
            ))}
          </div>
        </PreferenceSection>

        <PreferenceSection title="常逛平台">
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map((item) => (
              <PreferenceChip key={item} selected={platforms.includes(item)} onClick={() => setPlatforms((values) => toggleArrayValue(values, item))}>
                {item}
              </PreferenceChip>
            ))}
          </div>
        </PreferenceSection>

        <button
          type="button"
          onClick={handleSave}
          className="h-12 w-full rounded-full bg-[#171717] text-sm font-bold text-white active:scale-[0.99] transition-transform"
        >
          {saved ? '已保存' : '保存档案'}
        </button>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import type { Dispatch, PointerEvent, ReactNode, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { agents } from '../components/Brand';
import { FindlyMark, agentById } from '../components/Brand';

type AgentMeta = typeof agents[number];

type LandingSlide =
  | {
      type: 'brand';
      title: string;
      subtitle: string;
      flourish: string;
    }
  | {
      type: 'agent';
      agent: AgentMeta;
      title: string;
      subtitle: string;
      flourish: string;
    };

const LANDING_SLIDES: LandingSlide[] = [
  {
    type: 'brand',
    title: '拍一下，找到更值得',
    subtitle: '',
    flourish: 'Worth It',
  },
  {
    type: 'agent',
    agent: agentById.compare,
    title: '比价军师',
    subtitle: '哪里更值，我举小旗告诉你。',
    flourish: 'Compare',
  },
  {
    type: 'agent',
    agent: agentById.saving,
    title: '省钱达人',
    subtitle: '券券我来翻，到手价压低低。',
    flourish: 'Save More',
  },
  {
    type: 'agent',
    agent: agentById.reputation,
    title: '口碑探员',
    subtitle: '评论区我先潜入，坑坑不放过。',
    flourish: 'Review',
  },
  {
    type: 'agent',
    agent: agentById.watch,
    title: '盯价哨兵',
    subtitle: '价格我来盯，降了马上叫你。',
    flourish: 'Watch',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { setPreferences, completeLanding } = useAppStore();
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
  });

  const [showPreferences, setShowPreferences] = useState(false);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);

  const handleComplete = () => {
    setPreferences({ gender, ageGroup: age, shoppingPref: prefs, platforms });
    completeLanding();
    navigate('/main');
  };

  const handleSkip = () => {
    if (showPreferences) {
      completeLanding();
      navigate('/main/home', { state: { skippedPreferences: true } });
      return;
    }

    setShowPreferences(true);
    setDragOffset(0);
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const toggleArray = (
    arr: string[],
    setArr: Dispatch<SetStateAction<string[]>>,
    val: string,
  ) => {
    if (arr.includes(val)) {
      setArr(arr.filter((item) => item !== val));
    } else {
      setArr([...arr, val]);
    }
  };

  const goToSlide = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), LANDING_SLIDES.length - 1));
    setDragOffset(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
    };
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const nextOffset = event.clientX - dragStateRef.current.startX;
    setDragOffset(Math.max(-90, Math.min(90, nextOffset)));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    dragStateRef.current.isDragging = false;
    const deltaX = event.clientX - dragStateRef.current.startX;
    if (deltaX < -48) {
      goToSlide(activeIndex + 1);
    } else if (deltaX > 48) {
      goToSlide(activeIndex - 1);
    } else {
      setDragOffset(0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#EEF7F1]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(198,226,208,0.42),transparent_38%),linear-gradient(180deg,#EEF7F1_0%,#F7FBF8_58%,#D8F3E3_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_center,rgba(125,211,160,0.18),transparent_64%)] blur-xl" />

      <header className="absolute left-6 right-6 top-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+18px)] z-20 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (showPreferences) {
              setShowPreferences(false);
              return;
            }
            goToSlide(0);
          }}
          className="flex items-center gap-2 active:scale-[0.98] transition-transform"
        >
          <FindlyMark className="h-8 w-8 shadow-[0_7px_16px_rgba(23,23,23,0.08)]" />
          <span className="font-black italic tracking-[-0.04em] text-[#17251D] text-[22px] drop-shadow-[0_3px_0_rgba(198,226,208,0.74)]">
            Findly
          </span>
        </button>
        <button
          onClick={handleSkip}
          className="h-8 rounded-full bg-white/54 px-3 text-[12px] font-black italic text-[#3D8B5D] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75)] active:scale-95 transition-transform"
        >
          跳过
        </button>
      </header>

      {showPreferences ? (
        <PreferencePanel
          gender={gender}
          setGender={setGender}
          age={age}
          setAge={setAge}
          prefs={prefs}
          setPrefs={setPrefs}
          platforms={platforms}
          setPlatforms={setPlatforms}
          toggleArray={toggleArray}
          onBack={() => setShowPreferences(false)}
          onComplete={handleComplete}
        />
      ) : (
      <main className="relative z-10 h-full overflow-hidden">
        <div
          className="h-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
            style={{
              transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
            }}
          >
            {LANDING_SLIDES.map((slide, index) => (
              <LandingPanel
                key={slide.type === 'brand' ? 'brand' : slide.agent.id}
                slide={slide}
                isActive={activeIndex === index}
              />
            ))}
          </div>
        </div>

        <div
          className="absolute inset-x-0 bottom-[calc(var(--phone-safe-bottom,0px)+30px)] z-20 flex flex-col items-center gap-4"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1.5">
            {LANDING_SLIDES.map((slide, index) => (
              <button
                key={`${slide.type}-${index}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToSlide(index);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index ? 'w-5 bg-[#111]' : 'w-1.5 bg-[#111]/18'
                }`}
                aria-label={`切换到第 ${index + 1} 页`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (activeIndex === LANDING_SLIDES.length - 1) {
                setShowPreferences(true);
                return;
              }
              goToSlide(activeIndex + 1);
            }}
            className="h-11 rounded-full bg-[#111] px-7 text-[14px] font-black text-white shadow-[0_14px_28px_rgba(23,23,23,0.16)] active:scale-[0.98] transition-transform"
          >
            {activeIndex === LANDING_SLIDES.length - 1 ? '开始体验' : '继续'}
          </button>
        </div>
      </main>
      )}
    </div>
  );
}

function LandingPanel({ slide, isActive }: { slide: LandingSlide, isActive: boolean }) {
  return (
    <section className="relative flex h-full min-w-full flex-col items-center justify-between px-7 pb-[calc(var(--phone-safe-bottom,0px)+104px)] pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+86px)]">
      <div className="pointer-events-none absolute left-9 right-9 top-[34%] h-[54px] opacity-20">
        <div className="flex h-full items-center justify-between">
          {Array.from({ length: 22 }).map((_, index) => (
            <span
              key={index}
              className="w-1 rounded-full bg-[#9FCDB0]"
              style={{ height: `${10 + ((index * 7) % 34)}px` }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <div className={`relative transition-all duration-700 ease-out ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-70'}`}>
          <div className="absolute inset-6 rounded-[42px] bg-[#7DCFA0]/18 blur-3xl" />
          {slide.type === 'brand' ? (
            <div className="relative flex h-56 w-56 items-center justify-center animate-[landingFloat_4.8s_ease-in-out_infinite]">
              <FindlyMark className="relative h-36 w-36 drop-shadow-[0_18px_34px_rgba(75,170,114,0.18)]" />
              <span className="absolute -right-2 top-8 rounded-[18px] bg-white/76 px-4 py-2 text-[24px] font-black italic text-[#3D8B5D] shadow-[0_10px_22px_rgba(61,139,93,0.12)]">Hi</span>
            </div>
          ) : (
            <div className="relative flex h-56 w-56 items-center justify-center animate-[landingFloat_4.8s_ease-in-out_infinite]">
              <div className="absolute -inset-2 rounded-[58px] bg-[radial-gradient(circle_at_50%_50%,rgba(125,207,160,0.20),transparent_64%)] blur-xl" />
              <img
                src={slide.agent.logo}
                alt={slide.agent.name}
                loading="eager"
                decoding="sync"
                draggable={false}
                className="relative h-44 w-44 rounded-full object-cover drop-shadow-[0_20px_32px_rgba(61,139,93,0.14)]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 text-center">
        <p className="mb-3 text-[18px] font-black italic tracking-[-0.03em] text-[#3D8B5D]">{slide.flourish}</p>
        <h2 className="text-[30px] font-black italic leading-tight tracking-[-0.045em] text-[#17251D]">
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="mx-auto mt-4 whitespace-nowrap text-[14px] font-semibold leading-none text-[#17251D]/72">
            {slide.subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

function PreferencePanel({
  gender,
  setGender,
  age,
  setAge,
  prefs,
  setPrefs,
  platforms,
  setPlatforms,
  toggleArray,
  onBack,
  onComplete,
}: {
  gender: string;
  setGender: Dispatch<SetStateAction<string>>;
  age: string;
  setAge: Dispatch<SetStateAction<string>>;
  prefs: string[];
  setPrefs: Dispatch<SetStateAction<string[]>>;
  platforms: string[];
  setPlatforms: Dispatch<SetStateAction<string[]>>;
  toggleArray: (arr: string[], setArr: Dispatch<SetStateAction<string[]>>, val: string) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <main className="relative z-10 h-full overflow-y-auto hide-scrollbar px-6 pb-[calc(var(--phone-safe-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top)+var(--phone-safe-top,0px)+86px)]">
      <div className="animate-[landingRise_0.32s_ease-out_both]">
        <div className="mb-6">
          <p className="text-[13px] font-black italic tracking-[-0.03em] text-[#3D8B5D]">Your Taste</p>
          <h2 className="mt-1 text-[28px] font-black italic tracking-[-0.045em] text-[#17251D]">先认识一下你</h2>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#17251D]/62">
            选几项偏好，Findly 会更懂你买东西的小脾气。
          </p>
        </div>

        <div className="space-y-6">
          <PreferenceSection title="怎么称呼你">
            <div className="flex flex-wrap gap-2.5">
              {['男生', '女生', '先保密'].map((item) => (
                <PreferenceChip key={item} selected={gender === item} onClick={() => setGender(item)}>
                  {item}
                </PreferenceChip>
              ))}
            </div>
          </PreferenceSection>

          <PreferenceSection title="年龄段">
            <div className="flex flex-wrap gap-2.5">
              {['18岁以下', '18-24', '25-34', '35岁以上'].map((item) => (
                <PreferenceChip key={item} selected={age === item} onClick={() => setAge(item)}>
                  {item}
                </PreferenceChip>
              ))}
            </div>
          </PreferenceSection>

          <PreferenceSection title="购物时最在意">
            <div className="flex flex-wrap gap-2.5">
              {['更便宜', '官方店', '发货快', '售后稳', '口碑好'].map((item) => (
                <PreferenceChip key={item} selected={prefs.includes(item)} onClick={() => toggleArray(prefs, setPrefs, item)}>
                  {item}
                </PreferenceChip>
              ))}
            </div>
          </PreferenceSection>

          <PreferenceSection title="常逛平台">
            <div className="flex flex-wrap gap-2.5">
              {['京东', '淘宝天猫', '拼多多', '抖音', '其他'].map((item) => (
                <PreferenceChip key={item} selected={platforms.includes(item)} onClick={() => toggleArray(platforms, setPlatforms, item)}>
                  {item}
                </PreferenceChip>
              ))}
            </div>
          </PreferenceSection>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto] gap-2.5">
          <button
            type="button"
            onClick={onComplete}
            className="h-12 rounded-full bg-[#111] px-5 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(23,23,23,0.16)] active:scale-[0.98] transition-transform"
          >
            开始使用 Findly
          </button>
          <button
            type="button"
            onClick={onBack}
            className="h-12 rounded-full bg-white/62 px-4 text-[13px] font-bold text-[#3D8B5D] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.78)] active:scale-95 transition-transform"
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}

function PreferenceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-white/70 bg-white/52 p-4 shadow-[0_16px_34px_rgba(61,139,93,0.08)] backdrop-blur-xl">
      <h3 className="mb-3 text-[13px] font-black text-[#17251D]">{title}</h3>
      {children}
    </section>
  );
}

function PreferenceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
        selected
          ? 'border-[#9FD9B5] bg-[#E9F8EF] text-[#2F7D52]'
          : 'border-white/76 bg-white/58 text-[#17251D]/62'
      }`}
    >
      {children}
    </button>
  );
}

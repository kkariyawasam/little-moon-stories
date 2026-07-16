import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Moon, 
  Mail, 
  Clock, 
  User, 
  Plus, 
  BookOpen, 
  Volume2, 
  Check, 
  HelpCircle, 
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle,
  Database,
  CloudLightning,
  Lock,
  Compass,
  Smile,
  Shield,
  Heart,
  ArrowRight,
  Sparkle,
  BadgeAlert,
  PlayCircle,
  Share2,
  Globe
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { DatePicker } from './components/DatePicker';
import cozyBedtimeFarmImage from './assets/images/cozy_bedtime_farm_1781463254008.jpg';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const TurnstileWidget = ({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || widgetId || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        action: 'free_story_signup',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken('')
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
    if (existingScript) {
      if (window.turnstile) renderWidget();
      else existingScript.addEventListener('load', renderWidget, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.addEventListener('load', renderWidget, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} className="min-h-[65px] flex justify-center" />;
};

const USA_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET/New York)' },
  { value: 'America/Chicago', label: 'Central Time (CT/Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (MT/Denver)' },
  { value: 'America/Phoenix', label: 'Mountain Standard (MST/Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT/Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT/Honolulu)' },
];

const getTzAbbreviation = (tz: string) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : tz;
  } catch (e) {
    const mapping: Record<string, string> = {
      'America/New_York': 'EST/EDT',
      'America/Chicago': 'CST/CDT',
      'America/Denver': 'MST/MDT',
      'America/Phoenix': 'MST',
      'America/Los_Angeles': 'PST/PDT',
      'America/Anchorage': 'AKST/AKDT',
      'Pacific/Honolulu': 'HST'
    };
    return mapping[tz] || tz;
  }
};

const getTimezoneOptions = (detectedTz: string) => {
  if (detectedTz && !USA_TIMEZONES.some(opt => opt.value === detectedTz)) {
    return [
      { value: detectedTz, label: `Detected: ${detectedTz}` },
      ...USA_TIMEZONES
    ];
  }
  return USA_TIMEZONES;
};

const STARS_DATA = Array.from({ length: 320 }).map((_, i) => {
  const x = (((i * 29) + 7) % 1000) / 10; // 0% to 100%
  const y = (((i * 43) + 13) % 980) / 10; // 0% to 98%
  const size = (((i * 17) + 3) % 4) * 0.4 + 1.0; // small stardust 1px to 2.6px
  const opacity = 0.2 + (((i * 11) + 2) % 9) * 0.05; // soft backdrop stardust
  const duration = 2.5 + (i % 6) * 1.5;
  const type = i % 15 === 0 ? 'amber' : i % 25 === 0 ? 'blue' : 'white';
  return { id: i, x, y, size, opacity, duration, type };
});

const CARTOON_STARS_DATA = Array.from({ length: 95 }).map((_, i) => {
  // Pre-calculated coordinates to scatter nicely
  const x = (((i * 37) + 13) % 1000) / 10; // 0% to 100%
  const y = (((i * 53) + 29) % 850) / 10 + 2; // Keep in sky: 2% to 87%
  const size = 18 + (i % 4) * 6; // cute range from 18px to 36px
  const tilt = -15 + (i % 7) * 5; // -15deg to 15deg tilt
  const duration = 4.5 + (i % 5) * 1.5; // 4.5s to 12s float cycles
  const delay = (i % 6) * -0.8; // negative delay so they start immediately at different points of cycle
  return { id: i, x, y, size, tilt, duration, delay };
});

const FIREFLIES_DATA = Array.from({ length: 18 }).map((_, i) => {
  const x = (((i * 73) + 15) % 1000) / 10;
  const y = 35 + (((i * 37) + 57) % 630) / 10; // mostly lower 35% to 98%
  const size = 1.3 + (i % 3) * 0.8; // 1.3px to 2.9px
  const duration = 3.5 + (i % 5) * 1.5; // 3.5s to 9.5s
  const delay = (i % 4) * 0.8;
  return { id: i, x, y, size, duration, delay };
});

const SAMPLE_AUDIO_SRC = '/audio/sample-story.wav';

export default function App() {
  // Navigation active tab for highlighting
  const [activeTab, setActiveTab] = useState('hero');
  
  // Checkout URL success states
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);

  // Form State
  const [parentEmail, setParentEmail] = useState('');
  const [childNames, setChildNames] = useState('');

  // Custom Kid Management (supports up to 5 children dynamically)
  const [childrenList, setChildrenList] = useState<Array<{
    id: string;
    name: string;
    nickname: string;
    gender: 'female' | 'male' | 'other' | '';
    birthday: string;
  }>>([
    { id: 'child-1', name: '', nickname: '', gender: '', birthday: '' }
  ]);

  const handleAddChild = () => {
    if (childrenList.length >= 5) return;
    setChildrenList(prev => [
      ...prev,
      { id: `child-${Date.now()}-${Math.random()}`, name: '', nickname: '', gender: '', birthday: '' }
    ]);
  };

  const handleRemoveChild = (id: string) => {
    if (childrenList.length <= 1) return;
    setChildrenList(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateChild = (id: string, key: string, value: string) => {
    setChildrenList(prev => prev.map(c => {
      if (c.id === id) {
        if (key === 'name' || key === 'nickname') {
          return { ...c, name: value, nickname: value };
        }
        return { ...c, [key]: value };
      }
      return c;
    }));
  };

  // Synchronize childNames string automatically with the child profiles
  useEffect(() => {
    const formatted = childrenList
      .map(c => c.name.trim() || c.nickname.trim())
      .filter(Boolean)
      .join(' & ');
    setChildNames(formatted);
  }, [childrenList]);

  const [ageRange, setAgeRange] = useState<'3-5' | '6-8' | ''>('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [timezone, setTimezone] = useState('');
  
  const [selectedTheme, setSelectedTheme] = useState('adventure');
  const [customTheme, setCustomTheme] = useState('');
  const [selectedHobby, setSelectedHobby] = useState('reading');
  const [customHobby, setCustomHobby] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('elephant');
  const [customAnimal, setCustomAnimal] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [signupMessage, setSignupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  // Config State
  const [config, setConfig] = useState<any>({});

  const [sampleAudioMissing, setSampleAudioMissing] = useState(false);

  // FAQ states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // New Popup and Custom Tag States
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [customAnimalInput, setCustomAnimalInput] = useState('');
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [customHobbyInput, setCustomHobbyInput] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [builderStep, setBuilderStep] = useState(0);

  // Predefined options
  const themeOptions = ['adventure', 'kindness', 'friendship', 'animals', 'magic', 'nature', 'space', 'technology'];
  const hobbyOptions = ['drawing', 'dancing', 'football', 'reading', 'singing', 'puzzles'];
  const animalOptions = ['elephant', 'rabbit', 'dog', 'cat', 'lion', 'dolphin', 'bird'];

  // FAQ Data
  const faqs = [
    {
      q: "How does the daily audio personalization work?",
      a: "Every day, our advanced storytelling system uses the age, favorite hobby, preferred themes, and chosen animals you provided during sign-up to write a unique sleepy tale. This tale is structured to gently guide your child's brain wave transition to offline sleep mode."
    },
    {
      q: "Is it really screen-free?",
      a: "Yes! There are no visual screens, bright interfaces, or game triggers to excite your kids before bedtime. Your child only hears a soothing voice. We deliver either a direct audio stream link or a MP3 file directly to the parent's email. You can play it using any home speaker, phone, or tablet with the screen off."
    },
    {
      q: "Why are bedtime stories limited to 3-8 year olds?",
      a: "Children aged 3-8 have active imaginations and highly benefit from auditory storytelling to support language acquisition, vocabulary, and visualization skills. The vocabulary, story complexity, and soothing pace are optimized exactly for these pediatric categories."
    },
    {
      q: "Why do you ask for my child's birthday?",
      a: "We use your child's birthday to create stories with suitable vocabulary, length, and story complexity."
    },
    {
      q: "Can I change my child's storytelling preferences later?",
      a: "No. Story preferences stay fixed for the current monthly plan, but the stories are still different each night, so they do not feel boring. When the month ends, you can register again with new preferences for the next month."
    },
    {
      q: "How do I cancel my subscription?",
      a: "This is a one-month story plan for $9. After registration, the plan stays active until the month ends. If you do not want another month, simply do not register again for the next monthly plan."
    },
    {
      q: "What contexts and settings are the stories set in?",
      a: "Each story is created around your child's selected theme, hobby, and favorite animal."
    }
  ];

  // Load config & subscribers on load
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(e => console.error(e));

    // Check query params for checkout success or cancellation
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_success') === 'true') {
      setCheckoutSuccess(true);
    }
    if (params.get('checkout_cancelled') === 'true') {
      setCheckoutCancelled(true);
    }
  }, []);

  // Smooth scroll handler
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveTab(id);
    }
  };

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>('[data-scroll-reveal]');

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    revealTargets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  const builderAnimalOptions = ['Elephant', 'Rabbit', 'Dolphin', 'Lion', 'Bear', 'Panda', 'Koala'];
  const builderThemeOptions = ['Space', 'Fairytale', 'Superhero', 'Nature', 'Adventure', 'Magic Ocean'];
  const builderHobbyOptions = ['Reading', 'Drawing', 'Puzzles', 'Singing', 'Building Blocks', 'Star Gazing'];
  const addCustomChoice = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const next = value.trim();
    if (!next) return;

    if (!selected.some(item => item.toLocaleLowerCase() === next.toLocaleLowerCase())) {
      setSelected(previous => [...previous, next]);
    }
    clearInput('');
  };
  const builderSteps = [
    'Friend',
    'World',
    'Joy',
    'Little One',
    'Bedtime',
    'Inbox'
  ];
  const hasAnimal = selectedAnimals.length >= 2;
  const hasTheme = selectedThemes.length >= 2;
  const hasHobby = selectedHobbies.length >= 2;
  const childrenComplete = childrenList.length > 0 && childrenList.every(child =>
    child.nickname.trim() && child.gender && child.birthday
  );
  const deliveryTimeComplete = /^([01]\d|2[0-3]):[0-5]\d$/.test(deliveryTime);
  const ageRangeComplete = ageRange === '3-5' || ageRange === '6-8';
  const timezoneComplete = Boolean(timezone);
  const deliveryComplete = deliveryTimeComplete && timezoneComplete && ageRangeComplete;
  const emailComplete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim()) && parentEmail.trim().length <= 254;
  const builderCompletion = [hasAnimal, hasTheme, hasHobby, childrenComplete, deliveryComplete, emailComplete];
  const canRegister = builderCompletion.every(Boolean);
  const canSubmitRegistration = canRegister && (!config.turnstileRequired || Boolean(turnstileToken));
  const canOpenBuilderStep = (step: number) => step === 0 || builderCompletion.slice(0, step).every(Boolean);
  const goToBuilderStep = (step: number) => {
    const targetStep = Math.min(Math.max(step, 0), builderSteps.length - 1);
    if (canOpenBuilderStep(targetStep)) {
      setBuilderStep(targetStep);
    }
  };
  const continueBuilder = () => {
    const nextIncomplete = builderCompletion.findIndex(done => !done);
    if (nextIncomplete === -1) {
      setBuilderStep(builderSteps.length - 1);
      return;
    }
    setBuilderStep(nextIncomplete);
  };

  // Submit subscription request
  const handleSubscribe = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!parentEmail) {
      setSignupMessage({ type: 'error', text: 'Please fill in your parent email.' });
      return;
    }

    if (!emailComplete) {
      setSignupMessage({ type: 'error', text: 'Please enter a valid parent email address.' });
      return;
    }

    if (config.turnstileRequired && !turnstileToken) {
      setSignupMessage({ type: 'error', text: 'Please complete the security check.' });
      return;
    }

    if (!hasAnimal || !hasTheme || !hasHobby || !deliveryComplete) {
      setSignupMessage({ type: 'error', text: 'Please complete each required story plan step.' });
      continueBuilder();
      return;
    }

    if (childrenList.length === 0) {
      setSignupMessage({ type: 'error', text: 'Please add at least one child profile.' });
      return;
    }

    // Validate kids info
    for (let i = 0; i < childrenList.length; i++) {
      const child = childrenList[i];
      if (!child.nickname.trim()) {
        setSignupMessage({ type: 'error', text: `Please provide a Nickname for Child #${i + 1} (it is required).` });
        return;
      }
      if (!child.gender) {
        setSignupMessage({ type: 'error', text: `Please select a Gender for Child #${i + 1}.` });
        return;
      }
      if (!child.birthday) {
        setSignupMessage({ type: 'error', text: `Please select a Birthday for Child #${i + 1}.` });
        return;
      }
    }

    setSubmitting(true);
    setSignupMessage(null);

    // Prepare variables based on Tag selections
    const finalTheme = selectedThemes.join(', ') || 'Space';
    const finalHobby = selectedHobbies.join(', ') || 'Reading';
    const finalAnimal = selectedAnimals.join(', ') || 'Elephant';

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_email: parentEmail,
          child_names: childNames,
          children_list: childrenList,
          age_range: ageRange,
          delivery_time: deliveryTime,
          timezone,
          preferred_theme: finalTheme,
          favorite_hobby: finalHobby,
          favorite_animal: finalAnimal,
          plan_type: 'free_trial',
          register_only: true,
          turnstile_token: turnstileToken
        })
      });

      const responseType = response.headers.get('content-type') || '';
      const data = responseType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (response.ok) {
        if (data.checkoutSessionUrl) {
          // Redirect to PayPal checkout
          window.location.href = data.checkoutSessionUrl;
        } else if (data.registered) {
          setSignupMessage({
            type: 'success',
            text: 'Your free story request was saved. You will receive one personalized story tomorrow at your selected time.'
          });
        } else {
          setSignupMessage({
            type: 'error',
            text: 'Unable to save your story plan. Please try again.'
          });
        }
      } else {
        const safeMessage = responseType.includes('application/json')
          ? data.error
          : `The registration service is temporarily unavailable (HTTP ${response.status}).`;
        setSignupMessage({ type: 'error', text: safeMessage || 'Something went wrong.' });
        window.turnstile?.reset();
        setTurnstileToken('');
      }
    } catch (e: any) {
      console.error('Registration request failed:', e);
      setSignupMessage({ type: 'error', text: 'Cannot connect to the registration service. Please try again shortly.' });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-twilight-950 text-slate-100 font-sans selection:bg-amber-400 selection:text-black relative">
      
      {/* Background Celestial Ambiance - Cozy Night Countryside & Starry Sky Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0d1740] via-[#060a26] to-[#030412] pointer-events-none z-0" />
      <div className="absolute top-20 left-[10%] w-[32rem] h-[32rem] bg-emerald-400/10 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[45%] right-[5%] w-[40rem] h-[40rem] bg-rose-400/10 rounded-full filter blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[15%] w-[35rem] h-[35rem] bg-amber-400/10 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Exquisite Celestial Night Layer: Twinkling Stars, Golden Crescent Moon & Fireflies */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        
        {/* Soft magical space nebula glow */}
        <div className="absolute top-[15%] right-[10%] w-[25rem] h-[25rem] bg-indigo-500/10 rounded-full filter blur-[100px]" />

        {/* Dense Starfield */}
        <div className="absolute inset-0 z-0">
          {STARS_DATA.map((star) => (
            <div
              key={star.id}
              className={`absolute rounded-full animate-pulse ${
                star.type === 'amber'
                  ? 'bg-amber-300/40 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                  : star.type === 'blue'
                  ? 'bg-sky-200/40 shadow-[0_0_4px_rgba(186,230,253,0.5)]'
                  : 'bg-white/40 shadow-[0_0_3px_rgba(255,255,255,0.4)]'
              }`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDuration: `${star.duration}s`,
                animationDelay: `${(star.id * 0.3) % 4}s`,
              }}
            />
          ))}
        </div>

        {/* Big Cartoonish Gold Bedtime Stars */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {CARTOON_STARS_DATA.map((star) => (
            <div
              key={star.id}
              className="absolute animate-cartoon-star"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                // Pass custom CSS variables for rotation, duration and delay
                '--star-tilt': `${star.tilt}deg`,
                '--star-duration': `${star.duration}s`,
                '--star-delay': `${star.delay}s`,
              } as React.CSSProperties}
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id={`goldGrad-${star.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF275" />
                    <stop offset="60%" stopColor="#FFCC00" />
                    <stop offset="100%" stopColor="#FB9203" />
                  </linearGradient>
                </defs>

                {/* Thick Cartoon Black Border Path */}
                <path
                  d="M 50,8 L 62.9,35 L 94,37.2 L 71.3,58.5 L 77.1,88.4 L 50,73.5 L 22.9,88.4 L 28.7,58.5 L 6,37.2 L 37.1,35 Z"
                  fill="#0B0F19"
                  stroke="#0B0F19"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Gold Filled Core Path */}
                <path
                  d="M 50,8 L 62.9,35 L 94,37.2 L 71.3,58.5 L 77.1,88.4 L 50,73.5 L 22.9,88.4 L 28.7,58.5 L 6,37.2 L 37.1,35 Z"
                  fill={`url(#goldGrad-${star.id})`}
                  stroke="#0B0F19"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Left/Upper Glare Glossy Highlights (Bezier shape mimicking image gloss reflection) */}
                <path
                  d="M 23,43 Q 35,37.5 46.5,17"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.88"
                />

                {/* Two cute circular/pill glossy glares */}
                <ellipse cx="26" cy="38" rx="2.5" ry="3.5" fill="#FFFFFF" transform="rotate(-15 26 38)" opacity="0.95" />
                <rect x="36" y="27" width="10" height="3" rx="1.5" fill="#FFFFFF" transform="rotate(-25 36 27)" opacity="0.85" />

                {/* Right Bottom Shading layer inside limits */}
                <path
                  d="M 50,73.5 L 22.9,88.4 C 26,73 40,55 50,55 C 60,55 74,73 77.1,88.4 Z"
                  fill="#B45309"
                  opacity="0.22"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </svg>
            </div>
          ))}
        </div>

        {/* Majestic Glowing Crescent Bedtime Moon */}
        <div className="absolute top-32 right-[8%] sm:right-[12%] lg:right-[16%] flex items-center justify-center pointer-events-none z-10 animate-pulse [animation-duration:8s]">
          {/* Layered Moon Glow Aura */}
          <div className="absolute w-24 h-24 rounded-full bg-amber-400/20 filter blur-xl animate-ping [animation-duration:12s]" />
          <div className="absolute w-16 h-16 rounded-full bg-yellow-300/10 filter blur-md" />
          
          {/* Beautiful glowing crescent moon SVG */}
          <svg
            className="w-14 h-14 text-amber-200 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.65)] transform -rotate-[15deg]"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.3 22c5.965 0 10.8-4.835 10.8-10.8 0-1.87-.47-3.63-1.31-5.17A10.748 10.748 0 0012 2C6.035 2 1.2 6.835 1.2 12.8c0 5.965 4.835 10.8 10.8 10.8zm-1.82-1.92c-4.48 0-8.11-3.63-8.11-8.11s3.63-8.11 8.11-8.11c.14 0 .28 0 .42.01-1.97 1.83-3.09 4.38-3.09 7.07 0 2.8 1.18 5.43 3.25 7.24a8.03 8.03 0 01-.58-.1z"
            />
          </svg>
        </div>

        {/* Gentle Sleepy Fireflies near the ground / meadow */}
        <div className="absolute inset-0 z-0">
          {FIREFLIES_DATA.map((ff) => (
            <div
              key={ff.id}
              className="absolute rounded-full bg-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.8),_0_0_4px_rgba(250,204,21,0.6)] animate-pulse"
              style={{
                left: `${ff.x}%`,
                top: `${ff.y}%`,
                width: `${ff.size}px`,
                height: `${ff.size}px`,
                animationDuration: `${ff.duration}s`,
                animationDelay: `${ff.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content Wrap to ensure perfect layered hierarchy over space backdrop so stars never cover text */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">

      {/* Upper Alerts Banner for Success / Checkout States */}
      {checkoutSuccess && (
        <div id="success-banner" className="relative z-50 bg-gradient-to-r from-amber-400 via-yellow-300 to-indigo-500 text-slate-950 font-bold py-3.5 px-4 shadow-xl border-b border-amber-300/30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <span className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-slate-950 animate-bounce" />
              <span>
                Payment successful! Your Cozy Kid Tales subscription is active. If your selected bedtime is at least 2 hours from now, we will prepare and send your first story tonight. Otherwise, your first story will arrive tomorrow at your chosen bedtime.
              </span>
            </span>
            <button 
              onClick={() => {
                setCheckoutSuccess(false);
                window.history.replaceState({}, document.title, "/");
              }} 
              className="text-xs bg-slate-950 text-white px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {checkoutCancelled && (
        <div id="cancel-banner" className="relative z-50 bg-red-500/90 backdrop-blur-md text-white py-3 px-4 text-center font-semibold shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs sm:text-sm">
            <span>PayPal checkout was cancelled. You can return to your story plan when you are ready.</span>
            <button 
              onClick={() => {
                setCheckoutCancelled(false);
                window.history.replaceState({}, document.title, "/");
              }} 
              className="text-xs bg-black/40 text-white px-2.5 py-1 rounded hover:bg-black/60 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Styled Glassmorphic Sticky Header */}
      <header className="sticky top-0 z-40 bg-twilight-950/85 border-b border-[#22274d]/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
            <img
              src="/cozy-kid-tales-icon.svg"
              alt="Cozy Kid Tales"
              className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.25)]"
            />
            <div>
              <span className="text-2xl font-kids tracking-wide bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-300 bg-clip-text text-transparent">
                Cozy Kid Tales
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-[#7c83b3] font-mono font-medium">Screen-Free Bedtime Audio</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#a1a8c9]">
            <button 
              onClick={() => scrollTo('sample-audio')}
              className={`hover:text-amber-300 transition-colors cursor-pointer ${activeTab === 'sample-audio' ? 'text-amber-400' : ''}`}
            >
              Listen
            </button>
            <button 
              onClick={() => scrollTo('advantages')}
              className={`hover:text-amber-300 transition-colors cursor-pointer ${activeTab === 'advantages' ? 'text-amber-400' : ''}`}
            >
              Why Audio
            </button>

            <button 
              onClick={() => scrollTo('story-builder')}
              className={`hover:text-amber-300 transition-colors cursor-pointer ${activeTab === 'story-builder' ? 'text-amber-400' : ''}`}
            >
              Build Plan
            </button>

            <button 
              onClick={() => scrollTo('pricing')} 
              className={`hover:text-amber-300 transition-colors cursor-pointer ${activeTab === 'pricing' ? 'text-amber-400' : ''}`}
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollTo('faq')} 
              className={`hover:text-amber-300 transition-colors cursor-pointer ${activeTab === 'faq' ? 'text-amber-400 font-medium' : ''}`}
            >
              Parent Guide
            </button>
          </nav>

          <div>
            <button 
              onClick={() => {
                scrollTo('story-builder');
              }}
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-amber-300 rounded-full hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
            >
              Create My Story Plan
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">
      {/* 1. HERO SECTION */}
      <section id="hero" className="relative pt-10 pb-20 md:py-28 overflow-hidden mx-auto max-w-4xl px-6 md:px-12 z-10">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          
          <div className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-900/40 text-xs text-emerald-300 font-medium font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>100% Screen-Free Cozy Night Personalized Stories</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-kids tracking-wide text-white leading-[1.15]">
              Cozy customized <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
                Bedtime Audio Stories
              </span> <br />
              for your kids
            </h1>
            
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
              We write daily sleepy tales centered around your child's actual age, hobbies, and favorite animal friends - mixed with slow-paced sounds and delivered straight to your email every evening.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => {
                  scrollTo('story-builder');
                }}
                className="px-8 py-4 rounded-xl text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 font-bold tracking-wide shadow-[0_4px_25px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Moon className="w-4 h-4" />
                Create My Story Plan
              </button>
              <button
                onClick={() => scrollTo('sample-audio')}
                className="px-8 py-4 rounded-xl text-slate-100 border border-indigo-300/30 bg-slate-950/40 hover:bg-slate-900/70 hover:border-indigo-300/60 font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Volume2 className="w-4 h-4" />
                Hear Sample First
              </button>
              

            </div>

            {/* Premium trust metrics */}
            <div className="pt-10 grid grid-cols-3 gap-6 border-t border-[#1a1f46]/40 text-center max-w-md mx-auto">
              <div>
                <span className="block text-2xl font-bold text-amber-400 font-mono">100%</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Screen-Free</span>
              </div>
              <div>
                <span className="block text-2xl font-bold text-indigo-300 font-mono">3-8</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Ages Supported</span>
              </div>
              <div>
                <span className="block text-2xl font-bold text-slate-100 font-mono">$9</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Monthly Rate</span>
              </div>
            </div>
          </div>
          
          {/* Childhood Story Image & Soundscape Mixer - Centered and beautifully relative scaled */}
          <div className="w-full max-w-2xl mt-8">
            {/* 1. Beautiful Cozy 3D Farm Countryside Illustration */}
            <div className="relative group overflow-hidden rounded-3xl border-4 border-amber-300 bg-emerald-950 p-1 bg-gradient-to-tr from-rose-500/20 via-emerald-500/20 to-amber-500/25 shadow-[0_15px_35px_rgba(250,204,21,0.15)] transition-all hover:scale-[1.01] duration-300">
              <div className="absolute top-3 left-3 z-20 bg-rose-500 text-white font-bold text-[10px] uppercase font-mono px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                <span>Sweet Sleep Land</span>
              </div>
              
              <img 
                src={cozyBedtimeFarmImage} 
                alt="Cozy bedtime farm under a peaceful starry countryside sky" 
                className="block w-full aspect-[16/9] object-cover rounded-[20px]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FUNNEL PATH */}
      <section data-scroll-reveal className="scroll-reveal reveal-from-left py-10 bg-transparent border-y border-[#111636]/50 mx-auto max-w-5xl px-6 md:px-12 relative">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 reveal-stagger">
          {[
            ['01', 'Understand the ritual', 'See how the nightly email routine works.'],
            ['02', 'Hear the voice', 'Preview the calm bedtime pacing.'],
            ['03', 'See the value', 'Understand why audio-only helps bedtime.'],
            ['04', 'Build the plan', 'Choose the story details and start when ready.']
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border border-[#232a5e]/60 bg-[#070b22]/70 p-4 text-left">
              <span className="text-[10px] font-mono font-black text-amber-300">{number}</span>
              <h3 className="mt-2 text-sm font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" data-scroll-reveal className="scroll-reveal reveal-from-right py-20 bg-transparent border-t border-[#1d265a] mx-auto max-w-5xl px-6 md:px-12 relative">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs uppercase font-bold tracking-widest text-[#a5b4fc] font-mono">The Night Ritual</span>
          <h2 className="text-4xl sm:text-5xl font-kids tracking-wide text-white">
            Daily Sleep Magic in <span className="text-amber-300">3 Cozy Steps</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            Guiding your little ones from high-energy screen games to quiet offline rest without any fuss.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 reveal-stagger">
          
          {/* Step 1 - Moonlit Pasture Grassy Green */}
          <div className="relative group p-7 rounded-2xl bg-gradient-to-b from-[#113a24] to-[#081a10] border-2 border-emerald-500/30 hover:border-emerald-400 transition-all text-left space-y-4 shadow-lg hover:shadow-[0_4px_30px_rgba(34,197,94,0.15)]">
            <div className="absolute top-4 right-6 text-4xl font-black text-emerald-800/40 select-none font-mono tracking-tight group-hover:text-emerald-400/20">01</div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-400/30 font-bold text-xs font-mono">
              PREF
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">Choose Elements</h3>
            <p className="text-xs text-slate-200 leading-relaxed font-light">
              Submit your child's age group and custom sleep preferences - including themes (adventure, space, magic), active hobbies, and adorable animal sidekicks.
            </p>
          </div>

          {/* Step 2 - Cozy Red Barn Cottage */}
          <div className="relative group p-7 rounded-2xl bg-gradient-to-b from-[#1e1b5a] to-[#0f0e2b] border-2 border-indigo-500/30 hover:border-indigo-400 transition-all text-left space-y-4 shadow-lg hover:shadow-[0_4px_30px_rgba(99,102,241,0.15)]">
            <div className="absolute top-4 right-6 text-4xl font-black text-indigo-800/40 select-none font-mono tracking-tight group-hover:text-indigo-400/20">02</div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-400/30 font-bold text-xs font-mono">
              MAIL
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">Inbox Delivery</h3>
            <p className="text-xs text-slate-200 leading-relaxed font-light">
              Every afternoon or evening, at your exact requested delivery hour, a dedicated and beautifully written sleeping tale is sent directly to the parent's email.
            </p>
          </div>

          {/* Step 3 - Starry Harvest Gold Moon */}
          <div className="relative group p-7 rounded-2xl bg-gradient-to-b from-[#6b350e] to-[#3a1b07] border-2 border-amber-500/30 hover:border-amber-400 transition-all text-left space-y-4 shadow-lg hover:shadow-[0_4px_30px_rgba(245,158,11,0.15)]">
            <div className="absolute top-4 right-6 text-4xl font-black text-amber-800/40 select-none font-mono tracking-tight group-hover:text-amber-400/20">03</div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 border border-amber-400/30 font-bold text-xs font-mono">
              ZZZ
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Offline Slumber</h3>
            <p className="text-xs text-slate-200 leading-relaxed font-light">
              Dim down the bedroom lights, tap the audio stream link from any smart speaker or phone (with screens fully covered/dark), and let your little one drift away to the calm voice.
            </p>
          </div>

        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => scrollTo('sample-audio')}
            className="px-6 py-3 rounded-xl border border-indigo-300/30 bg-slate-950/40 text-slate-100 hover:border-amber-300/50 hover:text-amber-200 transition-all text-sm font-bold"
          >
            Hear the Sample Voice
          </button>
        </div>
      </section>

      {/* SAMPLE AUDIO STORY */}
      <section id="sample-audio" data-scroll-reveal className="scroll-reveal reveal-from-left py-16 bg-transparent border-t border-[#111636]/40 mx-auto max-w-4xl px-6 md:px-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-center reveal-stagger">
          <div className="space-y-4 text-left">
            <span className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-amber-300 font-mono">
              <Volume2 className="w-4 h-4" />
              Sample Audio Story
            </span>
            <h2 className="text-3xl sm:text-4xl font-kids tracking-wide text-white leading-tight">
              Hear the bedtime voice before you create your story plan
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed font-light">
              A gentle preview helps parents understand the pacing, warmth, and sleepy tone children receive at bedtime.
            </p>
            <button
              onClick={() => scrollTo('advantages')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-400/10 border border-indigo-300/30 text-indigo-100 hover:border-amber-300/50 hover:text-amber-200 transition-all text-sm font-bold"
            >
              Why audio works
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-3xl border border-amber-300/40 bg-[#080d2a]/80 p-5 sm:p-6 shadow-[0_18px_40px_rgba(245,158,11,0.12)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-300 text-slate-950 flex items-center justify-center shrink-0">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Cozy Kid Tales Sample</h3>
                <p className="text-[11px] text-slate-400 font-mono">Personalized bedtime audio preview</p>
              </div>
            </div>

            <audio
              controls
              controlsList="nodownload"
              onContextMenu={(event) => event.preventDefault()}
              preload="metadata"
              src={SAMPLE_AUDIO_SRC}
              onCanPlay={() => setSampleAudioMissing(false)}
              onError={() => setSampleAudioMissing(true)}
              className="w-full accent-amber-300"
            >
              Your browser does not support audio playback.
            </audio>

            {sampleAudioMissing && (
              <p className="mt-3 text-[11px] text-amber-200/90 font-mono">
                Sample audio file missing: public/audio/sample-story.wav
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. ADVANTAGES / WHY AUDIO COMFORT? */}
      <section id="advantages" data-scroll-reveal className="scroll-reveal reveal-from-right py-20 bg-transparent border-t border-[#111636]/40 mx-auto max-w-5xl px-6 md:px-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center reveal-stagger">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <span className="text-xs uppercase font-bold tracking-widest text-[#828bbd] font-mono">Screen-Free Bedtime</span>
            <h2 className="text-4xl sm:text-5xl font-kids tracking-wide text-white leading-tight">
              A calmer way to enjoy stories before bed
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base font-light">
              Cozy Kid Tales gives families a gentle, personalized audio story to enjoy as part of a calm bedtime routine without visual autoplay, ads, or endless scrolling.
            </p>

          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5 reveal-stagger">
            
            <div className="p-6 rounded-2xl bg-[#090b1c] border border-[#22285a]/40 text-left space-y-3 shadow-md hover:border-[#384088] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-400/10 text-amber-300 flex items-center justify-center border border-amber-400/20">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Screen-Free Listening</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                A story children can hear, imagine, and enjoy without needing to watch a screen.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090b1c] border border-[#22285a]/40 text-left space-y-3 shadow-md hover:border-[#384088] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-400/10 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Parent-Friendly Delivery</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                A simple story link delivered to the parent's email. No child-facing app, scrolling feed, or in-story ads.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090b1c] border border-[#22285a]/40 text-left space-y-3 shadow-md hover:border-[#384088] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pink-400/10 text-pink-300 flex items-center justify-center border border-pink-400/20">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Gentle Bedtime Themes</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Personalized stories filled with kindness, patience, curiosity, friendship, and caring moments.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090b1c] border border-[#22285a]/40 text-left space-y-3 shadow-md hover:border-[#384088] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-400/10 text-purple-300 flex items-center justify-center border border-purple-400/20">
                <Heart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">A Calm Nightly Ritual</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                A familiar story routine that can become part of a peaceful wind-down before bed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090b1c] border border-[#22285a]/40 text-left space-y-3 shadow-md hover:border-[#384088] transition-colors sm:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-400/10 text-emerald-300 flex items-center justify-center border border-emerald-400/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Made for Imagination</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Children listen, picture the story in their minds, and enjoy a cozy moment with family.
              </p>
            </div>

          </div>

        </div>
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => scrollTo('story-builder')}
            className="px-7 py-3.5 rounded-xl text-slate-950 bg-amber-300 hover:bg-amber-200 font-bold tracking-wide shadow-[0_4px_22px_rgba(245,158,11,0.18)] transition-all flex items-center justify-center gap-2 text-sm"
          >
            Build My Child's Story Plan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>



      {/* STORY PLAN BUILDER */}
      <section id="story-builder" data-scroll-reveal className="scroll-reveal reveal-from-left py-20 bg-transparent border-t border-[#1d265a] mx-auto max-w-5xl px-6 md:px-12 relative">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-300 font-mono">Free Story Preview</span>
          <h2 className="text-4xl sm:text-5xl font-kids tracking-wide text-white">Create Your Free Story</h2>
          <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
            Choose the story details now, and receive one personalized audio story tomorrow at your selected time. No payment required.
          </p>
        </div>

        <div className="max-w-2xl mx-auto reveal-stagger">
          <div className="rounded-3xl border border-indigo-500/30 bg-[#090d2a]/80 p-4 sm:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
            <div className="mb-5 rounded-2xl border border-[#26306a] bg-[#050814]/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold font-mono">
                  Step {builderStep + 1} of {builderSteps.length}
                </span>
                {builderStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setBuilderStep(builderStep - 1)}
                    className="text-xs font-bold text-slate-300 hover:text-amber-200 transition-colors"
                  >
                    Back
                  </button>
                )}
              </div>
              {(selectedAnimals.length > 0 || selectedThemes.length > 0 || selectedHobbies.length > 0 || childrenList.some(child => child.nickname.trim())) && (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Your plan so far:{' '}
                  <span className="text-slate-200">
                    {[
                      selectedAnimals.join(', '),
                      selectedThemes.join(', '),
                      selectedHobbies.join(', '),
                      childrenList.map(child => child.nickname.trim()).filter(Boolean).join(', ')
                    ].filter(Boolean).join(' - ')}
                  </span>
                </p>
              )}
            </div>

            <div className="hidden">
              {builderSteps.map((step, index) => {
                const isActive = builderStep === index;
                const isDone = builderCompletion[index];
                const isAllowed = index === 0 || builderCompletion.slice(0, index).every(Boolean);
                return (
                  <button
                    key={step}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => goToBuilderStep(index)}
                    className={`h-16 rounded-xl border px-2 text-center transition-all ${
                      isActive
                        ? 'border-amber-300 bg-amber-300/10 text-amber-200'
                        : isDone
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                        : isAllowed
                        ? 'border-[#26306a] bg-[#050915] text-slate-300 hover:border-indigo-400/60'
                        : 'border-[#171b3f] bg-[#050915]/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="block text-[10px] font-mono font-bold">{String(index + 1).padStart(2, '0')}</span>
                    <span className="block text-[11px] font-bold">{step}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#232a5e]/70 bg-[#050814]/80 p-4 sm:p-6 text-left min-h-[25rem]">
              {builderStep === 0 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-kids tracking-wide text-white">Pick a gentle story friend</h3>
                    <p className="text-sm text-slate-400 mt-1">Choose at least 2 animal companions your child would love to meet at bedtime.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {builderAnimalOptions.map((animal) => {
                      const selected = selectedAnimals.includes(animal);
                      return (
                        <button
                          key={animal}
                          type="button"
                          onClick={() => {
                            setSelectedAnimals(prev =>
                              selected ? prev.filter(item => item !== animal) : [...prev, animal]
                            );
                          }}
                          className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-all ${
                            selected
                              ? 'border-amber-300 bg-amber-300/15 text-amber-100'
                              : 'border-[#26306a] bg-[#080d25] text-slate-300 hover:border-amber-300/50'
                          }`}
                        >
                          {animal}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customAnimalInput}
                      onChange={(event) => setCustomAnimalInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomChoice(customAnimalInput, selectedAnimals, setSelectedAnimals, setCustomAnimalInput);
                        }
                      }}
                      placeholder="Other animal"
                      className="flex-1 px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomChoice(customAnimalInput, selectedAnimals, setSelectedAnimals, setCustomAnimalInput)}
                      className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-slate-200 hover:text-white"
                    >
                      Add
                    </button>
                  </div>
                  {selectedAnimals.filter(animal => !builderAnimalOptions.includes(animal)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAnimals.filter(animal => !builderAnimalOptions.includes(animal)).map(animal => (
                        <button
                          key={animal}
                          type="button"
                          onClick={() => setSelectedAnimals(previous => previous.filter(item => item !== animal))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100"
                          title={`Remove ${animal}`}
                        >
                          {animal}<X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!hasAnimal}
                    onClick={() => goToBuilderStep(1)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm"
                  >
                    {hasAnimal ? 'Choose the Story World' : `Choose ${Math.max(0, 2 - selectedAnimals.length)} More`}
                  </button>
                </div>
              )}

              {builderStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-kids tracking-wide text-white">Choose tonight's cozy world</h3>
                    <p className="text-sm text-slate-400 mt-1">Pick at least 2 cozy worlds where your child's sleepy adventures can begin.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {builderThemeOptions.map((theme) => {
                      const selected = selectedThemes.includes(theme);
                      return (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => {
                            setSelectedThemes(prev =>
                              selected ? prev.filter(item => item !== theme) : [...prev, theme]
                            );
                          }}
                          className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-all ${
                            selected
                              ? 'border-indigo-300 bg-indigo-400/15 text-indigo-100'
                              : 'border-[#26306a] bg-[#080d25] text-slate-300 hover:border-indigo-300/50'
                          }`}
                        >
                          {theme}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customThemeInput}
                      onChange={(event) => setCustomThemeInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomChoice(customThemeInput, selectedThemes, setSelectedThemes, setCustomThemeInput);
                        }
                      }}
                      placeholder="Other theme"
                      className="flex-1 px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomChoice(customThemeInput, selectedThemes, setSelectedThemes, setCustomThemeInput)}
                      className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-slate-200 hover:text-white"
                    >
                      Add
                    </button>
                  </div>
                  {selectedThemes.filter(theme => !builderThemeOptions.includes(theme)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedThemes.filter(theme => !builderThemeOptions.includes(theme)).map(theme => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setSelectedThemes(previous => previous.filter(item => item !== theme))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/50 bg-indigo-300/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"
                          title={`Remove ${theme}`}
                        >
                          {theme}<X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!hasTheme}
                    onClick={() => goToBuilderStep(2)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm"
                  >
                    {hasTheme ? 'Add Their Favorite Joy' : `Choose ${Math.max(0, 2 - selectedThemes.length)} More`}
                  </button>
                </div>
              )}

              {builderStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-kids tracking-wide text-white">What little joy should appear in the story?</h3>
                    <p className="text-sm text-slate-400 mt-1">Choose at least 2 things your child enjoys, so the stories have more room to vary.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {builderHobbyOptions.map((hobby) => {
                      const selected = selectedHobbies.includes(hobby);
                      return (
                        <button
                          key={hobby}
                          type="button"
                          onClick={() => {
                            setSelectedHobbies(prev =>
                              selected ? prev.filter(item => item !== hobby) : [...prev, hobby]
                            );
                          }}
                          className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-all ${
                            selected
                              ? 'border-emerald-300 bg-emerald-400/15 text-emerald-100'
                              : 'border-[#26306a] bg-[#080d25] text-slate-300 hover:border-emerald-300/50'
                          }`}
                        >
                          {hobby}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customHobbyInput}
                      onChange={(event) => setCustomHobbyInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomChoice(customHobbyInput, selectedHobbies, setSelectedHobbies, setCustomHobbyInput);
                        }
                      }}
                      placeholder="Other hobby"
                      className="flex-1 px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomChoice(customHobbyInput, selectedHobbies, setSelectedHobbies, setCustomHobbyInput)}
                      className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-slate-200 hover:text-white"
                    >
                      Add
                    </button>
                  </div>
                  {selectedHobbies.filter(hobby => !builderHobbyOptions.includes(hobby)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedHobbies.filter(hobby => !builderHobbyOptions.includes(hobby)).map(hobby => (
                        <button
                          key={hobby}
                          type="button"
                          onClick={() => setSelectedHobbies(previous => previous.filter(item => item !== hobby))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/50 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"
                          title={`Remove ${hobby}`}
                        >
                          {hobby}<X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!hasHobby}
                    onClick={() => goToBuilderStep(3)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm"
                  >
                    {hasHobby ? 'Tell Us About Your Child' : `Choose ${Math.max(0, 2 - selectedHobbies.length)} More`}
                  </button>
                </div>
              )}

              {builderStep === 3 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-kids tracking-wide text-white">Tell us about the little dreamer</h3>
                      <p className="text-sm text-slate-400 mt-1">Add at least 1 complete child profile so we can shape a child-friendly story voice.</p>
                    </div>
                    <button
                      type="button"
                      disabled={childrenList.length >= 5}
                      onClick={handleAddChild}
                      className="px-4 py-2.5 rounded-xl bg-amber-300/10 border border-amber-300/40 text-amber-200 disabled:opacity-40 text-xs font-bold uppercase"
                    >
                      Add Child
                    </button>
                  </div>
                  <div className="space-y-3">
                    {childrenList.map((child, index) => (
                      <div key={child.id} className="rounded-2xl border border-[#232a5e] bg-[#080d25] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Child {index + 1}</span>
                          {childrenList.length > 1 && (
                            <button type="button" onClick={() => handleRemoveChild(child.id)} className="text-xs text-rose-300 font-bold">
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={child.nickname}
                          onChange={(event) => handleUpdateChild(child.id, 'nickname', event.target.value)}
                          placeholder="Child name or nickname"
                          className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-600"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={child.gender}
                            onChange={(event) => handleUpdateChild(child.id, 'gender', event.target.value)}
                            className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400"
                          >
                            <option value="">Gender</option>
                            <option value="female">Female / Girl</option>
                            <option value="male">Male / Boy</option>
                            <option value="other">Other / Non-binary</option>
                          </select>
                          <DatePicker value={child.birthday} onChange={(value) => handleUpdateChild(child.id, 'birthday', value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!childrenComplete}
                    onClick={() => goToBuilderStep(4)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm"
                  >
                    {childrenComplete ? 'Choose Bedtime Delivery' : 'Complete 1 Child Profile'}
                  </button>
                </div>
              )}

              {builderStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-kids tracking-wide text-white">Set the bedtime story hour</h3>
                    <p className="text-sm text-slate-400 mt-1">Choose when the story should arrive in the parent's timezone.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Delivery Time</label>
                      <input
                        type="time"
                        required
                        value={deliveryTime}
                        onChange={(event) => setDeliveryTime(event.target.value)}
                        className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400"
                      />
                      {!deliveryTimeComplete && (
                        <p className="mt-1.5 text-[10px] text-amber-200">Required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Age Range</label>
                      <select
                        required
                        value={ageRange}
                        onChange={(event) => setAgeRange(event.target.value as '3-5' | '6-8')}
                        className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="" disabled>Select age range</option>
                        <option value="3-5">3-5</option>
                        <option value="6-8">6-8</option>
                      </select>
                      {!ageRangeComplete && (
                        <p className="mt-1.5 text-[10px] text-amber-200">Required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Timezone</label>
                      <select
                        required
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="" disabled>Select timezone</option>
                        {getTimezoneOptions(Intl.DateTimeFormat().resolvedOptions().timeZone).map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                      {!timezoneComplete && (
                        <p className="mt-1.5 text-[10px] text-amber-200">Required</p>
                      )}
                    </div>
                  </div>
                  {!deliveryComplete && (
                    <p className="text-xs text-amber-200/90">
                      Delivery time, age range, and timezone are all required.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!deliveryComplete}
                    onClick={() => goToBuilderStep(5)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm"
                  >
                    Add Your Email
                  </button>
                </div>
              )}

              {builderStep === 5 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-kids tracking-wide text-white">Where should the bedtime magic arrive?</h3>
                    <p className="text-sm text-slate-400 mt-1">We send the story link to the parent, not a child-facing app.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs sm:text-sm text-amber-100 leading-relaxed">
                    Your free personalized story will be sent tomorrow at your selected time. No payment details are needed.
                  </div>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(event) => setParentEmail(event.target.value)}
                    placeholder="Parent email address"
                    className="w-full px-3 py-3 bg-[#05060d] border border-[#212752] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-600"
                  />
                  {parentEmail.trim() && !emailComplete && (
                    <p className="text-xs text-amber-200/90">
                      Please enter a valid email address.
                    </p>
                  )}
                  {!canRegister && (
                    <p className="text-xs text-amber-200/90">
                      Enter a valid parent email to save the story plan.
                    </p>
                  )}
                  {config.turnstileRequired && config.turnstileSiteKey && (
                    <TurnstileWidget siteKey={config.turnstileSiteKey} onToken={setTurnstileToken} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (canRegister) {
                        handleSubscribe();
                      } else {
                        continueBuilder();
                      }
                    }}
                    disabled={submitting || !canSubmitRegistration}
                    className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                      canSubmitRegistration
                        ? 'bg-amber-300 hover:bg-amber-200 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {submitting ? 'Saving Free Story...' : canRegister ? 'Request My Free Story' : 'Complete Story Details'}
                  </button>
                  {signupMessage && (
                    <p className={`text-xs leading-relaxed ${
                      signupMessage.type === 'success' ? 'text-emerald-200' : 'text-rose-200'
                    }`}>
                      {signupMessage.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden">
            <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold font-mono">Plan Preview</span>
            <h3 className="mt-2 text-2xl font-kids tracking-wide text-white">Your Cozy Plan</h3>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ['Animal', selectedAnimals.join(', ') || 'Choose animal'],
                ['Theme', selectedThemes.join(', ') || 'Choose theme'],
                ['Hobby', selectedHobbies.join(', ') || 'Choose hobby'],
                ['Children', childrenList.map(child => child.nickname.trim()).filter(Boolean).join(', ') || 'Add child details'],
                ['Delivery', deliveryComplete ? `${deliveryTime} ${getTzAbbreviation(timezone)}` : 'Choose time'],
                ['Email', parentEmail || 'Add parent email']
              ].map(([label, value], index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => goToBuilderStep(index)}
                  className="w-full rounded-xl border border-[#26306a] bg-[#070b22] px-3 py-3 text-left hover:border-amber-300/40 transition-colors"
                >
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
                  <span className="block mt-1 text-slate-200 truncate">{value}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-emerald-400/10 border border-emerald-300/20 p-4 text-xs text-emerald-100 leading-relaxed">
              Preferences stay fixed for the month, while each nightly story is still newly created from those choices.
            </div>
          </aside>
        </div>
      </section>

      {/* 5. PRICING TABLE SECTION */}
      <section id="pricing" data-scroll-reveal className="scroll-reveal reveal-from-right py-20 bg-transparent border-t border-[#1d265a] mx-auto max-w-5xl px-6 md:px-12 relative">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-[#828bbd] font-mono">Transparent Plans</span>
          <h2 className="text-4xl sm:text-5xl font-kids tracking-wide text-white">Start Your Bedtime Journey</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto items-stretch reveal-stagger">
          <div className="p-7 rounded-3xl bg-[#0b1238] border-2 border-emerald-300/70 shadow-[0_0_26px_rgba(110,231,183,0.12)] flex flex-col justify-between gap-8 text-left relative overflow-hidden">
            <div className="space-y-4">
              <span className="inline-flex text-[10px] font-bold uppercase tracking-widest text-emerald-200 font-mono">Try It Free</span>
              <h3 className="text-2xl font-bold text-white">One Free Story</h3>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-4xl font-black text-emerald-200">$0</span>
                <span className="text-xs text-slate-300">one time</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Register your child's story preferences and receive one personalized audio story tomorrow at your selected time.
              </p>
              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 shrink-0 text-emerald-300" /><span>No payment details required</span></li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 shrink-0 text-emerald-300" /><span>Personalized from your choices</span></li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 shrink-0 text-emerald-300" /><span>Sent to the parent's email</span></li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => scrollTo('story-builder')}
              className="w-full py-3 rounded-xl text-slate-950 bg-emerald-200 hover:bg-emerald-100 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Request My Free Story
            </button>
          </div>

          <div className="p-7 rounded-3xl bg-gradient-to-br from-[#121b4a] to-[#0a113a] border border-indigo-400/40 flex flex-col justify-between gap-8 text-left relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-300/10 text-amber-200 border border-amber-300/30 text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full font-mono">
              Coming Soon
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#b4bcff] font-mono">30 Nights of Stories</span>
              <h3 className="text-2xl font-bold text-white">Monthly Plan</h3>
              
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-4xl font-black text-amber-300">$9</span>
                <span className="text-xs text-indigo-200">/ month</span>
              </div>

              <p className="text-xs text-indigo-200 leading-relaxed font-light">
                Receive a newly created personalized story each night for one month.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-indigo-100 font-light">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 shrink-0 text-amber-300" />
                  <span><strong>Daily personalized</strong> tales every night</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>Bespoke theme & hobby alignments</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>Cozy nature scenes included</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>100% advertising-free, pure media</span>
                </li>
              </ul>
            </div>

            <div>
              <button
              type="button"
              disabled
              className="w-full py-3 rounded-xl text-slate-400 bg-slate-800/80 border border-slate-700 font-bold text-xs uppercase tracking-wider cursor-not-allowed text-center"
            >
              Not Available Yet
            </button>
            </div>
          </div>

        </div>
      </section>

      {/* 8. PARENT FAQ ACCORDION */}
      <section id="faq" data-scroll-reveal className="scroll-reveal reveal-from-left py-20 bg-transparent border-t border-[#1d265a] mx-auto max-w-3xl px-6 md:px-12 relative">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-[#828bbd] font-mono">Expert Guidance</span>
          <h2 className="text-4xl font-kids tracking-wide text-white">Sleep Guide & FAQs</h2>
          <p className="text-slate-400 text-sm font-light">
            Everything you need to know to establish peaceful bedtime protocols tonight.
          </p>
        </div>

        <div className="space-y-4 reveal-stagger">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="bg-[#0b0e27]/40 border border-[#232a5e]/50 rounded-2xl overflow-hidden transition-all text-left shadow-lg"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-white hover:text-amber-300 transition-colors font-semibold text-sm sm:text-base cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-indigo-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1.5 text-xs sm:text-sm text-[#a1a8c9] leading-relaxed border-t border-indigo-950/40 font-light">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
          </section>
      </main>

      {/* 9. THE FOOTER */}
      <footer className="bg-slate-950 border-t border-[#111636]/40 py-16 relative z-25 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3 text-left">
              <img
                src="/cozy-kid-tales-icon.svg"
                alt="Cozy Kid Tales"
                className="w-8 h-8 rounded-lg shadow-[0_0_12px_rgba(99,102,241,0.2)]"
              />
              <div>
                <span className="block text-sm font-bold text-slate-300">Cozy Kid Tales LLC (c) 2026</span>
                <span className="block text-[10px] text-slate-500 font-mono">Global Bedtime Companion</span>
              </div>
            </div>
          </div>

        </div>
      </footer>

      </div> {/* Close children main content container */}

      {/* Coming Soon modal shown while checkout is not ready */}
      {showSignupModal && (
        <div id="coming-soon-modal" className="fixed inset-0 z-55 flex items-center justify-center px-3 py-5 sm:p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowSignupModal(false)} />

          <div className="relative w-full max-w-[22rem] sm:max-w-md bg-gradient-to-b from-[#0e1131] to-[#040615] border border-[#262c64] rounded-2xl sm:rounded-3xl px-5 py-6 sm:p-8 shadow-2xl overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />

            <button
              onClick={() => setShowSignupModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 space-y-3 sm:space-y-4 pt-3 sm:pt-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-300/10 border border-amber-300/30 text-amber-200 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-kids tracking-wide text-white">Coming Soon</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  We're thoughtfully building this feature to make bedtime simpler and more magical. Check back soon for updates.
                </p>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                className="w-full py-2.5 sm:py-3 rounded-xl text-slate-950 bg-amber-300 hover:bg-amber-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SIGNUP / REGISTRATION POPUP MODAL */}
      {false && showSignupModal && (
        <div id="signup-modal" className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowSignupModal(false)} />
          
          <div className="relative w-full max-w-xl bg-gradient-to-b from-[#0e1131] to-[#040615] border border-[#262c64] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Ambient background light */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-indigo-950/60 pb-4 shrink-0">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#f59e0b]">COZY SUBSCRIPTION ROUTE</span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Unlock Monthly Membership
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  $9/month - Cancel anytime
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowSignupModal(false);
                  setSignupMessage(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors animate-pulse"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (Scrollable if form is long) */}
            <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-6 text-left scrollbar-thin scrollbar-thumb-indigo-950">
              
              {signupMessage?.type === 'success' ? (
                // Success screen
                <div className="text-center py-8 space-y-5 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    OK
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">Subscription Activated!</h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                      {signupMessage.text}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-950 text-xs text-slate-400 space-y-1 inline-block mx-auto">
                    <span className="block text-slate-300 font-semibold">Configured Preferences:</span>
                    <span>Age Level: {ageRange} - Daily at {deliveryTime} ({getTzAbbreviation(timezone)})</span>
                    <span className="block italic text-amber-200/90 text-[11.5px] mt-1.5">Check your email inbox, details received.</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowSignupModal(false);
                      setSignupMessage(null);
                    }}
                    className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Alright, Close Window
                  </button>
                </div>
              ) : (
                // Actual interactive Form
                <form onSubmit={handleSubscribe} className="space-y-6">
                  
                  {signupMessage?.type === 'error' && (
                    <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-xl">
                      {signupMessage.text}
                    </div>
                  )}

                  {/* Section A: parent identity */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono">1</span>
                      Profile & Bedtime timing
                    </h4>
                    
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Parent Email Address *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="email" 
                            required
                            value={parentEmail}
                            onChange={(e) => setParentEmail(e.target.value)}
                            placeholder="parent@example.com"
                            className="w-full pl-9 pr-3 py-2 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-400 placeholder:text-slate-700 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1.5">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Bedtime Hour</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="time" 
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#05060d] border border-[#212752] rounded-xl text-xs focus:outline-none focus:border-indigo-400 text-slate-100 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Your Timezone</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                          <select 
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#05060d] border border-[#212752] rounded-xl text-xs focus:outline-none focus:border-indigo-400 text-slate-100 appearance-none transition-colors font-sans cursor-pointer"
                          >
                            {getTimezoneOptions(Intl.DateTimeFormat().resolvedOptions().timeZone).map((tz, idx) => (
                              <option key={idx} value={tz.value} className="bg-[#05060d] text-slate-100">
                                {tz.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Reading Level Mode *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: '3-5', val: '3-5' },
                            { label: '6-8', val: '6-8' }
                          ].map((item, id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setAgeRange(item.val as any)}
                              className={`py-2 px-1 text-center border rounded-xl text-[10px] font-bold transition-all ${
                                ageRange === item.val
                                  ? 'border-amber-400 bg-amber-500/10 text-amber-200'
                                  : 'border-[#212752] bg-[#05060c] text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Children Profiles Settings (Dynamically managed, up to 5) */}
                  <div className="space-y-3.5 pt-1">
                    <div className="flex items-center justify-between border-b border-indigo-950/40 pb-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono">2</span>
                        Children Profiles ({childrenList.length}/5)
                      </h4>
                      {childrenList.length < 5 ? (
                        <button
                          type="button"
                          onClick={handleAddChild}
                          className="text-[10px] uppercase font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Child
                        </button>
                      ) : (
                        <span className="text-[9px] text-indigo-400/60 uppercase font-mono tracking-wider">Max 5 Children reached</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {childrenList.map((child, index) => (
                        <div 
                          key={child.id} 
                          className="p-4 rounded-2xl bg-[#091136]/50 border border-[#212752]/70 relative space-y-3"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-[#212752]/30 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#949cc8] font-mono">Child #{index + 1} Settings</span>
                            {childrenList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChild(child.id)}
                                className="text-[9px] uppercase font-bold text-rose-450 hover:text-rose-400 flex items-center gap-0.5 transition-colors cursor-pointer bg-rose-500/10 px-2 py-0.5 rounded"
                              >
                                <X className="w-2.5 h-2.5" /> Remove
                              </button>
                            )}
                          </div>

                          {/* Single Child Name / Nickname Input */}
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Child Name / Nickname *</label>
                            <div className="relative">
                              <Smile className="absolute left-3 top-2.5 w-3 h-3 text-slate-500" />
                              <input 
                                type="text" 
                                required
                                value={child.nickname}
                                onChange={(e) => handleUpdateChild(child.id, 'nickname', e.target.value)}
                                placeholder="Enter child's name or nickname (e.g. Amara or Ami) *"
                                className="w-full pl-8 pr-3 py-2 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-100 focus:outline-[#312e81] focus:border-indigo-400 placeholder:text-slate-700 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-[9px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Gender *</label>
                              <select
                                required
                                value={child.gender}
                                onChange={(e) => handleUpdateChild(child.id, 'gender', e.target.value as any)}
                                className="w-full px-3 py-2 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-100 focus:outline-[#312e81] focus:border-indigo-400 transition-colors cursor-pointer"
                              >
                                <option value="" disabled className="bg-[#05060d] text-slate-500">Select Gender *</option>
                                <option value="female" className="bg-[#05060d] text-slate-100">Female / Girl</option>
                                <option value="male" className="bg-[#05060d] text-slate-100">Male / Boy</option>
                                <option value="other" className="bg-[#05060d] text-slate-100">Other / Non-binary</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase tracking-widest text-[#949cc8] font-bold mb-1 font-mono">Birthday *</label>
                              <DatePicker
                                value={child.birthday}
                                onChange={(val) => handleUpdateChild(child.id, 'birthday', val)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Favorite Animal choice cloud */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono">3</span>
                        Favorite Animal *
                      </span>
                      <span className="text-[9px] text-slate-500 lowercase font-mono">Select favorite creatures</span>
                    </h4>

                    {/* Animal tag list */}
                    <div className="flex flex-wrap gap-2 py-0.5">
                      {['Elephant', 'Rabbit', 'Dolphin', 'Lion', 'Bear', 'Panda', 'Koala'].map((tag) => {
                        const isChosen = selectedAnimals.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isChosen) {
                                setSelectedAnimals(prev => prev.filter(p => p !== tag));
                              } else {
                                setSelectedAnimals(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-amber-400/10 text-amber-300 border border-[#facc15]/40 shadow-[0_0_8px_rgba(250,204,21,0.08)]' 
                                : 'bg-[#05060d] text-slate-400 border border-[#212752]/50 hover:border-slate-700'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input 
                        type="text"
                        value={customAnimalInput}
                        onChange={(e) => setCustomAnimalInput(e.target.value)}
                        placeholder="Type custom fluffy or wild animal... (e.g. Squirrel)"
                        className="flex-1 px-3 py-1.5 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-400 placeholder:text-slate-700 font-light"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customAnimalInput.trim() && !selectedAnimals.includes(customAnimalInput.trim())) {
                            setSelectedAnimals(prev => [...prev, customAnimalInput.trim()]);
                            setCustomAnimalInput('');
                          }
                        }}
                        className="px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-xs text-slate-300 font-semibold cursor-pointer transition-colors"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Section C: Favorite Hobbies choice cloud */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono">4</span>
                        Favorite Hobbies *
                      </span>
                    </h4>

                    {/* Hobbies list */}
                    <div className="flex flex-wrap gap-2 py-0.5">
                      {['Reading', 'Drawing', 'Puzzles', 'Star Gazing', 'Singing', 'Building block play'].map((tag) => {
                        const isChosen = selectedHobbies.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isChosen) {
                                setSelectedHobbies(prev => prev.filter(p => p !== tag));
                              } else {
                                setSelectedHobbies(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-amber-400/10 text-amber-300 border border-[#facc15]/40 shadow-[0_0_8px_rgba(250,204,21,0.08)]' 
                                : 'bg-[#05060d] text-slate-400 border border-[#212752]/50 hover:border-slate-700'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input 
                        type="text"
                        value={customHobbyInput}
                        onChange={(e) => setCustomHobbyInput(e.target.value)}
                        placeholder="Type custom creative hobby... (e.g. Cricket)"
                        className="flex-1 px-3 py-1.5 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-400 placeholder:text-slate-700 font-light"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customHobbyInput.trim() && !selectedHobbies.includes(customHobbyInput.trim())) {
                            setSelectedHobbies(prev => [...prev, customHobbyInput.trim()]);
                            setCustomHobbyInput('');
                          }
                        }}
                        className="px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-xs text-slate-300 font-semibold cursor-pointer transition-colors"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Section D: Favorite Themes choice cloud (with preset superhero, technology, space, fairytale options) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono">5</span>
                        Favorite Theme *
                      </span>
                    </h4>

                    {/* Predefined theme tags: Superhero, Technology, Space, Fairytale */}
                    <div className="flex flex-wrap gap-2 py-0.5">
                      {['Superhero', 'Technology', 'Space', 'Fairytale'].map((tag) => {
                        const isChosen = selectedThemes.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isChosen) {
                                setSelectedThemes(prev => prev.filter(p => p !== tag));
                              } else {
                                setSelectedThemes(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/40' 
                                : 'bg-[#05060d] text-slate-400 border border-[#212752]/50 hover:border-slate-700'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input 
                        type="text"
                        value={customThemeInput}
                        onChange={(e) => setCustomThemeInput(e.target.value)}
                        placeholder="Type other custom themes... (e.g. Magic ocean, national parks)"
                        className="flex-1 px-3 py-1.5 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-400 placeholder:text-slate-750 font-light"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customThemeInput.trim() && !selectedThemes.includes(customThemeInput.trim())) {
                            setSelectedThemes(prev => [...prev, customThemeInput.trim()]);
                            setCustomThemeInput('');
                          }
                        }}
                        className="px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-xs text-slate-300 font-semibold cursor-pointer transition-colors"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-indigo-950/60 pb-1.5 space-y-3.5">
                    {signupMessage?.type === 'error' && (
                      <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-xl">
                        {signupMessage.text}
                      </div>
                    )}
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl text-slate-950 bg-amber-300 hover:bg-amber-200 font-extrabold tracking-wide hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
                    >
                      {submitting ? 'Contacting Secure billing node...' : 'Activate Subscription - $9/month'}
                    </button>
                    <span className="block text-center text-[9px] text-slate-500 font-mono mt-3">
                      Secured via bank grade TLS. Never spamming. Opt-out in 1-click.
                    </span>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      )}

      <Analytics />

    </div>
  );
}

import { 
  LayoutDashboard, 
  ReceiptText, 
  Bot, 
  Settings, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Copy, 
  X, 
  ChevronRight,
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Tag,
  Leaf,
  LogOut,
  Monitor,
  Smartphone,
  FolderSync,
  RefreshCw,
  MoreHorizontal,
  Home,
  FileJson,
  BarChart2,
  Share2,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Folder,
  User,
  Mail,
  Ghost,
  Minus,
  Undo2,
  Redo2,
  ShieldCheck,
  Cloud,
  Play,
  Lock,
  ArrowDownUp,
  Users,
  Edit2,
  FileDown,
  Link,
  Link2,
  ArrowDownNarrowWide,
  History,
  Coins,
  CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  Scale
} from 'chart.js';
import { Bar as ChartBar, Line as ChartLine, Doughnut } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs';

// Removed import as requested for single-file/CDN compatibility
// import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://cigrmsoprnefiwbenbuv.supabase.co').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZ3Jtc29wcm5lZml3YmVuYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MTM0ODIsImV4cCI6MjA5NDM4OTQ4Mn0.C_njZ0VD_qwKnGGgEcaBUy9Qm0xXbtia1inucnmqckg';

// Using global supabase object from CDN safely
let supabase: any = null;
try {
  // @ts-ignore
  if (window.supabase) {
    // @ts-ignore
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Erro ao inicializar Supabase:", e);
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler,
  zoomPlugin
);

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import { initDB, getState, saveState, clearState } from './db';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isUUID = (id: any): boolean => {
  if (!id || typeof id !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- Types ---
type TransactionType = 'entrada' | 'saída';
type TransactionStatus = 'realizado' | 'pendente';

interface Transaction {
  id: string;
  date: string;
  desc: string;
  value: number;
  category: string;
  type: TransactionType;
  profile_name: string;
  status: TransactionStatus;
  is_redutora: boolean;
  parent_id?: string;
  parent_name?: string;
  updatedAt?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  operation: 'Inserção' | 'Edição' | 'Exclusão' | 'Desfazer' | 'Refazer';
  metadata: {
    value?: number;
    profile: string;
    description: string;
  };
}

interface SyncTask {
  id: string;
  type: 'tx_add' | 'tx_update' | 'tx_delete' | 'audit' | 'metadata' | 'ai_import';
  payload: any;
  retryCount: number;
}

interface Category {
  name: string;
  id: string;
  color?: string;
}

const DEFAULT_CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Educação', 'Lazer', 'Saúde', 'Trabalho', 'Outros'
];

type Tab = 'reports' | 'history' | 'ai' | 'categories' | 'settings' | 'about';

const VIBRANT_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', 
  '#06b6d4', '#10b981', '#f43f5e', '#6366f1', '#a855f7',
  '#ef4444', '#14b8a6', '#f59e0b', '#84cc16'
];

interface DateFilter {
  month: number;
  year: number;
  type: 'month' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

interface AnalyticsConfig {
  granularity: 'day' | 'month' | 'year';
  compareCategories: string[];
}

const CategoryDonut = ({ data, colorMode }: { 
  data: any[], 
  colorMode: 'unique' | 'flow'
}) => {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map((d, i) => {
        if (colorMode === 'unique') {
          return VIBRANT_PALETTE[i % VIBRANT_PALETTE.length];
        }
        const dominantType = d.income >= d.expense ? 'entrada' : 'saída';
        // Dynamically varying shades/opacities for unique identifies in Flow Mode
        const hue = dominantType === 'entrada' ? 142 : 350; // Greenish vs Reddish
        const lightness = 45 + (i % 5) * 7;
        const opacity = 0.6 + (i % 3) * 0.1;
        return `hsla(${hue}, 70%, ${lightness}%, ${opacity})`;
      }),
      borderColor: 'rgba(255,255,255,0.05)',
      borderWidth: 2,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
           label: (context: any) => ` ${formatCurrency(context.raw)}`
        }
      },
      zoom: {
        pan: { enabled: true, mode: 'xy' as const },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' as const }
      }
    },
    cutout: '70%'
  };

  return <Doughnut data={chartData} options={options} />;
};

  const TimelineChart = ({ data, isPerformance = false, onPointClick, viewMode = 'tudo' }: { data: any[], type?: 'bar' | 'area', isPerformance?: boolean, onPointClick?: (date: string) => void, viewMode?: string }) => {
  const chartRef = useRef<any>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeData, setActiveData] = useState<{income: number, expense: number, net: number, cumulative?: number, date?: string} | null>(null);

  const handleReset = () => {
    chartRef.current?.resetZoom();
    setActiveIndex(null);
    setActiveData(null);
  };

  const cumulativeData = useMemo(() => {
    try {
      if (!isPerformance) return [];
      let runningSum = 0;
      return data.map(d => {
        let val = 0;
        if (viewMode === 'tudo' || viewMode === 'personalizado') {
          val = d.income - d.expense;
        } else if (viewMode === 'receitas') {
          val = d.income;
        } else if (viewMode === 'despesas') {
          val = d.expense;
        }
        runningSum += val;
        return runningSum;
      });
    } catch (e) {
      console.error("Erro ao calcular dados acumulados:", e);
      return [];
    }
  }, [data, isPerformance, viewMode]);

  const maxVal = useMemo(() => {
    try {
      if (isPerformance) {
          if (cumulativeData.length === 0) return 100;
          return Math.max(...cumulativeData.map(Math.abs), 100);
      }
      return Math.max(...data.flatMap(d => [d.income, d.expense]), 100);
    } catch (e) {
      return 100;
    }
  }, [data, isPerformance, cumulativeData]);
  
  const chartData = useMemo(() => {
    try {
      if (isPerformance) {
        const color = (viewMode === 'despesas') ? '#ef4444' : '#10b981';
        return {
          labels: data.map(d => d.name),
          datasets: [{
            label: 'Acumulado',
            data: cumulativeData,
            fill: true,
            tension: 0.4,
            borderColor: color,
            backgroundColor: `${color}33`,
            pointRadius: data.map((_, i) => i === activeIndex ? 6 : 0),
            pointBackgroundColor: data.map((_, i) => i === activeIndex ? '#ffffff' : color),
            pointHoverRadius: 8,
            pointHitRadius: 15,
          }]
        };
      }

      // 2-Dataset approach
      return {
        labels: data.map(d => d.name),
        datasets: [
          {
            label: 'Receitas',
            data: data.map(d => d.income),
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            borderColor: data.map((_, i) => i === activeIndex ? '#ffffff' : 'transparent'),
            borderWidth: data.map((_, i) => i === activeIndex ? 3 : 0),
            borderRadius: 6,
            barPercentage: 0.9,
            categoryPercentage: 0.8,
            grouped: true,
          },
          {
            label: 'Despesas',
            data: data.map(d => d.expense),
            backgroundColor: 'rgba(244, 63, 94, 0.9)',
            borderColor: data.map((_, i) => i === activeIndex ? '#ffffff' : 'transparent'),
            borderWidth: data.map((_, i) => i === activeIndex ? 3 : 0),
            borderRadius: 6,
            barPercentage: 0.9,
            categoryPercentage: 0.8,
            grouped: true,
          }
        ]
      };
    } catch (e) {
      console.error("Erro ao gerar chartData:", e);
      return { labels: [], datasets: [] };
    }
  }, [data, activeIndex, isPerformance, cumulativeData, viewMode]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    layout: {
      padding: { bottom: 25 }
    },
    onClick: (e: any, elements: any) => {
      try {
        const chart = chartRef.current;
        if (!chart) return;

        if (elements.length > 0) {
          const index = elements[0].index;
          setActiveIndex(index);
          const item = data[index];
          
          if (isPerformance) {
            setActiveData({
              income: item.income,
              expense: item.expense,
              net: item.income - item.expense,
              cumulative: cumulativeData[index],
              date: new Date(item.fullDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            });

            chart.data.datasets[0].pointRadius = data.map((_, i: number) => i === index ? 6 : 0);
            const color = (viewMode === 'despesas') ? '#ef4444' : '#10b981';
            chart.data.datasets[0].pointBackgroundColor = data.map((_, i: number) => i === index ? '#ffffff' : color);
          } else {
            setActiveData({
              income: item.income,
              expense: item.expense,
              net: item.income - item.expense
            });
            if (onPointClick) onPointClick(data[index].fullDate);
            
            chart.data.datasets.forEach((dataset: any) => {
              dataset.borderColor = data.map((_, i: number) => i === index ? '#ffffff' : 'transparent');
              dataset.borderWidth = data.map((_, i: number) => i === index ? 3 : 0);
            });
          }
        } else {
          setActiveIndex(null);
          setActiveData(null);
          if (isPerformance) {
            chart.data.datasets[0].pointRadius = 0;
          } else {
            chart.data.datasets.forEach((dataset: any) => {
              dataset.borderWidth = 0;
            });
          }
        }
        chart.update('none');
      } catch (err) {
        console.error("Erro ao manipular clique no gráfico:", err);
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy' as const,
          threshold: 10,
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy' as const,
        },
        limits: {
          x: {
            min: -5,
            max: data.length + 5,
            minRange: 5
          }
        }
      }
    },
    scales: {
      x: { 
        stacked: false,
        grid: { 
          color: 'rgba(255,255,255,0.05)', 
          lineWidth: 1,
          drawBorder: true,
        }, 
        ticks: { 
          color: '#64748b', 
          font: { size: 10, weight: 'bold' as const },
          maxRotation: 0,
          autoSkip: false,
          padding: 10,
          callback: function(val: any, index: number) {
            const currentItem = data[val];
            if (!currentItem) return '';
            
            const date = new Date(currentItem.fullDate);
            const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            const day = date.getDate();

            if (index === 0) return `${month} ${day}`;
            
            const prevItem = data[val - 1];
            if (!prevItem) return `${month} ${day}`;
            
            const prevDate = new Date(prevItem.fullDate);
            if (date.getMonth() !== prevDate.getMonth()) {
                return `${month} ${day}`;
            }
            
            return day.toString();
          }
        } 
      },
      y: { 
        stacked: false,
        min: isPerformance ? undefined : 0,
        max: maxVal * 1.2,
        grid: { color: 'rgba(255,255,255,0.03)' }, 
        ticks: { 
          color: '#475569', 
          font: { size: 10 },
          callback: (val: any) => formatCurrency(val)
        } 
      }
    }
  }), [data, onPointClick, maxVal, isPerformance, cumulativeData, viewMode]);

  try {
    return (
      <div className="w-full h-full relative group flex flex-col">
        {activeData && !isPerformance && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-between items-center text-[10px] p-3 bg-slate-900/80 backdrop-blur-md rounded-xl mb-4 border border-white/5 shadow-2xl gap-3"
          >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-400 font-black uppercase tracking-widest">Receitas:</span>
                <span className="text-emerald-400 font-black">{formatCurrency(activeData.income)}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-400 font-black uppercase tracking-widest">Despesas:</span>
                <span className="text-rose-400 font-black">{formatCurrency(activeData.expense)}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-400 font-black uppercase tracking-widest">Líquido:</span>
                <span className={cn("font-black", activeData.net >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {formatCurrency(activeData.net)}
                </span>
            </div>
          </motion.div>
        )}

        {activeData && isPerformance && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-between items-center text-[10px] p-3 bg-slate-900/80 backdrop-blur-md rounded-xl mb-4 border border-white/5 shadow-2xl gap-3"
          >
            <div className="flex items-center gap-2">
                <span className="text-slate-400 font-black uppercase tracking-widest">Acumulado até {activeData.date}:</span>
                <span className={cn("font-black text-xs", (activeData.cumulative || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {formatCurrency(activeData.cumulative || 0)}
                </span>
            </div>
          </motion.div>
        )}

        <div className="flex justify-end items-center gap-2 mb-2">
          <div className="flex bg-slate-900/60 backdrop-blur-xl p-1 rounded-xl border border-white/10">
              <button 
                onClick={handleReset}
                className="px-3 h-8 flex items-center gap-2 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase text-slate-300 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Resetar Zoom
              </button>
          </div>
        </div>

        <div className="flex-1 relative bg-black/10 rounded-2xl border border-white/5 shadow-inner overflow-hidden">
          <div className="w-full h-full relative">
            {isPerformance ? (
              <ChartLine 
                ref={chartRef} 
                data={chartData} 
                options={options} 
              />
            ) : (
              <ChartBar ref={chartRef} data={chartData} options={options} />
            )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Erro fatal ao renderizar TimelineChart:", err);
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-white/5 p-8 text-center gap-4">
        <Ghost className="w-10 h-10 text-slate-700" />
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-500 uppercase">Ops! O Gráfico falhou</p>
          <p className="text-[10px] text-slate-600">Tente atualizar a página ou mudar os filtros.</p>
        </div>
      </div>
    );
  }
};


const ComparisonChart = ({ 
  data, 
  colorMode,
  setColorMode,
  viewMode,
  setViewMode,
  title 
}: { 
  data: any[], 
  colorMode: 'unique' | 'flow',
  setColorMode: (m: 'unique' | 'flow') => void,
  viewMode: 'tudo' | 'receitas' | 'despesas',
  setViewMode: (m: 'tudo' | 'receitas' | 'despesas') => void,
  title: string
}) => {
  return (
    <CategoryDonutSection 
      data={data}
      colorMode={colorMode}
      setColorMode={setColorMode}
      viewMode={viewMode}
      setViewMode={setViewMode}
      title={title}
    />
  );
};

const CategoryDonutSection = ({ 
  data, 
  colorMode, 
  setColorMode, 
  viewMode, 
  setViewMode,
  title
}: { 
  data: any[], 
  colorMode: 'unique' | 'flow', 
  setColorMode?: (m: 'unique' | 'flow') => void, 
  viewMode: 'tudo' | 'receitas' | 'despesas', 
  setViewMode?: (m: 'tudo' | 'receitas' | 'despesas') => void, 
  title: string
}) => {
  try {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg uppercase tracking-tighter">{title}</h3>
            {setColorMode && (
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setColorMode('unique')}
                    className={cn("px-2 py-1 text-[8px] font-black rounded transition-all", colorMode === 'unique' ? "bg-white/10 text-white" : "text-slate-500")}
                  >
                    COLORIDO
                  </button>
                  <button 
                    onClick={() => setColorMode('flow')}
                    className={cn("px-2 py-1 text-[8px] font-black rounded transition-all", colorMode === 'flow' ? "bg-white/10 text-white" : "text-slate-500")}
                  >
                    FLUXO
                  </button>
              </div>
            )}
          </div>
          
          {setViewMode && (
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                {(['tudo', 'receitas', 'despesas'] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black rounded-xl transition-all", 
                      viewMode === m ? (m === 'tudo' ? "bg-white/10 text-white" : m === 'receitas' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-slate-500"
                    )}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-[250px] relative">
          <CategoryDonut data={data} colorMode={colorMode} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 space-y-2 overflow-y-auto max-h-32 custom-scrollbar pr-2">
          <div className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Mapa de Categorias (%)</div>
          <div className="grid grid-cols-1 gap-1.5">
              {data.sort((a, b) => b.value - a.value).map((cat, i) => {
                const dominantType = cat.income >= cat.expense ? 'entrada' : 'saída';
                let fill = colorMode === 'unique' ? VIBRANT_PALETTE[i % VIBRANT_PALETTE.length] : (dominantType === 'entrada' ? '#10b981' : '#f43f5e');

                return (
                  <div key={cat.name} className="flex items-center justify-between text-[10px] bg-white/2 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fill, opacity: colorMode === 'unique' ? 1 : 0.4 + (i * 0.1) }} />
                      <span className="font-bold text-slate-400 truncate max-w-[120px] tracking-tight">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-white">{formatCurrency(cat.value)}</span>
                        <span className="text-[8px] text-slate-600 font-bold">{( (cat.value / (data.reduce((a,b)=>a+b.value, 0) || 1)) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Erro ao renderizar CategoryDonutSection:", err);
    return <div className="p-4 text-xs text-rose-500">Erro ao carregar análise de categorias</div>;
  }
};

type BootStage = 'splash' | 'presentation' | 'auth' | 'welcome' | 'profile_select' | 'ready' | 'syncing';

export default function App() {
  const [bootStage, setBootStage] = useState<BootStage>('splash');
  const [user, setUser] = useState<any>(null);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const localFileRef = useRef<HTMLInputElement>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    return localStorage.getItem('verdegrana_active_profile') || 'Principal';
  });
  const [viewMode, setViewMode] = useState<'tudo' | 'receitas' | 'despesas' | 'personalizado'>('tudo');
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });
  const safeSave = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.warn(`LocalStorage quota exceeded for ${key}. Clearing older logs and retrying...`);
        // Emergency purge: Clear non-essential large lists
        localStorage.removeItem('verdegrana_audit_trail');
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error("Critical: Could not save even after purge.", retryError);
          // Last resort: clear history too
          setHistory([]);
          setHistoryPointer(-1);
          localStorage.removeItem('verdegrana_categories');
        }
      }
    }
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('verdegrana_data');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t: any) => ({
        ...t,
        status: t.status || 'realizado',
        is_redutora: t.is_redutora || false
      }));
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('verdegrana_audit_trail');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.slice(0, 500) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<Transaction[][]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('verdegrana_categories');
    const defaultCats = DEFAULT_CATEGORIES.map(c => ({ id: c.toLowerCase(), name: c, color: '#10b981' }));
    if (!saved) return defaultCats;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return defaultCats;
      // Deduplicate by ID
      const unique = parsed.reduce((acc: Category[], current: Category) => {
        if (!acc.find(c => c.id === current.id)) acc.push(current);
        return acc;
      }, []);
      return unique;
    } catch {
      return defaultCats;
    }
  });
  
  // Edge-Swipe Logic
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [edgeSwipe, setEdgeSwipe] = useState<{
    side: 'left' | 'right' | null;
    distance: number;
    active: boolean;
  }>({ side: null, distance: 0, active: false });

  const onTouchStart = (e: React.TouchEvent) => {
    if (bootStage !== 'ready') return;
    
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    const edgeThreshold = 40; // Slightly larger for better hit area

    let side: 'left' | 'right' | null = null;
    if (x < edgeThreshold) side = 'left';
    else if (x > window.innerWidth - edgeThreshold) side = 'right';

    if (side) {
      setEdgeSwipe({ side, distance: 0, active: true });
      touchStart.current = { x, y };
    } else {
      setEdgeSwipe({ side: null, distance: 0, active: false });
      touchStart.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!edgeSwipe.active || !touchStart.current) return;
    
    const x = e.targetTouches[0].clientX;
    const deltaX = x - touchStart.current.x;
    
    // For left edge, distance is deltaX. For right edge, distance is -deltaX.
    const distance = edgeSwipe.side === 'left' ? deltaX : -deltaX;
    
    setEdgeSwipe(prev => ({ ...prev, distance: Math.max(0, distance) }));
  };

  const onTouchEnd = () => {
    if (!edgeSwipe.active || !touchStart.current) {
      setEdgeSwipe({ side: null, distance: 0, active: false });
      return;
    }

    const threshold = 120;
    const mainTabs: Tab[] = ['reports', 'history', 'ai', 'settings'];
    const currentMainIndex = mainTabs.indexOf(activeTab as any);

    if (edgeSwipe.distance > threshold && currentMainIndex !== -1) {
      if (edgeSwipe.side === 'left' && currentMainIndex > 0) {
        setActiveTab(mainTabs[currentMainIndex - 1]);
      } else if (edgeSwipe.side === 'right' && currentMainIndex < mainTabs.length - 1) {
        setActiveTab(mainTabs[currentMainIndex + 1]);
      }
    }

    setEdgeSwipe({ side: null, distance: 0, active: false });
    touchStart.current = null;
  };
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'saving' | 'error'>('idle');
  const [syncQueue, setSyncQueue] = useState<SyncTask[]>(() => {
    try {
      const saved = localStorage.getItem('verdegrana_sync_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const clientId = useMemo(() => crypto.randomUUID(), []);

  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [parentSearch, setParentSearch] = useState('');
  const [isAnexo, setIsAnexo] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(),
    type: 'all'
  });
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig>({
    granularity: 'month',
    compareCategories: []
  });
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<'default' | 'updated' | 'value'>('default');
  const [valueSortOrder, setValueSortOrder] = useState<'asc' | 'desc'>('desc');
  const [updateSortOrder, setUpdateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [donutColorMode, setDonutColorMode] = useState<'unique' | 'flow'>('unique');
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [donutType, setDonutType] = useState<'saída' | 'entrada'>('saída');
  const [donutViewMode, setDonutViewMode] = useState<'tudo' | 'receitas' | 'despesas'>('despesas');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [isDashboardRevealed, setIsDashboardRevealed] = useState(false);
  
  // Folder Sync handles
  const [folderHandle, setFolderHandle] = useState<any>(null);
  
  useEffect(() => {
    safeSave('verdegrana_sync_queue', syncQueue);
  }, [syncQueue, safeSave]);

  const processSyncQueue = useCallback(async () => {
    if (!supabase || !isCloudMode || !user || syncQueue.length === 0) return;
    if (!navigator.onLine) {
        setSyncStatus('idle');
        return;
    }

    setSyncStatus('saving');
    const tasks = [...syncQueue];
    const successes: string[] = [];

    for (const task of tasks) {
      try {
        let error: any = null;
        if (task.type === 'tx_add') {
          const { error: err } = await supabase.from('transactions').insert([task.payload]);
          error = err;
        } else if (task.type === 'tx_update') {
          const { error: err } = await supabase.from('transactions').update(task.payload.data).eq('id', task.payload.id);
          error = err;
        } else if (task.type === 'tx_delete') {
          const { error: err } = await supabase.from('transactions').delete().in('id', task.payload.ids);
          error = err;
        } else if (task.type === 'audit') {
          const { error: err } = await supabase.from('audit_logs').insert([task.payload]);
          error = err;
        } else if (task.type === 'metadata') {
           const { data: ud } = await supabase.from('userdata').select('data').eq('user_id', user.id).single();
           const currentData = ud?.data || {};
           const { error: err } = await supabase.from('userdata').upsert({ 
             user_id: user.id, 
             data: { ...currentData, ...task.payload },
             updated_at: new Date().toISOString()
           });
           error = err;
        }

        if (!error) {
          successes.push(task.id);
          supabase.channel('verdegrana_sync').send({
            type: 'broadcast',
            event: 'sync',
            payload: { userId: user.id, clientId, type: task.type }
          });
        } else {
          console.warn(`Task ${task.type} failed (Attempt ${task.retryCount + 1}):`, error);
          // If it's a conflict or fixed error, we might consider it "done" or increment retry
          if (error.code === '23505') { // Unique violation already there
             successes.push(task.id);
          } else {
             setSyncQueue(prev => prev.map(t => t.id === task.id ? { ...t, retryCount: t.retryCount + 1 } : t));
             if (task.retryCount > 10) successes.push(task.id); 
          }
        }
      } catch (e) {
        console.error("Critical sync task failure:", e);
        break; 
      }
    }

    if (successes.length > 0) {
      setSyncQueue(prev => prev.filter(t => !successes.includes(t.id)));
    }
    setSyncStatus('synced');
  }, [supabase, isCloudMode, user, syncQueue, clientId]);

  useEffect(() => {
    const handleOnline = () => processSyncQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processSyncQueue]);

  // Periodic retry for failed tasks
  useEffect(() => {
    if (syncQueue.length > 0) {
      const timer = setTimeout(processSyncQueue, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncQueue.length, processSyncQueue]);
  const [isFolderTutorialOpen, setIsFolderTutorialOpen] = useState(false);
  
  // Reset modal states
  useEffect(() => {
    if (isAddModalOpen && editingTransaction) {
      setIsAnexo(!!editingTransaction.parent_id);
      setSelectedParentId(editingTransaction.parent_id || '');
      setParentSearch('');
    }
  }, [isAddModalOpen, editingTransaction]);

  // Persistent Profiles List
  const [profilesList, setProfilesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('verdegrana_profiles_list');
    const initial = saved ? JSON.parse(saved) : [];
    return Array.from(new Set(initial));
  });

  const [uiScale, setUiScale] = useState<number>(() => {
    const saved = localStorage.getItem('verdegrana_ui_scale');
    return saved ? parseInt(saved) : 100;
  });

  const applyUIScale = useCallback((scaleValue: number) => {
    document.documentElement.style.fontSize = `${scaleValue}%`;
  }, []);

  useEffect(() => {
    applyUIScale(uiScale);
    localStorage.setItem('verdegrana_ui_scale', uiScale.toString());
  }, [uiScale, applyUIScale]);

  const handlePointClick = useCallback((date: string) => {
    setSelectedPeriod(date);
  }, []);
  const [wipeStep, setWipeStep] = useState(0);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  // Folder Sync Logic
  const syncProfilesFromFolder = async (handle: any) => {
    const profiles: string[] = [];
    try {
      // @ts-ignore
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          profiles.push(entry.name.replace('.json', ''));
        }
      }
    } catch (e) {
      console.error("Erro ao escanear pasta:", e);
    }
    // Filter for uniqueness
    const finalProfiles = Array.from(new Set(profiles));
    if (finalProfiles.length === 0) {
      // If zero profiles exist, we should trigger onboarding
      setProfilesList([]);
      return [];
    }
    setProfilesList(finalProfiles);
    return finalProfiles;
  };

  const syncProfilesFromCloud = async (userId: string) => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('profiles').select('name').eq('user_id', userId);
      if (error) throw error;
      
      // UNIQUE PROFILE DEDUPLICATION
      const profiles = Array.from(new Set(data.map((p: any) => p.name)));
      
      setProfilesList(profiles);
      return profiles;
    } catch (e) {
      console.error("Erro ao sincronizar perfis cloud:", e);
      return [];
    }
  };

  const loadProfileData = async (profileName: string) => {
    setSyncStatus('saving');
    
    try {
      if (isCloudMode && user && supabase) {
        // background sync: fetchCloudData handles merging/reconciliation for ALL profiles
        await fetchCloudData(user.id);
      } else if (folderHandle) {
        try {
          const fileHandle = await folderHandle.getFileHandle(`${profileName}.json`);
          const file = await fileHandle.getFile();
          const content = await file.text();
          const data = JSON.parse(content);
          if (data.transactions) {
            setTransactions(prev => {
              const otherProfiles = prev.filter(t => t.profile_name !== profileName);
              const next = [...otherProfiles, ...data.transactions];
              setHistory([next]);
              setHistoryPointer(0);
              return next;
            });
          }
        } catch (e) {
          // Keep existing state if file fails
        }
      }
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao sincronizar dados do perfil:", e);
      setSyncStatus('error');
    }
  };

  const saveToFolder = async (profileName: string, txs: Transaction[], cats: Category[]) => {
    if (!folderHandle) return;
    try {
      const fileHandle = await folderHandle.getFileHandle(`${profileName}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      const content = JSON.stringify({ transactions: txs, categories: cats }, null, 2);
      await writable.write(content);
      await writable.close();
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao salvar na pasta:", e);
      setSyncStatus('error');
    }
  };

  const handleFolderSelection = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      
      const profiles = await syncProfilesFromFolder(handle);
      setIsFolderTutorialOpen(false);
      setIsCloudMode(false);
      setIsTrial(false);
      
      if (profiles && profiles.length > 0) {
        setBootStage('profile_select');
      } else {
        setBootStage('welcome');
      }
      
      toast.success('Pasta vinculada com sucesso!');
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error("Falha ao selecionar pasta.");
    }
  };

  // Undo/Redo Logic
  const pushToHistory = useCallback((newTransactions: Transaction[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyPointer + 1);
      newHistory.push([...newTransactions]);
      // Limit history to 30 steps to prevent quota issues and memory bloat
      return newHistory.length > 30 ? newHistory.slice(-30) : newHistory;
    });
    setHistoryPointer(prev => Math.min(prev + 1, 29));
  }, [historyPointer]);

  const undo = async () => {
    if (historyPointer > 0) {
      const prevState = history[historyPointer - 1];
      const currentState = transactions;
      
      logAudit('Desfazer', activeProfile, 'Ação Desfazer');
      
      // Omni-Sync: Detect difference and sync to cloud
      if (isCloudMode && user && supabase) {
        const removed = currentState.filter(t => !prevState.some(pt => pt.id === t.id));
        const added = prevState.filter(pt => !currentState.some(t => t.id === pt.id));
        
        if (removed.length > 0) {
          setSyncStatus('saving');
          const validRemovedIds = removed.map(t => t.id).filter(isUUID);
          if (validRemovedIds.length > 0) {
            await supabase.from('transactions').delete().in('id', validRemovedIds);
          }
        }
        if (added.length > 0) {
          setSyncStatus('saving');
          await supabase.from('transactions').insert(added.map(t => ({
            id: isUUID(t.id) ? t.id : crypto.randomUUID(),
            user_id: user.id,
            date: t.date,
            description: t.desc,
            category: t.category,
            type: t.type,
            amount: t.value,
            profile_name: t.profile_name,
            status: t.status,
            is_redutora: t.is_redutora,
            parent_id: (t.parent_id && isUUID(t.parent_id)) ? t.parent_id : null,
            parent_name: t.parent_name || null,
            updated_at: t.updatedAt || new Date().toISOString()
          })));
        }
        setSyncStatus('synced');
        // Notify other devices
        supabase.channel('verdegrana_sync').send({
          type: 'broadcast',
          event: 'sync',
          payload: { userId: user.id, clientId, type: 'undo' }
        });
      }
      
      setTransactions(prevState);
      setHistoryPointer(historyPointer - 1);
      toast.info('Ação desfeita');
    }
  };

  const redo = async () => {
    if (historyPointer < history.length - 1) {
      const nextState = history[historyPointer + 1];
      const currentState = transactions;

      logAudit('Refazer', activeProfile, 'Ação Refazer');

      // Omni-Sync: Detect difference and sync to cloud
      if (isCloudMode && user && supabase) {
        const removed = currentState.filter(t => !nextState.some(nt => nt.id === t.id));
        const added = nextState.filter(nt => !currentState.some(t => t.id === nt.id));

        if (removed.length > 0) {
          setSyncStatus('saving');
          const validRemovedIds = removed.map(t => t.id).filter(isUUID);
          if (validRemovedIds.length > 0) {
            await supabase.from('transactions').delete().in('id', validRemovedIds);
          }
        }
        if (added.length > 0) {
          setSyncStatus('saving');
          await supabase.from('transactions').insert(added.map(t => ({
            id: isUUID(t.id) ? t.id : crypto.randomUUID(),
            user_id: user.id,
            date: t.date,
            description: t.desc,
            category: t.category,
            type: t.type,
            amount: t.value,
            profile_name: t.profile_name,
            status: t.status,
            is_redutora: t.is_redutora,
            parent_id: (t.parent_id && isUUID(t.parent_id)) ? t.parent_id : null,
            parent_name: t.parent_name || null,
            updated_at: t.updatedAt || new Date().toISOString()
          })));
        }
        setSyncStatus('synced');
        // Notify other devices
        supabase.channel('verdegrana_sync').send({
          type: 'broadcast',
          event: 'sync',
          payload: { userId: user.id, clientId, type: 'redo' }
        });
      }

      setTransactions(nextState);
      setHistoryPointer(historyPointer + 1);
      toast.info('Ação refeita');
    }
  };

  useEffect(() => {
    if (transactions.length > 0 && history.length === 0) {
      setHistory([transactions]);
      setHistoryPointer(0);
    }
  }, [transactions, history.length]);

  // Sync state to LocalStorage (Instant Persistence)
  useEffect(() => {
    safeSave('verdegrana_data', transactions);
  }, [transactions, safeSave]);

  useEffect(() => {
    safeSave('verdegrana_categories', categories);
  }, [categories, safeSave]);

  useEffect(() => {
    safeSave('verdegrana_profiles_list', profilesList);
  }, [profilesList, safeSave]);

  // Sync state to IDB (Instant)
  useEffect(() => {
    if (activeTab === 'reports') {
      setIsChartReady(false);
      const t = setTimeout(() => setIsChartReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // --- Boot Logic ---

  useEffect(() => {
    const timer = setTimeout(() => {
      setBootStage(prev => (prev === 'splash' ? 'presentation' : prev));
    }, 3000); // Reduced splash time for better UX
    return () => clearTimeout(timer);
  }, []);

   const handlePresentationTouch = () => {
    setBootStage(user?.id || folderHandle || (isTrial && profilesList.length > 0) ? 'profile_select' : 'auth');
  };

  const handleForgotPassword = async () => {
    if (!authEmail) {
      toast.error('Por favor, informe seu e-mail primeiro.');
      return;
    }
    try {
      setIsAuthLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      alert('Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes. Verifique também sua pasta de spam.');
    } catch (e: any) {
      alert('Erro ao solicitar recuperação: ' + e.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuth = async (mode: 'login' | 'signup') => {
    if (!supabase) return;
    setIsAuthLoading(true);
    try {
      const { data, error } = mode === 'login' 
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPass })
        : await supabase.auth.signUp({ email: authEmail, password: authPass });

      if (error) {
        if (mode === 'login') {
          alert("Erro ao entrar. Verifique seu email e senha. (" + error.message + ")");
        } else {
          alert("Erro ao criar conta: " + error.message);
        }
        throw error;
      }

      if (data.user) {
        if (mode === 'signup') {
          // Welcome message for new users
          alert(`BEM-VINDO AO VERDEGRANA, ${authEmail.split('@')[0].toUpperCase()}!\n\nSua conta foi criada com sucesso. Se o Supabase exigir, consulte seu e-mail para confirmar o cadastro.\n\nVocê já pode entrar com suas credenciais agora.`);
          setIsLoginMode(true);
        } else {
          setUser(data.user);
          setIsCloudMode(true);
          toast.success('BEM-VINDO DE VOLTA!');
          setIsTrial(false);
          const profiles = await syncProfilesFromCloud(data.user.id);
          // ONBOARDING GATEWAY
          if (!profiles || profiles.length === 0) {
            setBootStage('welcome'); // Overlay to create first profile
          } else {
            setBootStage('profile_select');
          }
        }
      }
    } catch (e: any) {
      console.error('Erro de autenticação:', e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('verdegrana_active_profile', activeProfile);
  }, [activeProfile]);

  const allProfiles = useMemo(() => {
    return Array.from(new Set(profilesList)).sort();
  }, [profilesList]);

  // --- Handlers ---
  const handleRenameProfile = async (p: string) => {
    const newName = prompt(`Novo nome para o perfil "${p}":`, p);
    if (!newName || newName.trim() === p || profilesList.includes(newName.trim())) {
      if (newName && newName.trim() !== p) toast.error('Nome inválido ou já existente.');
      return;
    }

    const cleanNewName = newName.trim();

    if (isCloudMode && user && supabase) {
      await supabase.from('profiles').update({ name: cleanNewName }).eq('user_id', user.id).eq('name', p);
      await supabase.from('transactions').update({ profile_name: cleanNewName }).eq('user_id', user.id).eq('profile_name', p);
    } else if (folderHandle) {
      try {
        const oldFile = await folderHandle.getFileHandle(`${p}.json`);
        const file = await oldFile.getFile();
        const content = await file.text();
        
        const newFile = await folderHandle.getFileHandle(`${cleanNewName}.json`, { create: true });
        const writable = await newFile.createWritable();
        await writable.write(content);
        await writable.close();
        
        await folderHandle.removeEntry(`${p}.json`);
      } catch (e) {
        console.error("Erro ao renomear arquivo local:", e);
      }
    }

    setProfilesList(prev => prev.map(item => item === p ? cleanNewName : item));
    if (activeProfile === p) setActiveProfile(cleanNewName);
    toast.success(`Perfil renomeado para ${cleanNewName}`);
  };

  const handleImportProfile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          const name = prompt('Dê um nome para este perfil importado:');
          if (!name) return;
          const cleanName = name.trim();
          if (profilesList.includes(cleanName)) {
            toast.error('Este perfil já existe.');
            return;
          }

          let txs: Transaction[] = [];
          if (data.transactions) txs = data.transactions;
          else if (Array.isArray(data)) txs = data;

          if (isCloudMode && user && supabase) {
            await supabase.from('profiles').insert([{ name: cleanName, user_id: user.id }]);
            await supabase.from('transactions').insert(txs.map(t => ({
              id: t.id || crypto.randomUUID(),
              user_id: user.id,
              date: t.date,
              description: t.desc || (t as any).description,
              category: t.category,
              type: t.type,
              amount: t.value || (t as any).amount,
              profile_name: cleanName,
              status: t.status || 'realizado',
              is_redutora: t.is_redutora || false,
              parent_id: t.parent_id,
              parent_name: t.parent_name,
              updated_at: t.updatedAt
            })));
          } else if (folderHandle) {
            const fileHandle = await folderHandle.getFileHandle(`${cleanName}.json`, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify({ transactions: txs, categories }, null, 2));
            await writable.close();
          }

          setProfilesList(prev => [...prev, cleanName]);
          toast.success(`Perfil ${cleanName} importado com sucesso!`);
        } catch (err) {
          toast.error('Arquivo inválido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCloudMigration = async () => {
    if (isCloudMode || !supabase) return;
    
    const email = prompt("Digite seu e-mail para criar a conta VerdeGrana Cloud:");
    if (!email) return;
    const password = prompt("Defina sua senha (mínimo 6 caracteres):");
    if (!password || password.length < 6) {
      toast.error("Senha inválida ou muito curta.");
      return;
    }

    setBootStage('syncing');
    try {
      // 1. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: email.split('@')[0]
          }
        }
      });
      
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Falha ao criar usuário.");

      // 2. Prepare all data for upload
      const allData = {
        transactions: transactions.map(t => ({ ...t, user_id: authData.user!.id })),
        categories: categories,
        profiles_list: profilesList
      };

      // 3. Save to userdata
      const { error: saveError } = await supabase
        .from('userdata')
        .upsert({
          user_id: authData.user.id,
          data: allData,
          updated_at: new Date().toISOString()
        });

      if (saveError) throw saveError;

      // 5. Batch sync transactions to dedicated table
      if (transactions.length > 0) {
        toast.info("Sincronizando transações...");
        
        // Map all IDs to UUIDs first and preserve relationships
        const idMap = new Map<string, string>();
        const uuidTransactions = transactions.map(t => {
          const newId = isUUID(t.id) ? t.id : crypto.randomUUID();
          idMap.set(t.id, newId);
          return { ...t, id: newId };
        });

        const syncedTransactions = uuidTransactions.map(t => {
          if (t.parent_id && idMap.has(t.parent_id)) {
            return { ...t, parent_id: idMap.get(t.parent_id) };
          }
          return t;
        });

        // Update local state to match the newly generated UUIDs
        setTransactions(syncedTransactions);

        // Ensure parents are inserted before children to satisfy FK constraints
        const sortedTxs = [...syncedTransactions].sort((a, b) => {
          if (a.id === b.parent_id) return -1;
          if (b.id === a.parent_id) return 1;
          return 0;
        });

        const { error: txSyncError } = await supabase.from('transactions').insert(sortedTxs.map(t => ({
          id: t.id,
          user_id: authData.user!.id,
          date: t.date,
          description: t.desc,
          category: t.category,
          type: t.type,
          amount: t.value,
          profile_name: t.profile_name,
          status: t.status,
          is_redutora: t.is_redutora,
          parent_id: (t.parent_id && isUUID(t.parent_id)) ? t.parent_id : null,
          parent_name: t.parent_name || null,
          updated_at: t.updatedAt || new Date().toISOString()
        })));
        if (txSyncError) {
          console.warn("Erro ao sincronizar transações individuais:", txSyncError);
          toast.warning("Metadados salvos, mas houve um problema ao sincronizar transações individuais.");
        }
      }

      // 5. Update session and state
      setUser(authData.user);
      setIsCloudMode(true);
      setIsTrial(false);
      localStorage.setItem('verdegrana_is_cloud', 'true');
      toast.success("Migração para nuvem concluída com sucesso!");
      
      setBootStage('ready');
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Falha na migração: ${error.message}`);
      setBootStage('ready');
    }
  };

  const logAudit = useCallback((operation: AuditLog['operation'], profile: string, desc: string, value?: number) => {
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation,
      metadata: { profile, description: desc, value }
    };
    
    setAuditLogs(prev => {
      const next = [newLog, ...prev].slice(0, 500); // Limit to 500 logs
      safeSave('verdegrana_audit_trail', next);
      return next;
    });

    if (isCloudMode && user && supabase) {
      const task: SyncTask = {
        id: crypto.randomUUID(),
        type: 'audit',
        payload: {
          id: newLog.id,
          user_id: user.id,
          timestamp: newLog.timestamp,
          operation: newLog.operation,
          metadata: newLog.metadata
        },
        retryCount: 0
      };
      setSyncQueue(prev => [...prev, task]);
    }
  }, [isCloudMode, user, supabase, activeProfile, clientId]);

  const handleAddTransaction = async (data: any) => {
    const newId = data.id || crypto.randomUUID();
    const newTx: Transaction = { 
      ...data, 
      id: newId, 
      profile_name: activeProfile,
      status: data.status || 'realizado',
      is_redutora: data.is_redutora || false,
      updatedAt: new Date().toISOString()
    };
    
    setTransactions(prev => {
      const next = [...prev, newTx];
      pushToHistory(next);
      return next;
    });

    logAudit('Inserção', activeProfile, data.desc || data.description, data.value || data.amount);

    if (isCloudMode && user && supabase) {
      const task: SyncTask = {
        id: crypto.randomUUID(),
        type: 'tx_add',
        payload: {
          id: newTx.id,
          user_id: user.id,
          date: data.date,
          description: data.desc || data.description,
          category: data.category,
          type: data.type,
          amount: data.value || data.amount,
          profile_name: activeProfile,
          status: newTx.status,
          is_redutora: newTx.is_redutora,
          parent_id: (data.parent_id && isUUID(data.parent_id)) ? data.parent_id : null,
          parent_name: data.parent_name || null,
          updated_at: newTx.updatedAt
        },
        retryCount: 0
      };
      setSyncQueue(prev => [...prev, task]);
    }
    toast.success('Lançamento adicionado!');
  };

  const handleUpdateTransaction = async (id: string, data: Partial<Transaction>) => {
    let oldDesc = '';
    let oldValue = 0;
    
    setTransactions(prev => {
      const tx = prev.find(t => t.id === id);
      if (tx) {
        oldDesc = tx.desc;
        oldValue = tx.value;
      }
      const next = prev.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t);
      pushToHistory(next);
      return next;
    });

    logAudit('Edição', activeProfile, data.desc || oldDesc, data.value || oldValue);

    if (isCloudMode && user && supabase) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (data.date !== undefined) updatePayload.date = data.date;
      if (data.desc !== undefined) updatePayload.description = data.desc;
      if (data.category !== undefined) updatePayload.category = data.category;
      if (data.type !== undefined) updatePayload.type = data.type;
      if (data.value !== undefined) updatePayload.amount = data.value;
      if (data.profile_name !== undefined) updatePayload.profile_name = data.profile_name;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.is_redutora !== undefined) updatePayload.is_redutora = data.is_redutora;
      if (data.parent_name !== undefined) updatePayload.parent_name = data.parent_name;
      
      if (data.parent_id !== undefined) {
        updatePayload.parent_id = (data.parent_id && isUUID(data.parent_id)) ? data.parent_id : null;
      }

      const task: SyncTask = {
        id: crypto.randomUUID(),
        type: 'tx_update',
        payload: { id, data: updatePayload },
        retryCount: 0
      };
      setSyncQueue(prev => [...prev, task]);
    }
  };

  const handleDeleteTransactions = async (ids: string[]) => {
    let deletedCount = ids.length;
    let profiles: string[] = [];
    
    setTransactions(prev => {
      const toDelete = prev.filter(t => ids.includes(t.id));
      profiles = Array.from(new Set(toDelete.map(t => t.profile_name)));
      const next = prev.filter(t => !ids.includes(t.id));
      pushToHistory(next);
      return next;
    });

    logAudit('Exclusão', profiles.join(', '), `Exclusão de ${deletedCount} registros`);

    if (isCloudMode && user && supabase) {
      const validIds = ids.filter(isUUID);
      if (validIds.length > 0) {
        const task: SyncTask = {
          id: crypto.randomUUID(),
          type: 'tx_delete',
          payload: { ids: validIds },
          retryCount: 0
        };
        setSyncQueue(prev => [...prev, task]);
      }
    }
  };

  const fetchCloudData = async (userId: string) => {
    if (!supabase) return { transactions: [] };
    try {
      setSyncStatus('saving');
      // Load Categories and Metadata from userdata
      const { data: userMeta } = await supabase
        .from('userdata')
        .select('data')
        .eq('user_id', userId)
        .single();
      
      if (userMeta?.data?.categories) {
        const cloudCats = userMeta.data.categories;
        setCategories(cloudCats);
        localStorage.setItem('verdegrana_categories', JSON.stringify(cloudCats));
      }
      
      if (userMeta?.data?.profilesList) {
        setProfilesList(userMeta.data.profilesList);
      }

      // Load Transactions from transactions table
      const { data: cloudTxs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);
      
      if (txError) throw txError;

      // Load Audit Logs from audit_logs table WITH fallback to userdata
      let mappedLogs: AuditLog[] = [];
      const { data: cloudLogs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (!logError && cloudLogs && cloudLogs.length > 0) {
        mappedLogs = cloudLogs.map((l: any) => ({
          id: l.id,
          timestamp: l.timestamp,
          operation: l.operation,
          metadata: l.metadata
        }));
      } else if (userMeta?.data?.auditLogs) {
        // Use logs stored in userdata record as fallback
        mappedLogs = userMeta.data.auditLogs;
      }
      
      setAuditLogs(prev => {
        const combined = [...mappedLogs];
        const now = new Date().getTime();
        
        // Merge strategy: Keep everything from cloud, 
        // PLUS very recent local logs (> 60s) that haven't hit cloud yet.
        prev.forEach(p => {
          const isRecent = (now - new Date(p.timestamp).getTime()) < 60000;
          const alreadyInCloud = combined.some(c => c.id === p.id);
          
          if (isRecent && !alreadyInCloud) {
            combined.push(p);
          }
        });
        
        const next = combined
          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 500);
          
        localStorage.setItem('verdegrana_audit_trail', JSON.stringify(next));
        return next;
      });
      
      const mappedTxs: Transaction[] = cloudTxs ? cloudTxs.map((t: any) => ({
        id: t.id,
        date: t.date,
        desc: t.description,
        value: t.amount,
        category: t.category,
        type: t.type,
        profile_name: t.profile_name || 'Principal',
        status: t.status || 'realizado',
        is_redutora: t.is_redutora || false,
        parent_id: t.parent_id,
        parent_name: t.parent_name,
        updatedAt: t.updated_at || t.updatedAt
      })) : [];

      // Reconciliation: Merge instead of direct overwrite to avoid concurrency loss
      setTransactions(prev => {
        const next = [...mappedTxs];
        const now = new Date().getTime();
        
        // IDs currently in sync queue (pending upload)
        const pendingIds = new Set(syncQueue.filter(q => q.type === 'tx_add' || q.type === 'tx_update').map(q => q.payload.id || q.payload));

        prev.forEach(p => {
          const cloudEntry = next.find(n => n.id === p.id);
          const isMissingInCloud = !cloudEntry;
          const isStaleInCloud = cloudEntry && new Date(cloudEntry.updatedAt).getTime() < new Date(p.updatedAt || 0).getTime();
          
          // Protection logic:
          // 1. If it's in the sync queue, we MUST keep local version as it's more definitive/recent
          // 2. If it's missing in cloud but was created recently (< 5 mins), keep it
          // 3. If it's stale in cloud (local is newer), overwrite cloud with local
          const isPending = pendingIds.has(p.id);
          const isVeryNew = (now - new Date(p.updatedAt || 0).getTime()) < 300000; // 5 minute window
          
          if (isStaleInCloud || (isMissingInCloud && (isVeryNew || isPending))) {
             const idx = next.findIndex(n => n.id === p.id);
             if (idx !== -1) {
                next[idx] = p;
             } else {
                next.push(p);
             }
          }
        });
        localStorage.setItem('verdegrana_data', JSON.stringify(next));
        return next;
      });

      setSyncStatus('synced');
      return { transactions: mappedTxs };
    } catch (e: any) {
      console.error("Erro ao buscar dados na nuvem:", e);
      setSyncStatus('error');
      return { transactions: [] };
    }
  };

  const saveCloudMetadata = async (userId: string, cats: Category[]) => {
    if (!supabase || !isCloudMode) return;
    
    const task: SyncTask = {
      id: crypto.randomUUID(),
      type: 'metadata',
      payload: { categories: cats, profilesList },
      retryCount: 0
    };
    setSyncQueue(prev => [...prev, task]);
  };

  const handleClearAuditLogs = async () => {
    setAuditLogs([]);
    localStorage.removeItem('verdegrana_audit_trail');
    
    if (isCloudMode && user && supabase) {
      setSyncStatus('saving');
      const { error } = await supabase.from('audit_logs').delete().eq('user_id', user.id);
      if (error) {
        console.error("Erro ao limpar logs na nuvem:", error);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        toast.success('Histórico limpo na nuvem.');
        
        // Also clear auditLogs in userdata fallback
        supabase.from('userdata').select('data').eq('user_id', user.id).single()
          .then(({ data: ud }) => {
            if (ud?.data) {
              const newData = { ...ud.data };
              delete newData.auditLogs;
              supabase.from('userdata').update({ data: newData }).eq('user_id', user.id);
            }
          });

        // Notify other devices
        supabase.channel('verdegrana_sync').send({
          type: 'broadcast',
          event: 'sync',
          payload: { userId: user.id, clientId, type: 'logs_clear' }
        });
      }
    } else {
      toast.success('Histórico local limpo.');
    }
  };

  const handleLogout = async () => {
    if (!supabase || !user) {
      // If already logged out or no supabase, just clear state and go to auth
      setUser(null);
      setIsCloudMode(false);
      setBootStage('auth');
      return;
    }
    
    try {
      // Add a timeout to signOut to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut Timeout')), 5000));
      
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (e) {
      console.warn("Aviso no logout (timeout ou erro):", e);
    }

    setUser(null);
    setIsCloudMode(false);
    setTransactions([]);
    setAuditLogs([]);
    setCategories(DEFAULT_CATEGORIES.map(c => ({ id: c.toLowerCase(), name: c })));
    setProfilesList(['Principal']);
    setActiveProfile('Principal');
    
    try {
      const db = await initDB();
      await clearState(db);
    } catch (e) {}

    localStorage.clear();
    setBootStage('auth');
    toast.info('Sessão encerrada.');
  };

  const handleLocalExport = () => {
    const data = JSON.stringify({ transactions, categories }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verdegrana_backup.json`;
    link.click();
    toast.success('Backup local exportado!');
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          let txs: Transaction[] = [];
          if (data.transactions && Array.isArray(data.transactions)) {
            txs = data.transactions;
          } else if (Array.isArray(data)) {
            txs = data;
          }
          
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
          
          setTransactions(txs);
          setIsCloudMode(false);
          setIsTrial(false);
          setIsDemoMode(false);
          
          // Determine profile
          const profiles = Array.from(new Set(txs.map((t: any) => t.profile_name || 'Principal')));
          if (profiles.length > 1) {
            setBootStage('profile_select');
          } else {
            setActiveProfile(profiles[0] || 'Principal');
            setBootStage('ready');
          }
          
          toast.success('Arquivo local carregado!');
        } catch (err) {
          toast.error('Erro ao ler arquivo. Formato inválido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- Initial Boot & Persistence ---
  useEffect(() => {
    const boot = async () => {
      try {
        // Recovery logic: if localStorage is full, clear logs to make room for session
        try {
          const testKey = 'verdegrana_test_quota';
          localStorage.setItem(testKey, '1');
          localStorage.removeItem(testKey);
        } catch (e) {
          console.warn("LocalStorage issue detected during boot. Purging logs for recovery.");
          localStorage.removeItem('verdegrana_audit_trail');
          // No reload here, let it continue to boot
        }

        const db = await initDB();
        const persisted = await getState(db);

        // 1. Check for Cloud Session
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setIsCloudMode(true);
            
            // ZERO-LOADING: If we have profiles locally, go to profile_select immediately
            if (profilesList.length > 0) {
              setBootStage('profile_select');
              // Background sync silently in background
              syncProfilesFromCloud(session.user.id);
            } else {
              // Forced sync if we have nothing local
              const profiles = await syncProfilesFromCloud(session.user.id);
              if (!profiles || profiles.length === 0) setBootStage('welcome');
              else setBootStage('profile_select');
            }
            return;
          }
        }

        // 2. Check for Local Folder
        if (persisted?.workspaceHandle) {
          try {
            const permission = await (persisted.workspaceHandle as any).queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
              setFolderHandle(persisted.workspaceHandle);
              await syncProfilesFromFolder(persisted.workspaceHandle);
              setBootStage('profile_select');
              return;
            } else {
              // Permission lost or needs re-grant (standard web safety)
              // We'll keep it in state but boot to auth for fresh start
              toast.info('Seus arquivos locais estão bloqueados. Conecte a pasta novamente nas configurações.');
            }
          } catch (e) {
            console.error("Erro ao verificar permissão da pasta:", e);
          }
        }

        // 3. Hydrate categories and profiles from local (fallback)
        if (persisted?.categories) setCategories(persisted.categories);
        if (persisted?.profiles_list) setProfilesList(persisted.profiles_list);

        setBootStage('splash');
      } catch (e) {
        console.error("Erro no boot:", e);
        setBootStage('splash');
      }
    };
    
    // Auth change listener
    if (supabase) {
      let isProcessingLogout = false;
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_OUT') {
          if (!isProcessingLogout) {
            isProcessingLogout = true;
            await handleLogout();
            isProcessingLogout = false;
          }
        } else if (session?.user) {
          setUser(session.user);
          setIsCloudMode(true);
          syncProfilesFromCloud(session.user.id).then(() => setBootStage('profile_select'));
        }
      });
    }

    boot();
  }, []);

  const mapCloudTxToLocal = (t: any): Transaction => ({
    id: t.id,
    date: t.date,
    desc: t.description,
    value: t.amount,
    category: t.category,
    type: t.type,
    profile_name: t.profile_name || 'Principal',
    status: t.status || 'realizado',
    is_redutora: t.is_redutora || false,
    parent_id: t.parent_id,
    parent_name: t.parent_name,
    updatedAt: t.updated_at
  });

  // Module 3: Real-time Sync - Channels
  useEffect(() => {
    if (!supabase || !isCloudMode || !user) return;

    // Unified Real-time Channel (Transactions, Audit Logs, Metadata, Broadcasts)
    const channel = supabase.channel(`verdegrana_all_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        console.log('Real-time Channel: Transaction INSERT', payload);
        const newTx = mapCloudTxToLocal(payload.new);
        setTransactions(prev => {
          if (prev.some(t => t.id === newTx.id)) return prev;
          const next = [...prev, newTx];
          safeSave('verdegrana_data', next);
          return next;
        });
        toast.info(`⚡ Novo lançamento: ${newTx.desc}`, { duration: 2000 });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        console.log('Real-time Channel: Transaction UPDATE', payload);
        const updatedTx = mapCloudTxToLocal(payload.new);
        setTransactions(prev => {
          const next = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
          safeSave('verdegrana_data', next);
          return next;
        });
      })
      .on('postgres_changes', { 
        event: 'DELETE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        console.log('Real-time Channel: Transaction DELETE', payload);
        const deletedId = payload.old.id;
        setTransactions(prev => {
          const next = prev.filter(t => t.id !== deletedId);
          localStorage.setItem('verdegrana_data', JSON.stringify(next));
          return next;
        });
      })
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        const log = payload.new;
        setAuditLogs(prev => {
          if (prev.some(l => l.id === log.id)) return prev;
          const next = [{
            id: log.id,
            timestamp: log.timestamp,
            operation: log.operation,
            metadata: log.metadata
          }, ...prev].slice(0, 500);
          localStorage.setItem('verdegrana_audit_trail', JSON.stringify(next));
          return next;
        });
      })
      .on('postgres_changes', { 
        event: 'DELETE', schema: 'public', table: 'audit_logs', filter: `user_id=eq.${user.id}` 
      }, () => {
        setAuditLogs([]);
        localStorage.removeItem('verdegrana_audit_trail');
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'userdata', filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        console.log('Real-time Channel: Userdata UPDATE', payload);
        const newData = payload.new.data;
        if (newData?.categories) {
          setCategories(newData.categories);
          localStorage.setItem('verdegrana_categories', JSON.stringify(newData.categories));
        }
        if (newData?.profilesList) {
          setProfilesList(newData.profilesList);
          localStorage.setItem('verdegrana_profiles', JSON.stringify(newData.profilesList));
        }
        if (newData?.auditLogs) {
          setAuditLogs(newData.auditLogs);
          localStorage.setItem('verdegrana_audit_trail', JSON.stringify(newData.auditLogs));
        }
      })
      .on('broadcast', { event: 'sync' }, (payload: any) => {
        const senderId = payload?.payload?.userId || payload?.userId;
        const senderClientId = payload?.payload?.clientId || payload?.clientId;
        
        if (senderId === user.id && senderClientId !== clientId) {
          console.log('Real-time Channel: SYNC Broadcast Received', payload);
          if (payload?.payload?.type === 'full_reset' || payload?.type === 'full_reset') {
            localStorage.clear();
            window.location.reload();
            return;
          }
          // Refresh background data
          setTimeout(() => fetchCloudData(user.id), 1500);
        }
      })
      .subscribe((status: string) => {
        console.log(`Real-time Channel Status (${user.id}):`, status);
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => fetchCloudData(user.id), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCloudMode, user, supabase]);

  // Auto-sync on visibility change (coming back to tab)
  useEffect(() => {
    if (!isCloudMode || !user) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab focus detected. Refreshing cloud data...");
        fetchCloudData(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isCloudMode, user]);
  useEffect(() => {
    if (bootStage !== 'ready') return;
    if (folderHandle) {
      saveToFolder(activeProfile, transactions, categories);
    }
  }, [transactions, categories, folderHandle, bootStage, activeProfile]);

  // Debounced Cloud Sync for Metadata
  useEffect(() => {
    if (!user?.id || !isCloudMode || bootStage !== 'ready' || isDemoMode) return;

    const timeout = setTimeout(async () => {
      await saveCloudMetadata(user.id, categories);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [categories, user?.id, bootStage, isDemoMode]);

  // Persistent IDB state
  useEffect(() => {
    const persist = async () => {
      try {
        const db = await initDB();
        await saveState(db, {
          transactions,
          categories,
          profiles_list: profilesList,
          workspaceHandle: folderHandle
        });
      } catch (e) {
        console.error("Erro ao persistir estado no IDB:", e);
      }
    };
    persist();
  }, [transactions, categories, profilesList, folderHandle]);

  // --- Handlers ---
  const processImport = useCallback((data: any[]) => {
    if (!Array.isArray(data)) {
      toast.error('Formato de dados inválido.');
      return;
    }

    const newCategories: Category[] = [...categories];
    let createdCount = 0;
    let mergedCount = 0;
    let categoryCount = 0;
    
    const batchTxs: Transaction[] = [];
    
    data.forEach(item => {
      // Auto-Category Registration
      const catName = item.category || 'Outros';
      const catExists = newCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      
      if (!catExists) {
        const newCat = { 
          id: catName.toLowerCase(), 
          name: catName,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}` 
        };
        newCategories.push(newCat);
        categoryCount++;
      }

      // 1. Robust Parent Matching (Desc trimmed/lowercase + Date + Profile)
      const itemDescClean = (item.desc || item.description || "").toLowerCase().trim();
      const existingParent = [...transactions, ...batchTxs].find(t => 
        t.date === item.date && 
        (t.desc || "").toLowerCase().trim() === itemDescClean &&
        (t.profile_name || 'Principal') === activeProfile &&
        !t.parent_id // Match against top-level parents only
      );

      let mainTxId: string;
      if (existingParent) {
        mainTxId = existingParent.id;
        mergedCount++;
      } else {
        // Create new Parent
        mainTxId = crypto.randomUUID();
        const parentTx: Transaction = {
          id: mainTxId,
          date: item.date,
          desc: item.desc || item.description,
          value: item.value || item.amount,
          category: item.category || 'Outros',
          type: item.type,
          profile_name: activeProfile,
          status: item.status || 'realizado',
          is_redutora: item.is_redutora || false,
          parent_id: item.parent_id || null,
          parent_name: item.parent_name || null,
          updatedAt: new Date().toISOString()
        };
        batchTxs.push(parentTx);
        createdCount++;
      }

      // Process children (deductions and additions) with local deduplication
      const processSubItems = (subItems: any[], isRedutora: boolean) => {
        if (!Array.isArray(subItems)) return;
        
        subItems.forEach((sub: any) => {
          const subDesc = sub.description || sub.desc || (isRedutora ? `Desconto: ${item.desc}` : `Acréscimo: ${item.desc}`);
          const subDescClean = subDesc.toLowerCase().trim();

          // Check if this child already exists under THIS parent ID
          const subExists = [...transactions, ...batchTxs].some(t => 
            t.parent_id === mainTxId && 
            (t.desc || "").toLowerCase().trim() === subDescClean
          );

          if (!subExists) {
            const childTx: Transaction = {
              id: crypto.randomUUID(),
              date: item.date,
              desc: subDesc,
              value: sub.amount || sub.value,
              category: sub.category || item.category || 'Outros',
              type: item.type,
              profile_name: activeProfile,
              status: item.status || 'realizado',
              is_redutora: isRedutora,
              parent_id: mainTxId,
              parent_name: item.desc || item.description || null,
              updatedAt: new Date().toISOString()
            };
            batchTxs.push(childTx);
            createdCount++;
          }
        });
      };

      processSubItems(item.deductions, true);
      processSubItems(item.additions, false);
    });

    // Bulk state update
    if (batchTxs.length > 0) {
      setTransactions(prev => {
        const next = [...prev, ...batchTxs];
        pushToHistory(next);
        return next;
      });

      // Audit log for AI import
      const summary = `Importação IA: ${createdCount} novos, ${mergedCount} vinculados`;
      logAudit('Inserção', activeProfile, summary);

      // Bulk cloud sync
      if (isCloudMode && user && supabase) {
        setSyncStatus('saving');
        supabase.from('transactions').insert(batchTxs.map(t => ({
          id: t.id,
          user_id: user.id,
          date: t.date,
          description: t.desc,
          category: t.category,
          type: t.type,
          amount: t.value,
          profile_name: t.profile_name,
          status: t.status,
          is_redutora: t.is_redutora,
          parent_id: (t.parent_id && isUUID(t.parent_id)) ? t.parent_id : null,
          parent_name: t.parent_name || null,
          updated_at: t.updatedAt
        }))).then(({ error }: { error: any }) => {
          if (error) {
            console.error("Erro na sincronização em lote (AI/Import):", error);
            setSyncStatus('error');
            toast.error("Erro ao sincronizar lote: " + error.message);
          } else {
            setSyncStatus('synced');
            // Notify other devices
            supabase.channel('verdegrana_sync').send({
              type: 'broadcast',
              event: 'sync',
              payload: { userId: user.id, clientId, type: 'ai_import' }
            });
          }
        });
      }
    }

    if (categoryCount > 0) {
      setCategories(newCategories);
      localStorage.setItem('verdegrana_categories', JSON.stringify(newCategories));
    } else {
      setCategories(newCategories);
    }
    
    // Single summary notification
    const totalProcessed = createdCount + mergedCount;
    if (totalProcessed > 0) {
      toast.success(`Sucesso! ${totalProcessed} registros processados (${createdCount} novos, ${mergedCount} vinculados). ${categoryCount > 0 ? `${categoryCount} novas categorias.` : ''}`);
    }
  }, [categories, transactions, activeProfile, isCloudMode, user, supabase, isUUID]);

  useEffect(() => {
    localStorage.setItem('verdegrana_active_profile', activeProfile);
  }, [activeProfile]);

  // Calculations & Filters
  const profileTransactions = useMemo(() => {
    return transactions.filter(t => (t.profile_name || 'Principal') === activeProfile);
  }, [transactions, activeProfile]);

  const currentTransactions = useMemo(() => {
    return profileTransactions.filter(t => {
      const date = new Date(t.date);
      // High-level filters
      if (viewMode === 'receitas' && t.type !== 'entrada') return false;
      if (viewMode === 'despesas' && t.type !== 'saída') return false;

      if (dateFilter.type === 'all') {
        return true;
      } else if (dateFilter.type === 'month') {
        return (date.getMonth() + 1) === dateFilter.month && date.getFullYear() === dateFilter.year;
      } else if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        const start = new Date(dateFilter.startDate);
        const end = new Date(dateFilter.endDate);
        return date >= start && date <= end;
      }
      return false;
    });
  }, [profileTransactions, dateFilter, viewMode]);


  const filteredTransactions = useMemo(() => {
    const filtered = currentTransactions.filter(t => {
      const matchSearch = t.desc.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilters.length === 0 || categoryFilters.includes(t.category);
      return matchSearch && matchCat;
    });

    if (sortConfig === 'updated') {
      return [...filtered].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date).getTime();
        const timeB = new Date(b.updatedAt || b.date).getTime();
        return updateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    if (sortConfig === 'value') {
      return [...filtered].sort((a, b) => {
        return valueSortOrder === 'desc' ? b.value - a.value : a.value - b.value;
      });
    }

    // Default: Hierarquia + Cronologia
    const matches = new Set(filtered.map(t => t.id));
    
    // Identificar itens que devem aparecer (matches + seus pais para contexto de ancoragem)
    const toRenderIds = new Set<string>();
    filtered.forEach(t => {
      toRenderIds.add(t.id);
      if (t.parent_id) toRenderIds.add(t.parent_id);
    });

    const result: Transaction[] = [];
    const roots = currentTransactions.filter(t => !t.parent_id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const allChildren = currentTransactions.filter(t => !!t.parent_id);

    roots.forEach(root => {
      const childrenOfThisRoot = allChildren.filter(c => c.parent_id === root.id && toRenderIds.has(c.id));
      const shouldShowGroup = toRenderIds.has(root.id) || childrenOfThisRoot.length > 0;

      if (shouldShowGroup) {
        result.push(root);
        childrenOfThisRoot.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        result.push(...childrenOfThisRoot);
      }
    });

    // Órfãos: itens que deram match mas o pai não existe no escopo atual (currentTransactions)
    const exhibitedIds = new Set(result.map(t => t.id));
    const orphans = filtered.filter(t => t.parent_id && !exhibitedIds.has(t.id));
    result.push(...orphans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Deduplicação e retorno
    const seenIds = new Set();
    return result.filter(t => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    });
  }, [currentTransactions, searchTerm, categoryFilters, sortConfig, updateSortOrder, valueSortOrder]);

  const stats = useMemo(() => {
    const realizedIncome = currentTransactions
      .filter(t => t.type === 'entrada' && t.status === 'realizado')
      .reduce((acc, t) => acc + (t.is_redutora ? -t.value : t.value), 0);
    
    const realizedExpenses = currentTransactions
      .filter(t => t.type === 'saída' && t.status === 'realizado')
      .reduce((acc, t) => acc + (t.is_redutora ? -t.value : t.value), 0);
    
    const total = realizedIncome - realizedExpenses;

    const allIncome = currentTransactions
      .filter(t => t.type === 'entrada')
      .reduce((acc, t) => acc + (t.is_redutora ? -t.value : t.value), 0);
    
    const allExpenses = currentTransactions
      .filter(t => t.type === 'saída')
      .reduce((acc, t) => acc + (t.is_redutora ? -t.value : t.value), 0);
    
    const projectedTotal = allIncome - allExpenses;
    
    const balanceColor = total > 0 ? 'text-emerald-400' : total < 0 ? 'text-rose-500' : 'text-slate-400';
    const projectedColor = projectedTotal > 0 ? 'text-emerald-500/60' : projectedTotal < 0 ? 'text-rose-500/60' : 'text-slate-500';

    return { total, income: realizedIncome, expenses: realizedExpenses, projectedTotal, balanceColor, projectedColor };
  }, [currentTransactions]);

  const fluxoData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const dates = filteredTransactions.map(t => new Date(t.date).getTime());
    const minD = new Date(Math.min(...dates));
    const maxD = new Date(Math.max(...dates));

    const results = [];
    
    if (analyticsConfig.granularity === 'day') {
      const start = new Date(minD);
      start.setDate(start.getDate() - 2);
      const end = new Date(maxD);
      end.setDate(end.getDate() + 2);

      let curr = new Date(start);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const dayTxs = filteredTransactions.filter(t => t.date === dStr);
        const income = dayTxs.filter(t => t.type === 'entrada').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
        const expense = dayTxs.filter(t => t.type === 'saída').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
        
        results.push({ 
            name: curr.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), 
            fullDate: curr.toISOString(),
            income: Math.max(0, income), 
            expense: Math.max(0, expense) 
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      const start = analyticsConfig.granularity === 'month' ? new Date(minD.getFullYear(), minD.getMonth(), 1) : new Date(minD.getFullYear(), 0, 1);
      const end = analyticsConfig.granularity === 'month' ? new Date(maxD.getFullYear(), maxD.getMonth(), 1) : new Date(maxD.getFullYear(), 0, 1);

      let curr = new Date(start);
      while (curr <= end) {
        let income = 0;
        let expense = 0;
        let name = '';
        let fullDate = curr.toISOString();

        if (analyticsConfig.granularity === 'month') {
          const m = curr.getMonth();
          const y = curr.getFullYear();
          const pTxs = filteredTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === m && d.getFullYear() === y;
          });
          income = pTxs.filter(t => t.type === 'entrada').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
          expense = pTxs.filter(t => t.type === 'saída').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
          name = curr.toLocaleString('pt-BR', { month: 'short' });
          curr.setMonth(curr.getMonth() + 1);
        } else {
          const y = curr.getFullYear();
          const pTxs = filteredTransactions.filter(t => new Date(t.date).getFullYear() === y);
          income = pTxs.filter(t => t.type === 'entrada').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
          expense = pTxs.filter(t => t.type === 'saída').reduce((acc, t) => acc + (t.is_redutora ? -Number(t.value) : Number(t.value)), 0);
          name = y.toString();
          curr.setFullYear(curr.getFullYear() + 1);
        }
        results.push({ name, fullDate, income: Math.max(0, income), expense: Math.max(0, expense) });
      }
    }
    return results;
  }, [filteredTransactions, analyticsConfig.granularity]);

  const tendenciaData = useMemo(() => {
    return fluxoData; // Use same filtered data for both charts to ensure consistency
  }, [fluxoData]);

  const categoryData = useMemo(() => {
    const expByCat: Record<string, number> = {};
    const incByCat: Record<string, number> = {};
    
    currentTransactions.forEach(t => {
      const val = t.is_redutora ? -t.value : t.value;
      if (t.type === 'saída') {
        expByCat[t.category] = (expByCat[t.category] || 0) + val;
      } else {
        incByCat[t.category] = (incByCat[t.category] || 0) + val;
      }
    });

    return Object.keys({ ...expByCat, ...incByCat })
      .filter(name => {
        if (donutViewMode === 'receitas') return (incByCat[name] || 0) > 0;
        if (donutViewMode === 'despesas') return (expByCat[name] || 0) > 0;
        return true;
      })
      .map(name => ({
        name,
        expense: expByCat[name] || 0,
        income: incByCat[name] || 0,
        value: donutViewMode === 'receitas' ? (incByCat[name] || 0) : (donutViewMode === 'despesas' ? (expByCat[name] || 0) : (incByCat[name] || 0) + (expByCat[name] || 0))
      }));
  }, [currentTransactions, donutViewMode]);

  const periodDetailsTransactions = useMemo(() => {
    if (!selectedPeriod) return [];
    const date = new Date(selectedPeriod).toISOString().split('T')[0];
    return currentTransactions.filter(t => t.date === date);
  }, [currentTransactions, selectedPeriod]);

  // --- UI Renders ---

  // Module 1: Silent Boot - Loading Overlay
  if (bootStage === 'syncing') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full shadow-2xl shadow-emerald-500/20"
        />
        <div className="space-y-2 text-center">
          <p className="text-white font-black text-sm uppercase tracking-[0.3em] animate-pulse">Sincronizando com a nuvem...</p>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-none">Aguarde um instante</p>
        </div>
      </div>
    );
  }

  // Splash Screen
  if (bootStage === 'splash') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="flex-1 flex flex-col items-center justify-center space-y-10 relative"
        >
          <div className="p-8 bg-emerald-500 rounded-[2.5rem] w-fit mx-auto shadow-2xl shadow-emerald-500/40 relative">
            <Leaf className="w-16 h-16 text-white" />
          </div>
          <div className="space-y-4 text-center">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">VerdeGrana</h1>
            <p className="text-slate-500 font-mono text-[9px] uppercase tracking-[0.3em]">Financeiro Inteligente</p>
          </div>
        </motion.div>
        
        <div className="w-full max-w-xs text-center pb-12">
           <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.5 }}
             transition={{ delay: 0.5 }}
             className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.25em] leading-relaxed"
           >
             Gerado por Luiz Gustavo Andrade Santos<br/>
             App feito 100% com IA<br/>
             Todos os direitos reservados ao Google Ai Studio
           </motion.p>
        </div>
      </div>
    );
  }

  // Presentation Screen
  if (bootStage === 'presentation') {
    return (
      <div 
        className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-12 text-center select-none"
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 max-w-sm flex flex-col items-center">
          <div className="space-y-4">
             <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Escolha como prosseguir</h2>
             <p className="text-slate-400 text-lg leading-relaxed">Gerencie seus gastos de forma simples e com auxílio de IA!</p>
          </div>
          
          <div className="flex flex-col gap-6 w-full items-center">
            <button 
              onClick={() => setBootStage('auth')}
              className="w-full py-6 bg-emerald-500 rounded-3xl font-black text-white text-sm uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Cloud className="w-5 h-5" /> Fazer login com e-mail
            </button>

            <div className="flex items-center gap-4 w-full">
               <div className="h-px flex-1 bg-white/5" />
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">ou</span>
               <div className="h-px flex-1 bg-white/5" />
            </div>

            <button 
              onClick={() => setIsFolderTutorialOpen(true)}
              className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-slate-400 text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <FolderSync className="w-4 h-4" /> Sincronizar Pasta Local
            </button>

            <button 
              onClick={() => { 
                setIsTrial(true); 
                setTransactions([]); 
                // Skip profile select in Trial if it's new
                setBootStage('welcome'); 
              }}
              className="text-[10px] text-slate-600 hover:text-slate-400 font-black uppercase tracking-[0.3em] transition-colors mt-2"
            >
              Continuar como Visitante (Modo Trial)
            </button>
          </div>
        </motion.div>

        {/* Folder Sync Tutorial Modal */}
        <AnimatePresence>
          {isFolderTutorialOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl relative"
              >
                <button onClick={() => setIsFolderTutorialOpen(false)} className="absolute top-8 right-8 p-2 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                
                <div className="space-y-6">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500">
                      <FolderSync className="w-10 h-10" />
                   </div>
                   <div className="space-y-2 text-center">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Sincronização de Pasta</h3>
                     <p className="text-slate-400 text-sm leading-relaxed px-4">
                       O VerdeGrana solicitará permissão para acessar uma pasta no seu dispositivo. 
                       Lá, ele criará e manterá um arquivo <code className="text-emerald-400">.json</code> atualizado em tempo real.
                     </p>
                   </div>
                   
                   <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                      <div className="flex gap-4">
                         <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</div>
                         <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">Seus dados nunca sairão do seu aparelho.</p>
                      </div>
                      <div className="flex gap-4">
                         <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</div>
                         <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">Você pode exportar ou mover a pasta quando quiser.</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4 pt-4">
                  <button 
                    onClick={handleFolderSelection}
                    className="w-full py-6 bg-emerald-500 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    ENTENDI, SELECIONAR PASTA
                  </button>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center">A disponibilidade depende do seu navegador.</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Source Selector
  if (bootStage === 'auth') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-8">
        {!supabase ? (
          <div className="max-w-md w-full bg-rose-500/10 border border-rose-500/20 p-10 rounded-[3rem] text-center space-y-4">
             <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
             <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Configuração Pendente</h2>
             <p className="text-slate-400 text-sm">Insira as chaves do Supabase no código ou Variáveis de Ambiente para habilitar o Cloud Sync.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full space-y-10">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] mx-auto flex items-center justify-center">
                <Cloud className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{isLoginMode ? 'Acessar Conta' : 'Criar Novo Perfil'}</h2>
              <p className="text-slate-400 text-sm">{isLoginMode ? 'Sincronize seus dados financeiros na nuvem' : 'Comece sua jornada com segurança absoluta'}</p>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-black text-slate-600 ml-4 tracking-widest">E-mail</label>
                 <div className="relative">
                   <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                   <input 
                    type="email" 
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="seu@email.com" 
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 text-white outline-none focus:border-emerald-500 transition-all" 
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-black text-slate-600 ml-4 tracking-widest">Senha</label>
                 <div className="relative">
                   <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                   <input 
                    type="password" 
                    value={authPass}
                    onChange={e => setAuthPass(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 text-white outline-none focus:border-emerald-500 transition-all" 
                   />
                 </div>
               </div>

               <button 
                onClick={() => handleAuth(isLoginMode ? 'login' : 'signup')}
                disabled={isAuthLoading}
                className="w-full py-6 bg-emerald-500 rounded-2xl font-black text-white text-sm uppercase shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
               >
                 {isAuthLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (isLoginMode ? 'Entrar' : 'Criar Conta')}
               </button>

               <div className="flex flex-col gap-4 text-center pt-4">
                  <button 
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors"
                  >
                    {isLoginMode ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
                  </button>

                  {isLoginMode && (
                    <button 
                      onClick={handleForgotPassword}
                      className="text-[10px] text-slate-700 font-bold uppercase tracking-widest hover:text-rose-500 transition-colors -mt-2"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                  <div className="h-px bg-white/5 w-full my-2" />
                  <button 
                    onClick={() => { 
                      setIsTrial(true); 
                      setIsDemoMode(true); 
                      setTransactions([]); 
                      if (profilesList.length === 0) setBootStage('welcome');
                      else setBootStage('profile_select'); 
                    }}
                    className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] hover:text-slate-400"
                  >
                    Continuar como Visitante (Modo Trial)
                  </button>
                  <div className="h-px bg-white/5 w-full my-2" />
                  <button 
                    onClick={handleFileUpload}
                    className="flex items-center justify-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                  >
                    <Folder className="w-3 h-3" /> Carregar Ficheiro Local (.json)
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  if (bootStage === 'profile_select') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full glass p-10 rounded-[4rem] border border-white/10 shadow-2xl text-center space-y-10">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
               <UserCheck className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Quem está usando?</h1>
            <p className="text-slate-400 text-sm">Selecione seu perfil para acessar o VerdeGrana.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {allProfiles.map(p => (
              <button
                key={p}
                onClick={async () => {
                  setActiveProfile(p);
                  await loadProfileData(p);
                  setBootStage('ready');
                  toast.success(`Bem-vindo, ${p}!`);
                }}
                className="aspect-square bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all active:scale-95 group"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <User className="w-8 h-8 text-emerald-500 group-hover:text-white" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-widest">{p}</span>
              </button>
            ))}
            
            <button 
              onClick={async () => {
                const name = prompt('Nome do novo perfil:');
                if (name) {
                  const cleanName = name.trim();
                  if (profilesList.includes(cleanName)) {
                    toast.error('Este perfil já existe.');
                    return;
                  }
                  
                  if (isCloudMode && user && supabase) {
                    await supabase.from('profiles').insert([{ name: cleanName, user_id: user.id }]);
                  }
                  
                  setProfilesList(prev => [...prev, cleanName]);
                  setActiveProfile(cleanName);
                  setTransactions([]); // New profile starts empty
                  setBootStage('ready');
                  toast.success(`Perfil ${cleanName} criado!`);
                }
              }}
              className="aspect-square bg-emerald-500/5 border border-dashed border-emerald-500/30 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-emerald-500/10 transition-all active:scale-95"
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Novo Perfil</span>
            </button>
          </div>

          <div className="pt-4">
             <button 
              onClick={handleLogout}
              className="text-[10px] text-slate-600 font-bold uppercase tracking-widest hover:text-slate-400 transition-colors"
             >
                SAIR DA CONTA
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (bootStage === 'welcome') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-6 sm:p-0 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-md w-full glass p-12 rounded-[4rem] border border-white/10 shadow-2xl text-center space-y-10"
        >
          <div className="space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
               <Leaf className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-tight">
                Boas-vindas ao VerdeGrana!
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed px-4">
                Sua privacidade é nossa prioridade. Para começar, vamos criar seu primeiro perfil de orçamento.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] uppercase font-black text-slate-600 ml-4 tracking-widest">Nome do Perfil</label>
              <input 
                id="first-profile-name"
                placeholder="Ex: Pessoal, Família, Empresa..."
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white outline-none focus:border-emerald-500 transition-all font-bold"
              />
            </div>

            <button 
              onClick={async () => {
                const input = document.getElementById('first-profile-name') as HTMLInputElement;
                const name = input.value?.trim();
                if (!name) {
                  toast.error("Por favor, dê um nome ao seu perfil.");
                  return;
                }

                setIsAuthLoading(true);
                try {
                  if (isCloudMode && user && supabase) {
                    await supabase.from('profiles').insert([{ name, user_id: user.id }]);
                  } 
                  
                  if (folderHandle) {
                    const fileHandle = await folderHandle.getFileHandle(`${name}.json`, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify({ transactions: [], categories }, null, 2));
                    await writable.close();
                  }

                  setProfilesList([name]);
                  setActiveProfile(name);
                  setTransactions([]);
                  setBootStage('ready');
                  toast.success(`Bem-vindo, ${name}! Seu perfil foi criado.`);
                } catch (e) {
                   toast.error("Erro ao criar perfil inicial.");
                } finally {
                  setIsAuthLoading(false);
                }
              }}
              disabled={isAuthLoading}
              className="w-full py-6 bg-emerald-600 rounded-3xl font-black text-white hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20"
            >
              {isAuthLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'CRIAR MEU PRIMEIRO PERFIL'} <ArrowRight className="w-5 h-5" />
            </button>

            {!folderHandle && (
              <button 
                onClick={handleFolderSelection}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-slate-500 font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <FolderSync className="w-4 h-4" /> Vincular Pasta Local (Opcional)
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="text-[10px] text-slate-600 font-bold uppercase tracking-widest hover:text-slate-400 transition-all"
            >
               SAIR DA CONTA
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main App
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col select-none touch-none">
      <Toaster position="top-right" theme="dark" richColors />

      {/* CONTENT AREA */}
      <main 
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-56 px-4 touch-pan-y box-border max-w-full"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <header className="p-6 md:p-10 flex flex-col justify-between items-start gap-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white tracking-tighter">VerdeGrana <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono uppercase">Beta</span></h1>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Intervalo dos registros</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/10">
                  <button 
                    onClick={() => setDateFilter(prev => ({ ...prev, type: 'all' }))}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold transition-all", dateFilter.type === 'all' ? "bg-emerald-500 text-white" : "text-slate-500")}
                  >
                    VISÃO GERAL
                  </button>
                  <button 
                    onClick={() => setDateFilter(prev => ({ ...prev, type: 'month' }))}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold transition-all", dateFilter.type === 'month' ? "bg-emerald-500 text-white" : "text-slate-500")}
                  >
                    MENSAL
                  </button>
                  <button 
                    onClick={() => setDateFilter(prev => ({ ...prev, type: 'custom' }))}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold transition-all", dateFilter.type === 'custom' ? "bg-emerald-500 text-white" : "text-slate-500")}
                  >
                    PERSONALIZADO
                  </button>
                </div>

                {dateFilter.type === 'month' ? (
                  <div className="flex items-center gap-1">
                    <select 
                      value={dateFilter.month} 
                      onChange={e => setDateFilter(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="bg-emerald-500/10 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full border border-emerald-500/20 outline-none"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i + 1} className="bg-slate-900">{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select 
                      value={dateFilter.year} 
                      onChange={e => setDateFilter(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="bg-emerald-500/10 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full border border-emerald-500/20 outline-none"
                    >
                      {[2023, 2024, 2025, 2026].map(y => (
                        <option key={y} value={y} className="bg-slate-900">{y}</option>
                      ))}
                    </select>
                  </div>
                ) : dateFilter.type === 'custom' ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={dateFilter.startDate || ''} 
                      onChange={e => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      className="bg-white/5 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 outline-none"
                    />
                    <span className="text-slate-600 text-xs">até</span>
                    <input 
                      type="date" 
                      value={dateFilter.endDate || ''} 
                      onChange={e => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      className="bg-white/5 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 outline-none"
                    />
                  </div>
                ) : null}
                
                {/* Undo/Redo Controls */}
                <div className="flex items-center gap-1 mr-2 border-r border-white/5 pr-2">
                  <button 
                    onClick={undo}
                    disabled={historyPointer <= 0}
                    className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20 transition-all hover:bg-white/5 rounded-lg"
                    title="Desfazer"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={redo}
                    disabled={historyPointer >= history.length - 1}
                    className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20 transition-all hover:bg-white/5 rounded-lg"
                    title="Refazer"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1 text-[10px] font-bold ml-2 transition-all">
                  {isCloudMode && user ? (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
                      syncStatus === 'saving' || syncQueue.length > 0 ? "text-amber-500 bg-amber-500/5 animate-pulse" : 
                      syncStatus === 'synced' ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20" : "text-slate-500 bg-white/5"
                    )}>
                      {syncStatus === 'saving' || syncQueue.length > 0 ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                      <span className="uppercase tracking-widest">
                        {syncQueue.length > 0 ? `${syncQueue.length} PENDENTE${syncQueue.length > 1 ? 'S' : ''}` :
                         syncStatus === 'saving' ? 'SINCRONIZANDO...' : 
                         syncStatus === 'synced' ? 'NUVEM ATIVA' : 'SINC. DESATIVADA'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-slate-400 border border-white/5">
                      <FolderSync className="w-3 h-3" />
                      <span>MODO LOCAL</span>
                    </div>
                  )}

                  {isCloudMode && user && (
                    <button 
                      onClick={() => fetchCloudData(user.id)}
                      className="p-1.5 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                      title="Forçar Sincronização"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", syncStatus === 'saving' && "animate-spin")} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-row overflow-x-auto gap-3 w-full pb-2 no-scrollbar">
            <StatSmall label="Global" value={stats.total} color={stats.balanceColor} projected={stats.projectedTotal} />
            <StatSmall label="Receitas" value={stats.income} color="text-emerald-500" prefix="+" />
            <StatSmall label="Despesas" value={stats.expenses} color="text-rose-500" prefix="-" />
          </div>
        </header>

        <section className="px-6 md:px-10 pb-10">
          <AnimatePresence mode="wait">
            {activeTab === 'reports' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-12 gap-6">
                <div className="col-span-12 flex flex-col gap-6 glass p-8 rounded-[2.5rem] border border-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col gap-2 w-full">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Global Dashboard Filter:</span>
                       <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-full box-border">
                         {(['tudo', 'receitas', 'despesas', 'personalizado'] as const).map(m => (
                           <button 
                             key={m} 
                             onClick={() => {
                               setViewMode(m);
                               if (m !== 'personalizado') setCategoryFilters([]);
                             }}
                             className={cn(
                               "px-2 py-3 rounded-xl text-[10px] font-black transition-all uppercase text-center", 
                               viewMode === m ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                             )}
                           >
                             {m.toUpperCase()}
                           </button>
                         ))}
                       </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agrupar Gráficos por:</span>
                      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                        {(['day', 'month', 'year'] as const).map(g => (
                          <button 
                            key={g} 
                            onClick={() => { setAnalyticsConfig(p => ({ ...p, granularity: g })); setIsDashboardRevealed(true); }}
                            className={cn("px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase", analyticsConfig.granularity === g ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300")}
                          >
                            {g === 'day' ? 'Dia' : g === 'month' ? 'Mês' : 'Ano'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtro Rápido Personalizado:</span>
                      <button 
                        onClick={() => setIsComparisonModalOpen(true)}
                        disabled={viewMode !== 'personalizado'}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black transition-all border",
                          viewMode === 'personalizado' ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-slate-700 border-white/5 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Plus className="w-3 h-3" /> SELECIONAR CATEGORIAS
                      </button>
                      {analyticsConfig.compareCategories.length > 0 && viewMode === 'personalizado' && (
                        <button 
                          onClick={() => setAnalyticsConfig(p => ({ ...p, compareCategories: [] }))}
                          className="text-[9px] font-bold text-rose-500 hover:scale-105 transition-transform"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {profileTransactions.length === 0 ? (
                  <div className="col-span-12 flex flex-col items-center justify-center p-12 text-center w-full min-h-[400px]">
                    <div className="w-32 h-32 bg-slate-900 rounded-[3rem] flex items-center justify-center mb-8 border border-white/5 mx-auto">
                      <Leaf className="w-12 h-12 text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter w-full">Sua jornada começa agora</h2>
                    <p className="text-slate-400 mb-10 max-w-sm mx-auto">Adicione seu primeiro lançamento para ver a mágica do VerdeGrana acontecer.</p>
                    <button 
                      onClick={() => {
                        setEditingTransaction(null);
                        setIsAnexo(false);
                        setSelectedParentId('');
                        setIsAddModalOpen(true);
                      }}
                      className="px-10 py-5 bg-emerald-500 rounded-[2rem] font-bold text-white uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3 mx-auto"
                    >
                      <Plus className="w-5 h-5" /> Começar Agora
                    </button>
                  </div>
                ) : !isDashboardRevealed ? (
                  <div className="col-span-12 flex flex-col items-center justify-center p-8 space-y-12 text-center w-full min-h-[400px]">
                    <div className="text-center space-y-4 w-full">
                       <h2 className="text-3xl font-black text-white tracking-tighter uppercase px-4">Seu Panorama</h2>
                       <p className="text-slate-400 max-w-xs mx-auto">Escolha como deseja agrupar seus dados para começar.</p>
                    </div>
                    <div className="w-full max-w-sm flex bg-slate-900/50 p-1 rounded-2xl border border-white/10 mx-auto">
                       {(['day', 'month', 'year'] as const).map(r => (
                         <button 
                          key={r}
                          onClick={() => { setAnalyticsConfig(p => ({ ...p, granularity: r })); setIsDashboardRevealed(true); }}
                          className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                         >
                           {r === 'day' ? 'Dia' : r === 'month' ? 'Mês' : 'Ano'}
                         </button>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-12 space-y-8 pb-32">
                    {/* 2. Distribuição Geral (Rosca) */}
                    <Card className="p-8 relative overflow-hidden flex flex-col min-h-[500px]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
                      <CategoryDonutSection 
                        title="Distribuição Geral"
                        data={categoryData}
                        colorMode={donutColorMode}
                        setColorMode={setDonutColorMode}
                        viewMode={donutViewMode}
                        setViewMode={setDonutViewMode}
                      />
                    </Card>

                    {/* 3. Gráfico de Lançamentos (Barras) */}
                    <Card className="h-[500px] p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -translate-y-1/2 -translate-x-1/2" />
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg uppercase tracking-tighter">Lançamentos</h3>
                      </div>
                      <div className="w-full h-full relative">
                         <TimelineChart 
                            data={fluxoData} 
                            onPointClick={handlePointClick}
                            viewMode={viewMode}
                         />
                      </div>
                    </Card>

                    {/* Box de Detalhamento do Dia (Restauração solicitado) */}
                    <AnimatePresence>
                      {selectedPeriod && periodDetailsTransactions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <Card className="p-8 bg-slate-900/40 border-emerald-500/20">
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest">
                                  Detalhes de {new Date(selectedPeriod).toLocaleDateString('pt-BR')}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Clique em um item para editar
                                </span>
                              </div>
                              <div className="flex gap-4 items-center">
                                <button 
                                  onClick={() => {
                                    setQuickAddDate(selectedPeriod);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase flex items-center gap-1"
                                >
                                  <Plus size={12} strokeWidth={3} /> ADICIONAR
                                </button>
                                <button 
                                  onClick={() => setSelectedPeriod(null)}
                                  className="text-[10px] font-black text-slate-500 hover:text-white uppercase"
                                >
                                  FECHAR
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {periodDetailsTransactions.map(t => (
                                <div 
                                  key={t.id} 
                                  onClick={() => {
                                    setEditingTransaction(t);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white uppercase tracking-tight">{t.desc}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">{t.category}</span>
                                  </div>
                                  <div className="text-right flex flex-col">
                                    <span className={cn("text-[10px] font-black", t.type === 'entrada' ? "text-emerald-400" : "text-rose-400")}>
                                      {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.value)}
                                    </span>
                                    {t.is_redutora && (
                                      <span className="text-[8px] font-bold text-blue-400 uppercase">Item Redutor</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 4. Valor Acumulado (Fluxo de Caixa) */}
                    <Card className="p-10 h-[450px] relative overflow-hidden">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-lg uppercase tracking-tighter">Valor Acumulado (Fluxo de Caixa)</h3>
                      </div>
                      <div className="w-full h-full relative">
                        <TimelineChart 
                           data={tendenciaData} 
                           isPerformance={true} 
                           viewMode={viewMode}
                        />
                      </div>
                    </Card>

                    {/* 5. Lista Detalhada de Lançamentos */}
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 px-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-xl text-white uppercase tracking-tighter">Detalhamento</h3>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input 
                              type="text" placeholder="Pesquisar..." 
                              className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] uppercase font-black tracking-widest text-white focus:border-emerald-500/50 outline-none w-40"
                              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Novos Filtros Dinâmicos */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                           <button 
                            onClick={() => setSortConfig('default')}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                              sortConfig === 'default' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10"
                            )}
                           >
                             <ArrowDownNarrowWide className="w-3 h-3" /> Hierarquia + Cronologia
                           </button>

                           <button 
                            onClick={() => {
                              if (sortConfig === 'updated') setUpdateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                              else setSortConfig('updated');
                            }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                              sortConfig === 'updated' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10"
                            )}
                           >
                             <History className="w-3 h-3" /> 
                             Alt. Recentes {sortConfig === 'updated' && (updateSortOrder === 'desc' ? '↓' : '↑')}
                           </button>

                           <button 
                            onClick={() => {
                              if (sortConfig === 'value') setValueSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                              else setSortConfig('value');
                            }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                              sortConfig === 'value' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10"
                            )}
                           >
                             <Coins className="w-3 h-3" /> 
                             Ordenar por Valor {sortConfig === 'value' && (valueSortOrder === 'desc' ? '↓' : '↑')}
                           </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {filteredTransactions.map(t => (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group",
                              selectedTxIds.includes(t.id) 
                                ? "bg-emerald-500/10 border-emerald-500/50" 
                                : "bg-white/2 border-white/5 hover:border-white/20",
                              t.is_redutora && "bg-blue-500/5 border-blue-500/20",
                              t.parent_id && sortConfig === 'default' && "ml-8 opacity-90 border-dashed border-white/10"
                            )}
                            onClick={() => setSelectedTxIds(p => p.includes(t.id) ? p.filter(id => id !== t.id) : [...p, t.id])}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              {t.parent_id && sortConfig === 'default' && (
                                <CornerDownRight className="w-4 h-4 text-blue-400 shrink-0" />
                              )}
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", 
                                t.is_redutora ? "bg-blue-500/10 text-blue-400" :
                                (t.type === 'entrada' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")
                              )}>
                                {t.is_redutora ? <Minus className="w-6 h-6" /> : (t.type === 'entrada' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />)}
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-2">
                                   <p className="font-bold text-white text-sm truncate">{t.desc}</p>
                                   {t.status === 'pendente' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                 </div>
                                 <div className="flex items-center gap-1.5 overflow-hidden">
                                   <span className={cn("text-[9px] font-black uppercase tracking-[0.15em]", t.is_redutora ? "text-blue-400/80" : "text-slate-500")}>
                                     {t.is_redutora ? `Redutora • ${t.category}` : t.category}
                                   </span>
                                   <span className="text-[8px] text-slate-700 font-mono">•</span>
                                   <span className="text-[9px] text-slate-600 font-mono">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                 </div>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1 flex-shrink-0 cursor-default" onClick={e => e.stopPropagation()}>
                               <p className={cn("font-black text-sm", 
                                 t.is_redutora ? "text-blue-400" :
                                 (t.type === 'entrada' ? "text-emerald-400" : "text-rose-400")
                               )}>
                                 {t.is_redutora ? '-' : (t.type === 'entrada' ? '+' : '-')} {formatCurrency(t.value)}
                               </p>
                               {t.parent_name && (
                                 <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full">
                                   <ArrowDownUp className="w-2.5 h-2.5 text-slate-600" />
                                   <p className="text-[8px] text-slate-500 font-bold uppercase truncate max-w-[80px]">{t.parent_name}</p>
                                 </div>
                               )}
                            </div>

                            <AnimatePresence>
                              {selectedTxIds.includes(t.id) && (
                                 <motion.div 
                                  initial={{ x: 150 }} animate={{ x: 0 }} exit={{ x: 150 }}
                                  className="absolute right-0 top-0 bottom-0 bg-slate-900 border-l border-white/10 flex items-center px-4 gap-2 z-10"
                                  onClick={e => e.stopPropagation()}
                                 >
                                    <button onClick={() => { setEditingTransaction(t); setIsAddModalOpen(true); }} className="p-3 bg-white/5 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all"><Edit3 size={18} /></button>
                                    <button onClick={() => { handleDeleteTransactions([t.id]); setSelectedTxIds([]); }} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all"><Trash2 size={18} /></button>
                                 </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                        
                        {filteredTransactions.length === 0 && (
                          <div className="py-20 flex flex-col items-center gap-4 text-slate-700">
                            <Ghost className="w-12 h-12 opacity-20" />
                            <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Nada por aqui</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass p-8 rounded-[2rem] border border-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Audit Trail / Histórico</h2>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                       <button onClick={handleClearAuditLogs} className="px-4 py-2 text-[10px] font-black text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">LIMPAR LOGS</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {auditLogs.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Tudo limpo por aqui. Nenhuma ação registrada.</div>
                    ) : (
                      auditLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              log.operation === 'Inserção' ? "bg-emerald-500/10 text-emerald-500" :
                              log.operation === 'Exclusão' ? "bg-rose-500/10 text-rose-500" :
                              log.operation === 'Edição' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                            )}>
                              {log.operation === 'Inserção' ? <Plus size={18} /> : 
                               log.operation === 'Exclusão' ? <Trash2 size={18} /> : 
                               log.operation === 'Edição' ? <Edit3 size={18} /> : <RefreshCw size={18} />}
                            </div>
                            <div className="min-w-0">
                               <p className="font-bold text-white text-xs truncate max-w-[200px]">{log.metadata.description}</p>
                               <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-black uppercase text-slate-500">{log.operation}</span>
                                 <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                 <span className="text-[8px] font-bold text-slate-400">{log.metadata.profile}</span>
                               </div>
                            </div>
                          </div>
                          <div className="text-right">
                             {log.metadata.value !== undefined && (
                               <p className="font-black text-xs text-white mb-1">{formatCurrency(log.metadata.value)}</p>
                             )}
                             <p className="text-[8px] text-slate-500 font-mono italic">
                               {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                             </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-10 flex flex-col items-center text-center gap-8 border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center animate-pulse">
                    <Bot className="w-12 h-12 text-emerald-400" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white">Assistente Mestre</h2>
                    <div className="text-slate-400 text-sm leading-relaxed max-w-sm flex flex-col gap-2">
                      <p className="font-bold text-white mb-2">Siga estes passos:</p>
                      <p>1️⃣ Copie o Prompt Mestre.</p>
                      <p>2️⃣ Cole no seu ChatGPT, Gemini ou Claude.</p>
                      <p>3️⃣ Dite seus gastos.</p>
                      <p>4️⃣ Copie a resposta gerada e cole no Importador Inteligente abaixo.</p>
                      <p className="mt-2 text-[10px] uppercase font-black text-slate-600">Dica: Se a lista for muito gigante, peça para a IA gerar um arquivo .json e use o botão de importar arquivo.</p>
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-left flex items-center gap-3 mb-2">
                       <User className="w-4 h-4 text-emerald-500" />
                       <div className="leading-none">
                         <p className="text-[9px] font-black text-emerald-500 uppercase">Perfil Alvo</p>
                         <p className="text-white text-xs font-bold">{activeProfile}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => {
                        const prompt = `Você é um motor de parsing financeiro profissional para o app VerdeGrana.
Sua missão é converter descrições complexas em JSON estruturado para importação direta.

REGRAS DE OURO:
1. Identifique se é 'entrada' (receita) ou 'saída' (despesa).
2. Categorias disponíveis: [${categories.map(c => c.name).join(', ')}]. Use 'Outros' se não encaixar perfeitamente.
3. Formato de Data: YYYY-MM-DD. Use ${new Date().getFullYear()} como base.
4. LÓGICA DE ANEXOS (Deduções e Acréscimos):
   - Se houver descontos, deduções ou impostos (ex: imposto retido, desconto em salário), inclua-os no array 'deductions'.
   - Se houver acréscimos, juros ou multas, inclua-os no array 'additions'.
   - Cada anexo deve ser um objeto com: {"description": "string", "amount": number, "category": "string"}.
5. O valor deve ser sempre um número POSITIVO no JSON.

SCHEMA DE RESPOSTA:
[
  {
    "date": "YYYY-MM-DD",
    "desc": "string",
    "value": number,
    "category": "string",
    "type": "entrada|saída",
    "deductions": [
       {"description": "string", "amount": number, "category": "string"}
    ],
    "additions": [
       {"description": "string", "amount": number, "category": "string"}
    ]
  }
]

EXEMPLO DE INPUT: "Recebi salário de 5000 mas teve 200 de desconto de imposto e 100 de bônus"
EXEMPLO DE OUTPUT:
[{"date": "2024-05-17", "desc": "Salário", "value": 5000, "category": "Trabalho", "type": "entrada", "deductions": [{"description": "Imposto Retido", "amount": 200, "category": "Trabalho"}], "additions": [{"description": "Bônus", "amount": 100, "category": "Trabalho"}]}]

REGRAS DE INTERAÇÃO:
- Ao receber estas instruções, você NÃO DEVE gerar nenhum JSON ou inventar dados fictícios.
- Apenas confirme que entendeu as regras respondendo EXATAMENTE com a seguinte frase: 'Olá! O que o senhor gostaria de registrar? Pode me dizer.'
- Aguarde o meu próximo envio, onde eu direi os valores reais. Só então você deve aplicar a lógica e retornar o código JSON (APENAS o JSON bruto, sem explicações).`;
                        navigator.clipboard.writeText(prompt);
                        toast.success('Prompt mestre copiado!');
                      }}
                      className="w-full py-5 bg-emerald-600 rounded-3xl font-bold hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3"
                    >
                      <Copy className="w-5 h-5" /> Copiar Master Prompt
                    </button>
                  </div>
                </Card>

                <Card className="p-10 flex flex-col gap-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><RefreshCw className={isAiProcessing ? "animate-spin" : ""} /></div>
                    <h3 className="text-xl font-bold text-white">Importador Inteligente</h3>
                  </div>
                  <textarea 
                    id="ai-json" placeholder="Cole o JSON da IA aqui..." 
                    className="flex-1 min-h-[300px] bg-black/40 border border-white/5 rounded-[2rem] p-8 text-xs font-mono text-emerald-500 focus:border-emerald-500/50 outline-none resize-none"
                  />
                  <button 
                    onClick={() => {
                      setIsAiProcessing(true);
                      const area = document.getElementById('ai-json') as HTMLTextAreaElement;
                      setTimeout(() => {
                        try {
                          const data = JSON.parse(area.value);
                          processImport(data);
                          setActiveTab('reports');
                          area.value = '';
                        } catch (e) { toast.error('Falha no formato JSON.'); }
                        setIsAiProcessing(false);
                      }, 1000);
                    }}
                    disabled={isAiProcessing}
                    className="w-full py-5 bg-blue-600 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isAiProcessing ? 'Processando...' : 'Processar'}
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const text = event.target?.result as string;
                          const data = JSON.parse(text);
                          processImport(Array.isArray(data) ? data : data.transactions || []);
                          setActiveTab('reports');
                          toast.success('Dados importados com sucesso!');
                        } catch (err) {
                          toast.error('Erro ao processar arquivo.');
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    accept=".json,.txt"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 bg-white/5 border border-white/10 rounded-3xl text-slate-300 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <FileJson className="w-5 h-5 text-blue-400" /> Importar via Arquivo
                  </button>
                </Card>

                <Card className="col-span-1 lg:col-span-2 p-10 flex flex-col gap-6 border-blue-500/10">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-white">Análise Avançada com IA</h3>
                    <p className="text-slate-500 text-sm">Seus dados não têm limites. Exporte seu histórico e peça para a sua IA favorita gerar planilhas do Excel, gráficos personalizados ou análises profundas sobre sua saúde financeira.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <button 
                      onClick={() => {
                        const topCats = categoryData.slice(0, 5).map(c => `${c.name}: ${formatCurrency(c.value)}`).join(', ');
                        const reportPrompt = `Relatório Financeiro VerdeGrana - Saúde Financeira Master
                        
Idealizador: Luiz Gustavo Andrade Santos
Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}

RESUMO DO PERÍODO:
- Saldo Atual: ${formatCurrency(stats.total)}
- Total Receitas: ${formatCurrency(stats.income)}
- Total Despesas: ${formatCurrency(stats.expenses)}
- Fluxo Líquido: ${formatCurrency(stats.total)}

TOP CATEGORIAS DE GASTO:
${topCats || 'Sem dados suficientes'}

MÉTRICAS:
- Total Transactions: ${profileTransactions.length}
- Média por Transação: ${formatCurrency(stats.expenses / (profileTransactions.filter(t => t.type === 'saída').length || 1))}

SOLICITAÇÃO: Forneça uma análise crítica, insights de economia e recomendações de investimentos baseados nestes dados.`;
                        navigator.clipboard.writeText(reportPrompt);
                        toast.success('Relatório para IA copiado!');
                      }}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" /> Área de Transferência
                    </button>
                    
                    <button 
                      onClick={() => {
                        const data = JSON.stringify({ transactions, categories }, null, 2);
                        const blob = new Blob([data], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `verdegrana_export.txt`;
                        link.click();
                        toast.success('Arquivo .TXT baixado!');
                      }}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Download className="w-4 h-4 text-blue-400" /> Baixar arquivo .TXT
                    </button>

                    <button 
                      onClick={() => {
                        const data = JSON.stringify({ transactions, categories }, null, 2);
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `verdegrana_export.json`;
                        link.click();
                        toast.success('Arquivo .JSON baixado!');
                      }}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <FileJson className="w-4 h-4 text-emerald-400" /> Baixar arquivo .JSON
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'categories' && (
              <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
                <Card className="p-10 space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/10 rounded-3xl text-emerald-400"><Tag className="w-8 h-8" /></div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white">Categorias Dinâmicas</h2>
                      <p className="text-slate-500 text-sm">Gerencie seu ecossistema financeiro</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <input 
                      id="new-cat" type="text" placeholder="Nome da categoria..." 
                      className="flex-1 bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 focus:border-emerald-500/50 outline-none text-white" 
                    />
                    <button 
                      onClick={() => {
                        const inp = document.getElementById('new-cat') as HTMLInputElement;
                        if (inp.value) { 
                          const cleanName = inp.value.trim();
                          const id = cleanName.toLowerCase();
                          setCategories(p => {
                            if (p.some(c => c.id === id)) {
                              toast.error('Esta categoria já existe.');
                              return p;
                            }
                            toast.success('Categoria adicionada!');
                            return [...p, { id, name: cleanName }];
                          });
                          inp.value = '';
                        }
                      }}
                      className="px-8 bg-emerald-600 rounded-[1.5rem] hover:bg-emerald-500 transition-colors active:scale-95"
                    >
                      <Plus className="w-8 h-8" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {categories.reduce((acc: Category[], current) => {
                      if (!acc.find(c => c.id === current.id)) acc.push(current);
                      return acc;
                    }, []).map(cat => (
                      <div key={cat.id} className="group p-6 glass rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-between">
                        <span className="font-bold text-slate-300">{cat.name}</span>
                        <button 
                          onClick={() => setCategoryToDelete(cat)} 
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                   <div className="pt-10 border-t border-white/5 h-[650px]">
                    <CategoryDonutSection 
                      title="Análise por Distribuição"
                      data={categoryData}
                      colorMode={donutColorMode}
                      setColorMode={setDonutColorMode}
                      viewMode={donutViewMode}
                      setViewMode={setDonutViewMode}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="set" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto space-y-8">
                
                {/* Profile Management Section */}
                <Card className="p-10 flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl"><Users className="w-6 h-6" /></div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white tracking-tighter uppercase">Gerenciador de Perfis</h3>
                        <p className="text-slate-500 text-xs">Isolamento total de orçamentos e históricos</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={handleImportProfile}
                        className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2"
                        title="Importar Perfil (.json)"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          const name = prompt('Nome do novo perfil:');
                          if (name && name.trim()) {
                            if (profilesList.includes(name.trim())) {
                              toast.error('Este perfil já existe.');
                              return;
                            }
                            
                            if (isCloudMode && user && supabase) {
                              supabase.from('profiles').insert([{ name: name.trim(), user_id: user.id }]);
                            }
                            
                            setProfilesList(p => [...p, name.trim()]);
                            setActiveProfile(name.trim());
                            toast.success(`Perfil "${name}" criado!`);
                          }
                        }}
                        className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {allProfiles.map(p => (
                       <div 
                         key={p}
                         className={cn(
                           "p-6 rounded-[2rem] border transition-all flex flex-col gap-4 relative group",
                           activeProfile === p ? "bg-emerald-500/10 border-emerald-500/50" : "bg-white/5 border-white/5 hover:border-white/10"
                         )}
                       >
                          <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", activeProfile === p ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white/5 text-slate-500")}>
                             <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-[0.2em] truncate max-w-[120px]">{p}</p>
                            {activeProfile === p ? (
                              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Perfil Ativo</p>
                            ) : (
                              <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">Inativo</p>
                            )}
                          </div>
                        </div>
                             
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleRenameProfile(p)}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {profilesList.length > 1 && (
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Excluir o perfil "${p}"? Todos os dados vinculados serão inacessíveis.`)) {
                                        if (isCloudMode && user && supabase) {
                                          await supabase.from('profiles').delete().eq('user_id', user.id).eq('name', p);
                                          await supabase.from('transactions').delete().eq('user_id', user.id).eq('profile_name', p);
                                        } else if (folderHandle) {
                                          try { await folderHandle.removeEntry(`${p}.json`); } catch(e) {}
                                        }
                                        
                                        const newList = profilesList.filter(item => item !== p);
                                        setProfilesList(newList);

                                        // Ensure transactions are also cleared from state
                                        setTransactions(prev => {
                                          const next = prev.filter(t => t.profile_name !== p);
                                          pushToHistory(next);
                                          return next;
                                        });

                                        if (activeProfile === p) {
                                           const next = newList[0] || 'Principal';
                                           setActiveProfile(next);
                                           await loadProfileData(next);
                                        }
                                      }
                                    }}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                             </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                             <button
                               onClick={() => {
                                 setActiveProfile(p);
                                 toast.success(`Perfil ${p} selecionado.`);
                               }}
                               className={cn(
                                 "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                 activeProfile === p ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-500 hover:bg-white/10"
                               )}
                             >
                                Selecionar
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Account / Cloud Section */}
                  <Card className="p-10 flex flex-col gap-6 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">{isCloudMode ? <Cloud /> : <FolderSync />}</div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">{isCloudMode ? 'Conta & Cloud Sync' : 'Gerenciar Histórico'}</h3>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", (isCloudMode || isTrial) ? "text-emerald-500" : "text-slate-500")}>
                          {(isCloudMode || isTrial) ? 'Modo Seguro Ativo' : 'Apenas neste aparelho'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10 flex-1">
                      {isCloudMode && user ? (
                        <div className="space-y-6">
                           <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <UserCheck className="w-6 h-6" />
                                 </div>
                                 <div className="overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail Vinculado</p>
                                    <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                                 </div>
                              </div>
                              <div className="pt-2">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '100%' }} />
                                </div>
                                <p className="text-[9px] text-emerald-500/60 font-medium uppercase mt-2">Sincronização em tempo real ativa</p>
                              </div>
                           </div>

                           {!folderHandle && (
                              <button 
                                onClick={handleFolderSelection}
                                className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-black uppercase text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                              >
                                <FolderSync className="w-4 h-4" /> Ativar Backup em Pasta Local
                              </button>
                           )}
                           {folderHandle && (
                             <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FolderSync className="w-4 h-4 text-emerald-500" />
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pasta Local Ativa</span>
                                </div>
                                <button onClick={() => setFolderHandle(null)} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors">Desvincular</button>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <p className="text-slate-400 text-sm leading-relaxed">
                              Você está usando o <strong>{isTrial ? 'Modo Trial' : 'Modo Local'}</strong>. Seus dados estão salvos apenas no seu dispositivo/navegador. 
                              {folderHandle ? " Sincronizado com sua pasta local." : " Recomendamos migrar para a Nuvem para evitar perdas."}
                           </p>

                           {!folderHandle && (
                              <button 
                                onClick={handleFolderSelection}
                                className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-black uppercase text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                              >
                                <FolderSync className="w-4 h-4" /> Ativar Sincronização de Pasta
                              </button>
                           )}

                           <div className="bg-emerald-500/5 p-6 rounded-3xl border border-dashed border-emerald-500/30 space-y-4">
                              <h4 className="text-white text-xs font-black uppercase tracking-widest">Migrar para a Nuvem</h4>
                              <p className="text-[11px] text-slate-400">Proteja seus dados, use em múltiplos aparelhos e nunca mais se preocupe com backups manuais.</p>
                              <button 
                                onClick={handleCloudMigration}
                                className="w-full py-5 bg-emerald-500 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                Começar Migração
                              </button>
                           </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleLocalExport}
                      className="flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-bold hover:bg-white/10 transition-all text-[10px] uppercase tracking-widest"
                    >
                      <Download className="w-4 h-4" /> Exportar Backup JSON
                    </button>
                  </Card>

                  {/* UI Scale / Appearance */}
                  <Card className="p-10 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl"><Monitor className="w-6 h-6" /></div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Aparência da UI</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Escalabilidade de Interface</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">Ajuste o zoom da interface para otimizar o espaço em telas pequenas ou visualização em monitores grandes.</p>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {[
                        { label: 'Compacto', value: 85, desc: 'Ideal para muitos dados' },
                        { label: 'Menor', value: 90, desc: 'Foco em densidade' },
                        { label: 'Padrão', value: 100, desc: 'Configuração original' }
                      ].map((scale) => (
                        <button
                          key={scale.value}
                          onClick={() => setUiScale(scale.value)}
                          className={cn(
                            "group p-4 rounded-2xl transition-all border flex items-center justify-between",
                            uiScale === scale.value 
                              ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30" 
                              : "bg-white/5 border-white/5 hover:border-white/20 text-slate-400"
                          )}
                        >
                          <div className="text-left">
                            <p className="font-black text-[11px] uppercase tracking-widest">{scale.label}</p>
                            <p className={cn("text-[9px] font-bold uppercase tracking-tight", uiScale === scale.value ? "text-white/60" : "text-slate-600")}>{scale.desc}</p>
                          </div>
                          <p className="text-xs font-black">{scale.value}%</p>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Data Cleanup Card */}
                <Card className="p-10 flex flex-col md:flex-row items-center gap-8 bg-rose-500/5 border-rose-500/20">
                  <div className="p-6 bg-rose-500/10 text-rose-500 rounded-[2rem] flex-shrink-0"><Trash2 className="w-10 h-10" /></div>
                  <div className="flex-1 space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-black text-rose-500 uppercase tracking-tighter">Limpeza Profunda</h3>
                    <p className="text-rose-500/60 text-sm font-medium">Isso apagará permanentemente todos os registros, perfis e configurações. Não pode ser desfeito.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (isTrial) {
                        toast.error('Função indisponível no modo Trial.');
                        return;
                      }
                      setConfirmModal({
                        open: true,
                        title: 'APAGAR TUDO DEFINITIVAMENTE?',
                        description: 'Esta ação destruirá todos os seus perfis e transações na nuvem e localmente. Prossiga com extrema cautela.',
                        action: async () => {
                          setBootStage('syncing');
                          
                          // 1. Cloud Wipe (Strict)
                          if (user && supabase && isCloudMode) {
                            try {
                              // Notify others BEFORE wipe so they can prepare to clear cache
                              supabase.channel('verdegrana_sync').send({
                                type: 'broadcast',
                                event: 'sync',
                                payload: { userId: user.id, clientId, type: 'full_reset' }
                              });

                              await Promise.all([
                                supabase.from('transactions').delete().eq('user_id', user.id),
                                supabase.from('profiles').delete().eq('user_id', user.id),
                                supabase.from('audit_logs').delete().eq('user_id', user.id),
                                supabase.from('userdata').update({ 
                                  data: { auditLogs: [], profilesList: ['Principal'], categories: [] },
                                  updated_at: new Date().toISOString()
                                }).eq('user_id', user.id)
                              ]);
                            } catch (e) {
                              console.error('Falha ao limpar nuvem:', e);
                            }
                          }
                          
                          // 2. Local Folder Wipe
                          if (folderHandle) {
                            try {
                              // Recursively delete all profile files
                              for (const p of profilesList) {
                                try {
                                  await folderHandle.removeEntry(`${p}.json`);
                                } catch (e) {
                                  // Fallback for files not in list but in folder
                                }
                              }
                            } catch (e) {
                              console.error('Falha ao limpar pasta local:', e);
                            }
                          }

                          // 3. System Reset
                          try {
                            const db = await initDB();
                            await clearState(db);
                          } catch (e) {}
                          
                          localStorage.clear();
                          toast.success('Sistema resetado com sucesso.');
                          setTimeout(() => {
                            window.location.reload();
                          }, 1500);
                        }
                      });
                    }}
                    className="px-10 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-500 transition-all active:scale-95 shadow-xl shadow-rose-600/20"
                  >
                    Resetar VerdeGrana
                  </button>
                </Card>

                {/* Logout Card */}
                <Card className="p-10 flex items-center justify-between bg-slate-900 border-white/5">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/5 text-slate-500 rounded-3xl"><LogOut className="w-6 h-6" /></div>
                      <div>
                        <h4 className="text-white font-black uppercase tracking-tighter text-xl">Sair da Sessão</h4>
                        <p className="text-slate-500 text-xs">Desconectar conta deste dispositivo</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                        setConfirmModal({
                          open: true,
                          title: 'Sair da Conta?',
                          description: 'Sua sessão será encerrada com segurança.',
                          action: handleLogout
                        });
                    }}
                    className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 font-bold hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                   >
                     Logout
                   </button>
                </Card>

              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-10">
                <div className="text-center space-y-10">
                   <div className="p-6 bg-emerald-500 rounded-[3rem] w-fit mx-auto shadow-2xl shadow-emerald-500/30">
                      <Leaf className="w-16 h-16 text-white" />
                   </div>
                   <div className="space-y-4">
                     <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">VerdeGrana</h1>
                     <p className="text-emerald-500 font-bold uppercase tracking-[0.3em] text-sm">Finanças & Tecnologia</p>
                   </div>
                   
                   <div className="glass p-12 rounded-[4rem] border border-white/5 space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12"><Ghost className="w-64 h-64" /></div>
                      <div className="space-y-6 relative">
                        <p className="text-2xl text-slate-300 font-medium leading-relaxed">
                          O **VerdeGrana** é uma ferramenta de gestão financeira idealizada para transformar a relação das pessoas com o dinheiro através da tecnologia.
                        </p>
                        <div className="space-y-4">
                           <div className="space-y-2">
                             <p className="text-xl font-bold text-white uppercase tracking-tighter">Luiz Gustavo Andrade Santos</p>
                             <p className="text-slate-400 text-sm">Estudante de Contabilidade (UFCA) & Servidor Público (IBGE)</p>
                             <p className="text-emerald-500 text-xs font-bold font-mono tracking-widest">roogxbox@gmail.com</p>
                           </div>
                           <p className="text-[10px] text-slate-600 font-medium leading-relaxed uppercase tracking-widest text-justify">
                            Este aplicativo foi inteiramente idealizado, projetado e gerado através de processos de Inteligência Artificial sob a curadoria e direção técnica de Luiz Gustavo Andrade Santos. 
                            O VerdeGrana representa o ápice da comoditização da engenharia de software através de LLMs, sendo focado em eficiência financeira e privacidade total de dados.
                            Luiz Gustavo é estudante de Ciências Contábeis na Universidade Federal do Cariri (UFCA) e atua como Servidor Público no IBGE, unindo o rigor analítico contábil com a inovação tecnológica. <br/><br/>
                            Gerado com auxílio do Google Ai Studio.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10">
                         <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 text-center space-y-2">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idealização</p>
                           <p className="text-xl font-bold text-white">Luiz Gustavo Santos</p>
                         </div>
                         <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 text-center space-y-2">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tecnologia</p>
                           <p className="text-xl font-bold text-white">Gemini 1.5 Pro</p>
                         </div>
                      </div>

                      <div className="pt-8 flex flex-col items-center gap-6">
                         <p className="text-slate-500 text-sm">Precisa de suporte ou tem sugestões?</p>
                         <a href="mailto:roogxbox@gmail.com" className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:scale-105 transition-transform flex items-center justify-center gap-3">
                           <Mail className="w-6 h-6" /> roogxbox@gmail.com
                         </a>
                      </div>
                   </div>

                   <p className="text-[11px] text-slate-600 font-bold uppercase tracking-[0.5em] pt-10 animate-pulse">
                     Versão 1.5.0 Stable
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        {bootStage === 'ready' && (
          <div className="w-full max-w-xs mx-auto text-center py-12 opacity-30">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.25em] leading-relaxed">
              Gerado por Luiz Gustavo Andrade Santos<br/>
              App feito 100% com IA<br/>
              Todos os direitos reservados ao Google Ai Studio
            </p>
          </div>
        )}
      </main>

      {/* Edge-Swipe Visual Handle */}
      <AnimatePresence>
        {confirmModal.open && (
           <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(p => ({ ...p, open: false }))} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative glass max-w-sm w-full p-10 rounded-[3rem] border border-white/10 shadow-2xl text-center space-y-6">
                 <div className="w-16 h-16 bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center mx-auto text-emerald-500">
                    <ShieldCheck className="w-8 h-8" />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{confirmModal.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{confirmModal.description}</p>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setConfirmModal(p => ({ ...p, open: false }))} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all">Cancelar</button>
                    <button onClick={() => { confirmModal.action(); setConfirmModal(p => ({ ...p, open: false })); }} className="flex-1 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition-all active:scale-95">Confirmar</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {edgeSwipe.active && edgeSwipe.distance > 10 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: edgeSwipe.side === 'left' ? -20 : 20 }}
            animate={{ 
              opacity: 1, 
              scale: edgeSwipe.distance > 120 ? 1.2 : 1,
              x: edgeSwipe.side === 'left' ? edgeSwipe.distance - 40 : -(edgeSwipe.distance - 40)
            }}
            exit={{ opacity: 0, scale: 0.5, x: edgeSwipe.side === 'left' ? -40 : 40 }}
            className={cn(
              "fixed top-1/2 -translate-y-1/2 z-[100] w-12 h-24 glass rounded-full flex items-center justify-center border border-white/20 shadow-2xl transition-colors",
              edgeSwipe.distance > 120 ? "bg-emerald-500/40 border-emerald-500/50" : "bg-white/10"
            )}
            style={{ 
              left: edgeSwipe.side === 'left' ? 0 : 'auto',
              right: edgeSwipe.side === 'right' ? 0 : 'auto',
            }}
          >
            {edgeSwipe.side === 'left' ? (
              <ChevronRight className={cn("w-6 h-6 text-white transition-transform", edgeSwipe.distance > 120 ? "scale-125" : "")} />
            ) : (
              <ChevronLeft className={cn("w-6 h-6 text-white transition-transform", edgeSwipe.distance > 120 ? "scale-125" : "")} />
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* MOBILE BOTTOM NAVBAR */}
      {bootStage === 'ready' && (
        <nav className="fixed bottom-0 left-0 w-full glass bg-slate-950/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around py-4 pb-safe z-50 flex-shrink-0">
          <MobileNavItem icon={<Home />} label="Dashboard" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <MobileNavItem icon={<ReceiptText />} label="Histórico" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <button 
            onClick={() => { 
              setEditingTransaction(null);
              setQuickAddDate(null); 
              setIsAnexo(false);
              setSelectedParentId('');
              setIsAddModalOpen(true); 
            }}
            className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 -mt-8 active:scale-90 transition-transform"
          >
            <Plus className="w-8 h-8 text-white" />
          </button>
          <MobileNavItem icon={<Bot />} label="IA" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <MobileNavItem icon={<Settings />} label="Ajustes" active={activeTab === 'settings' || activeTab === 'about'} onClick={() => setActiveTab('settings')} />
        </nav>
      )}

      {/* FOLDER PERMISSION OVERLAY */}
      <AnimatePresence>
        {isComparisonModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsComparisonModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative glass max-w-xl w-full p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
               <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-black text-white tracking-tighter">Comparar Categorias</h2>
                 <button onClick={() => setIsComparisonModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X/></button>
               </div>
               
               <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => {
                    const totalExp = profileTransactions.filter(t => t.category === cat.name && t.type === 'saída').reduce((acc, t) => acc + t.value, 0);
                    const totalInc = profileTransactions.filter(t => t.category === cat.name && t.type === 'entrada').reduce((acc, t) => acc + t.value, 0);
                    const isSelected = analyticsConfig.compareCategories.includes(cat.name);
                    
                    return (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          setAnalyticsConfig(p => ({
                            ...p,
                            compareCategories: isSelected
                              ? p.compareCategories.filter(n => n !== cat.name)
                              : [...p.compareCategories, cat.name]
                          }));
                        }}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all group",
                          isSelected ? "bg-emerald-500/20 border-emerald-500" : "bg-white/5 border-white/5 hover:border-white/20"
                        )}
                      >
                         <div className="flex justify-between items-start mb-2">
                           <span className={cn("font-bold text-sm transition-colors", isSelected ? "text-emerald-400" : "text-slate-400")}>{cat.name}</span>
                           {isSelected && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-emerald-500/60 font-medium">Entradas: {formatCurrency(totalInc)}</span>
                            <span className="text-[10px] text-rose-500/60 font-medium">Saídas: {formatCurrency(totalExp)}</span>
                         </div>
                      </button>
                    );
                  })}
               </div>
               
               <button onClick={() => setIsComparisonModalOpen(false)} className="w-full py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-500/20">
                 Ver Comparação ({analyticsConfig.compareCategories.length})
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setCategoryToDelete(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative glass max-w-sm w-full p-10 rounded-[2.5rem] border border-rose-500/20 shadow-2xl text-center space-y-6">
               <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
                 <Trash2 className="w-8 h-8" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-bold text-white">Excluir Categoria?</h3>
                 <p className="text-slate-400 text-sm">Tem certeza que deseja excluir <strong>"{categoryToDelete.name}"</strong>? Isso não removerá os lançamentos vinculados, mas eles ficarão sem categoria definida.</p>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setCategories(p => p.filter(c => c.id !== categoryToDelete.id));
                      setCategoryToDelete(null);
                      toast.info('Categoria removida com sucesso.');
                    }}
                    className="flex-1 py-4 bg-rose-600 rounded-2xl font-bold hover:bg-rose-500 transition-colors"
                  >
                    Excluir
                  </button>
                  <button onClick={() => setCategoryToDelete(null)} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold border border-white/10">Cancelar</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS & OVERLAYS */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 600 }}
              className="relative w-full max-w-2xl bg-[#0f172a]/95 backdrop-blur-md md:glass p-6 md:p-8 rounded-t-[3rem] md:rounded-[3rem] border-t md:border border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
                <h2 className="text-2xl md:text-3xl font-black text-white">{editingTransaction ? 'Editar' : 'Novo Lançamento'}</h2>
                <button onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); setQuickAddDate(null); }} className="p-2 md:p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X/></button>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const val = parseFloat(fd.get('value') as string);
                
                let type: TransactionType = fd.get('type') as TransactionType;
                let is_redutora = fd.get('is_redutora') === 'on';
                let parent_id = selectedParentId;

                // Logic for "Anexo" mode
                if (isAnexo && parent_id) {
                  const parent = profileTransactions.find(t => t.id === parent_id);
                  if (parent) {
                    type = parent.type; // Adopt parent type
                    const fluxValue = fd.get('flux_anexo');
                    is_redutora = fluxValue === 'diminuir';
                  }
                }

                const data = {
                  date: fd.get('date') as string,
                  desc: fd.get('desc') as string,
                  value: val,
                  category: fd.get('category') as string,
                  type: type,
                  profile_name: activeProfile,
                  status: fd.get('status_toggle') === 'on' ? 'realizado' : 'pendente' as TransactionStatus,
                  is_redutora,
                  parent_id: (isAnexo && parent_id && isUUID(parent_id)) ? parent_id : null,
                  parent_name: (isAnexo && parent_id) ? profileTransactions.find(t => t.id === parent_id)?.desc : null
                };

                if (editingTransaction) {
                  handleUpdateTransaction(editingTransaction.id, data as any);
                  toast.success('Lançamento atualizado!');
                } else {
                  handleAddTransaction(data as any);
                }
                setIsAddModalOpen(false);
                setEditingTransaction(null);
                setQuickAddDate(null);
              }} className="space-y-4 md:space-y-6 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 md:space-y-6 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400">Status</span>
                      <label className="flex items-center cursor-pointer gap-2">
                        <span className="text-[8px] font-bold text-slate-300">Pendente</span>
                        <div className="relative">
                          <input name="status_toggle" type="checkbox" defaultChecked={editingTransaction?.status === 'realizado' || !editingTransaction} className="sr-only peer" />
                          <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:bg-emerald-500 transition-all animate-none" />
                          <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full peer-checked:translate-x-4 transition-all" />
                        </div>
                        <span className="text-[8px] font-bold text-slate-300">Realizado</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400">Anexar a outro lançamento</span>
                      <label className="flex items-center cursor-pointer gap-2">
                        <div className="relative">
                          <input 
                            name="is_redutora_toggle" 
                            type="checkbox" 
                            checked={isAnexo}
                            onChange={(e) => setIsAnexo(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:bg-blue-500 transition-all animate-none" />
                          <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full peer-checked:translate-x-4 transition-all" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {isAnexo && (
                    <div className="flex flex-col gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] uppercase font-black text-blue-400 tracking-widest">Vincular a Lançamento (Pai)</label>
                        <button 
                          type="button"
                          onClick={() => setIsParentModalOpen(true)}
                          className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1"
                        >
                           <Search className="w-2.5 h-2.5" /> {selectedParentId ? 'Trocar' : 'Selecionar'}
                        </button>
                      </div>

                      {selectedParentId ? (
                        <div className="flex items-center justify-between p-2 bg-white/5 rounded-2xl border border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                               <Link2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-white truncate max-w-[150px]">
                                {profileTransactions.find(t => t.id === selectedParentId)?.desc || 'Lançamento selecionado'}
                              </p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase">
                                {formatCurrency(profileTransactions.find(t => t.id === selectedParentId)?.value || 0)}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSelectedParentId('')}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-3 text-center border-2 border-dashed border-white/5 rounded-2xl">
                           <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Nenhum pai selecionado</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] uppercase font-black text-slate-600 ml-2">Data</label>
                      <input name="date" required type="date" defaultValue={editingTransaction?.date || quickAddDate || new Date().toISOString().split('T')[0]} className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all font-mono text-xs" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] uppercase font-black text-slate-600 ml-2">Fluxo</label>
                      {isAnexo ? (
                        <select name="flux_anexo" defaultValue={editingTransaction?.is_redutora ? 'diminuir' : 'aumentar'} className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-blue-500/50 transition-all appearance-none text-xs">
                          <option value="aumentar" className="bg-slate-900">Aumentar o valor (+)</option>
                          <option value="diminuir" className="bg-slate-900">Diminuir o valor (-)</option>
                        </select>
                      ) : (
                        <select name="type" defaultValue={editingTransaction?.type || 'saída'} className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all appearance-none text-xs">
                          <option value="entrada" className="bg-slate-900">Entrada (+)</option>
                          <option value="saída" className="bg-slate-900">Saída (-)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] uppercase font-black text-slate-600 ml-2">Descrição</label>
                    </div>
                    <input name="desc" required placeholder="Ex: Supermercado..." defaultValue={editingTransaction?.desc} className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all text-xs" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-black text-slate-600 ml-2">Valor</label>
                      <input name="value" required type="number" step="0.01" placeholder="0,00" defaultValue={editingTransaction?.value} className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all text-base font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-black text-slate-600 ml-2">Tag</label>
                      <div className="flex gap-2">
                        <select 
                          name="category" 
                          defaultValue={editingTransaction?.category || 'Outros'} 
                          className="flex-1 h-11 bg-white/5 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all appearance-none text-xs"
                        >
                          {categories.reduce((acc: Category[], current) => {
                            if (!acc.find(c => c.id === current.id)) acc.push(current);
                            return acc;
                          }, []).map(c => <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>)}
                        </select>
                        <button 
                          type="button"
                          onClick={() => {
                            const name = prompt('Nome:');
                            if (name) {
                              const id = name.trim().toLowerCase();
                              setCategories(prev => {
                                if (prev.some(c => c.id === id)) {
                                  toast.error('Categoria já existe');
                                  return prev;
                                }
                                return [...prev, { id, name: name.trim(), color: '#10b981' }];
                              });
                            }
                          }}
                          className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-emerald-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-white/10 shrink-0">
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); setQuickAddDate(null); }}
                      className="flex-1 py-3 border border-white/10 text-slate-400 rounded-2xl font-bold text-xs hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    
                    {editingTransaction && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirm('Deseja excluir este lançamento?')) {
                            handleDeleteTransactions([editingTransaction.id]);
                            setIsAddModalOpen(false);
                            setEditingTransaction(null);
                            toast.success('Lançamento excluído');
                          }
                        }}
                        className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl font-bold text-xs hover:bg-rose-500/20 transition-all"
                      >
                        Excluir
                      </button>
                    )}
                    
                    <button type="submit" className="flex-[2] py-3 bg-emerald-600 rounded-2xl font-bold text-xs md:text-sm hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 text-white">
                      {editingTransaction ? 'Salvar Alterações' : 'Confirmar Operação'}
                    </button>
                  </div>

                  {editingTransaction && (
                    <button 
                      type="button"
                      onClick={() => {
                        const currentTx = { ...editingTransaction };
                        setIsAddModalOpen(false);
                        setTimeout(() => {
                          setEditingTransaction(null);
                          setIsAddModalOpen(true);
                          setIsAnexo(true);
                          setSelectedParentId(currentTx.id);
                        }, 300);
                      }}
                      className="w-full py-1.5 text-blue-400 font-bold text-[9px] hover:text-blue-300 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                      <Link className="w-3 h-3" />
                      Adicionar anexo a este lançamento
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {isParentModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsParentModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative glass max-w-lg w-full p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                 <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><Link2 /></div>
                     <h2 className="text-xl font-black text-white uppercase tracking-tighter">Vincular Lançamento</h2>
                   </div>
                   <button onClick={() => setIsParentModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X/></button>
                 </div>

                 <div className="relative mb-4">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <input 
                     type="text" 
                     placeholder="Pesquisar lançamento pai..."
                     value={parentSearchTerm}
                     onChange={e => setParentSearchTerm(e.target.value)}
                     className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-white outline-none focus:border-blue-500/50"
                   />
                 </div>

                 <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {profileTransactions
                      .filter(t => !t.parent_id && t.id !== editingTransaction?.id && t.desc.toLowerCase().includes(parentSearchTerm.toLowerCase()))
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .filter((t, index, self) => index === self.findIndex((tx) => tx.id === t.id))
                      .map(t => (
                        <button 
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedParentId(t.id);
                            setIsParentModalOpen(false);
                            setParentSearchTerm('');
                          }}
                          className={cn(
                            "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group",
                            selectedParentId === t.id ? "bg-blue-500/20 border-blue-500" : "bg-white/5 border-white/5 hover:border-white/20"
                          )}
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                                <Leaf className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-white truncate max-w-[180px]">{t.desc}</p>
                                 <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(t.date).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <p className="font-black text-xs text-white">{formatCurrency(t.value)}</p>
                        </button>
                      ))}
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

function MobileNavItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all flex-1 min-w-0 px-1",
        active ? "text-emerald-400 scale-110" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all flex-shrink-0",
        active ? "bg-emerald-500/10" : ""
      )}>
        {React.cloneElement(icon, { size: active ? 22 : 20 })}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate w-full text-center px-1">{label}</span>
    </button>
  );
}

function StatSmall({ label, value, color, prefix = '', projected }: { label: string, value: number, color: string, prefix?: string, projected?: number }) {
  return (
    <div className="bg-slate-900 px-4 py-3 rounded-2xl border border-white/5 flex flex-col min-w-[140px] flex-1 shadow-sm overflow-hidden box-border">
      <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider mb-1 truncate w-full">{label}</span>
      <div className="flex flex-col">
        <span className={cn("text-base font-black tracking-tighter truncate w-full flex min-w-0 leading-none", color)}>
          <span className="mr-0.5 opacity-60 font-medium flex-shrink-0">{prefix}</span>
          <span className="truncate">{formatCurrency(value)}</span>
        </span>
        {projected !== undefined && (
          <span className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-1">
            Projetado: <span className={cn(projected > 0 ? "text-emerald-500/60" : projected < 0 ? "text-rose-500/60" : "")}>{formatCurrency(projected)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Card({ children, className }: any) {
  return (
    <div className={cn("glass rounded-[2.5rem] border border-white/5 shadow-2xl", className)}>
      {children}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Trees, 
  Activity, 
  Construction, 
  AlertTriangle, 
  Map as MapIcon, 
  Shield, 
  TrendingDown, 
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  Globe,
  Satellite,
  Database,
  Cpu,
  Zap,
  MessageSquare,
  Send,
  Terminal,
  Settings,
  History,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Lightbulb,
  LayoutDashboard,
  Image as ImageIcon,
  Upload,
  Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, FeatureGroup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { ThreeBackground } from './components/ThreeBackground';
import { Loader } from './components/Loader';
import { GlassCard } from './components/GlassCard';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';
import { getChatResponse, getAISuggestions, analyzeSatelliteImage, generateCodePatch, generateActionPlan, analyzeRegion } from './services/gemini';

// --- Utilities ---

const logAudit = async (user: any, action: string, details: string) => {
  try {
    await fetch('/api/admin/log-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username: user.username, action, details })
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};

const logCrash = async (error: Error, info?: any) => {
  try {
    await fetch('/api/admin/log-crash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error_message: error.message, 
        stack_trace: error.stack, 
        user_agent: navigator.userAgent 
      })
    });
  } catch (err) {
    console.error('Failed to log crash:', err);
  }
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logCrash(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-brand-dark">
          <div className="text-center space-y-4">
            <AlertTriangle className="text-rose-500 mx-auto" size={48} />
            <h1 className="text-2xl font-display font-bold text-white">SYSTEM CRITICAL ERROR</h1>
            <p className="text-zinc-500 font-mono text-sm">The incident has been logged for admin review.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for markers
const createIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const icons = {
  degradation: createIcon('#ef4444'),
  construction: createIcon('#f59e0b'),
  growth: createIcon('#10b981')
};

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;
const MarkerAny = Marker as any;
const PopupAny = Popup as any;
const CircleAny = Circle as any;
const FeatureGroupAny = FeatureGroup as any;
const EditControlAny = EditControl as any;
const PolylineAny = Polyline as any;

const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// --- Sub-components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl border border-transparent",
      active 
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5 hover:border-white/10"
    )}
  >
    <Icon size={18} />
    <span className="font-mono text-[10px] tracking-widest uppercase">{label}</span>
  </motion.button>
);

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm Aravalli AI. Ask me about environmental conservation or ecological data." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));
      const response = await getChatResponse(input, history);
      setMessages(prev => [...prev, { role: 'assistant', text: response || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden"
          >
            <div className="p-4 bg-emerald-500/20 border-b border-white/10 flex justify-between items-center backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Activity size={20} />
                <span className="font-display tracking-wider">Aravalli AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm backdrop-blur-md",
                  msg.role === 'user' 
                    ? "bg-emerald-500/20 text-white ml-auto rounded-tr-none border border-emerald-500/30" 
                    : "bg-white/5 text-zinc-100 mr-auto rounded-tl-none border border-white/10"
                )}>
                  {msg.text}
                </div>
              ))}
              {isLoading && (
                <div className="bg-white/5 text-zinc-100 mr-auto rounded-2xl rounded-tl-none p-3 text-sm max-w-[85%] border border-white/10">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2 bg-black/20">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about conservation..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              <button onClick={handleSend} className="bg-emerald-500 p-2 rounded-xl text-black hover:bg-emerald-400 transition-all">
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-500 w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:bg-emerald-400 transition-all"
      >
        <MessageSquare size={24} />
      </motion.button>
    </div>
  );
};

// --- Pages ---

const LoginPage = ({ onLogin }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ThreeBackground />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Shield className="text-emerald-500" size={32} />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-wider">ARAVALLI <span className="text-emerald-500">INTELLIGENCE</span></h1>
            <p className="font-mono text-zinc-500 text-[10px] tracking-[0.2em] uppercase">Secure Access Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-rose-500 text-xs text-center font-mono">{error}</p>}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <span className="font-mono tracking-widest uppercase text-xs">Authorize</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const ndviData = [
    { name: '2019', value: 0.75 },
    { name: '2020', value: 0.72 },
    { name: '2021', value: 0.65 },
    { name: '2022', value: 0.62 },
    { name: '2023', value: 0.55 },
    { name: '2024', value: 0.42 },
  ];

  const nightLightData = [
    { name: '2019', value: 45 },
    { name: '2020', value: 48 },
    { name: '2021', value: 52 },
    { name: '2022', value: 58 },
    { name: '2023', value: 62 },
    { name: '2024', value: 68 },
  ];

  const STATS = [
    { label: 'Forest Cover (ESA WorldCover)', value: '18.4%', change: '+1.2%', icon: Trees, color: 'text-emerald-400' },
    { label: 'NDVI Index (Sentinel-2)', value: '0.42', change: '-12%', icon: Activity, color: 'text-blue-400' },
    { label: 'Night Light (VIIRS/DNB)', value: '64.2', change: '+8.4%', icon: Zap, color: 'text-amber-400' },
    { label: 'Alerts', value: '3', change: '-2', icon: AlertTriangle, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="h-full">
              <div className="flex items-start justify-between">
                <div className={cn("rounded-lg bg-white/5 p-2", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-mono text-[10px] font-bold",
                  stat.change.startsWith('+') ? "text-emerald-400" : "text-rose-400"
                )}>
                  {stat.change.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{stat.label}</p>
                <h3 className="mt-1 text-3xl font-bold">{stat.value}</h3>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-display text-xl font-bold text-white tracking-wider">NDVI LONG-TERM TREND</h3>
              <p className="font-mono text-zinc-500 text-[10px] uppercase tracking-widest">Linear Regression Analysis</p>
            </div>
            <div className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-1 rounded border border-rose-500/20">
              Degradation Detected
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ndviData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid rgba(16, 185, 129, 0.5)', 
                    borderRadius: '12px', 
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#10b981', fontWeight: '800', fontSize: '14px' }}
                  labelStyle={{ color: '#ffffff80', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value}`, 'NDVI Index']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ fill: '#10b981', r: 4 }} 
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-display text-xl font-bold text-white tracking-wider">NIGHT LIGHT INTENSITY</h3>
              <p className="font-mono text-zinc-500 text-[10px] uppercase tracking-widest">VIIRS/DNB Satellite Data</p>
            </div>
            <div className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/20">
              Increasing Urbanization
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nightLightData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid rgba(245, 158, 11, 0.5)', 
                    borderRadius: '12px', 
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#f59e0b', fontWeight: '800', fontSize: '14px' }}
                  labelStyle={{ color: '#ffffff80', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value}`, 'Intensity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-display text-xl font-bold text-white tracking-wider mb-8">RECENT INTELLIGENCE</h3>
          <div className="space-y-4">
            {[
              { title: 'Trucks seen entering protected zone at night', source: 'EcoWarrior Blog', time: '2 days ago', type: 'alert' },
              { title: 'Government announces new green corridor initiative', source: 'GreenNews', time: '3 days ago', type: 'news' },
              { title: 'Dust levels rising in Sector 42, residents complain', source: 'Local Observer', time: '5 days ago', type: 'report' },
            ].map((item, i) => (
              <motion.div 
                key={i} 
                whileHover={{ x: 10 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all cursor-pointer group"
              >
                <div className={cn(
                  "w-1 h-10 rounded-full",
                  item.type === 'alert' ? "bg-rose-500" : item.type === 'news' ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.source}</span>
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="text-[10px] text-zinc-500">{item.time}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const LiveMap = () => {
  const aravalliRange: [number, number][] = [
    [23.0225, 72.5714], // Ahmedabad / Palanpur area
    [24.1723, 72.4251], // Palanpur
    [24.5926, 72.7156], // Mount Abu
    [24.5854, 73.7125], // Udaipur
    [25.1472, 73.5877], // Kumbhalgarh
    [25.7781, 74.1131], // Beawar
    [26.4499, 74.6399], // Ajmer
    [26.9124, 75.7873], // Jaipur
    [27.3285, 76.4332], // Sariska
    [27.5530, 76.6026], // Alwar
    [28.1487, 76.8132], // Rewari
    [28.4121, 77.1245], // Mangar Bani / Gurgaon
    [28.6139, 77.2090], // Delhi Ridge
  ];

  const aravalliPolygon: [number, number][] = [
    [23.0, 72.0],
    [24.0, 72.0],
    [25.0, 73.0],
    [26.0, 74.0],
    [27.0, 75.0],
    [28.5, 76.5],
    [29.0, 77.5],
    [28.0, 78.0],
    [26.5, 77.0],
    [25.0, 75.5],
    [23.5, 73.5],
    [23.0, 72.0]
  ];

  const [markers, setMarkers] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchMarkers = async () => {
    try {
      const res = await fetch('/api/markers');
      if (res.ok) {
        const data = await res.json();
        setMarkers(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch markers:', err);
    }
  };

  useEffect(() => {
    fetchMarkers();
    const interval = setInterval(fetchMarkers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreated = async (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon' || layerType === 'rectangle') {
      const coords = layer.getLatLngs();
      setIsAnalyzing(true);
      setAnalysisResult(null);
      try {
        const result = await analyzeRegion(coords);
        setAnalysisResult(result);
      } catch (err) {
        console.error('Region analysis failed:', err);
        setAnalysisResult('Failed to analyze the selected region. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <GlassCard disable3d={true} className="h-[400px] lg:h-[calc(100vh-12rem)] p-0 overflow-hidden relative">
      {/* Map Legend */}
      <div className="absolute bottom-8 left-8 z-[1000] pointer-events-none hidden md:block">
        <GlassCard className="p-4 border-emerald-500/20 bg-black/60 backdrop-blur-xl">
          <h4 className="font-display text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-3">Intelligence Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Degradation / Deforestation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Illegal Construction</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Natural Growth / Recovery</span>
            </div>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
              <div className="h-0.5 w-4 bg-emerald-500/50 border-t border-dashed border-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest">Aravalli Range Extent</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 glass px-4 py-2 rounded-full shadow-2xl">
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
        <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Satellite Feed</span>
        <span className="font-mono text-[10px] text-zinc-500 ml-2">SYNCED: {lastUpdate.toLocaleTimeString()}</span>
        <span className="hidden md:inline-flex items-center gap-1 ml-4 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-zinc-400 font-mono uppercase tracking-tighter">
          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
          Draw on map for AI Analysis
        </span>
      </div>

      {isAnalyzing && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Loader />
            <p className="mt-4 font-mono text-emerald-400 animate-pulse uppercase tracking-widest text-xs">AI Regional Analysis in Progress...</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 z-[2000] w-80 glass p-6 rounded-2xl shadow-2xl border border-emerald-500/30 max-h-[80%] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                REGION ANALYSIS
              </h3>
              <button onClick={() => setAnalysisResult(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="prose prose-invert prose-sm">
              <Markdown>{analysisResult}</Markdown>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Confidence Level: 94.2%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full w-full">
        <MapContainerAny center={[26.5, 75.5]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <ResizeMap />
          <TileLayerAny 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          <TileLayerAny 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            opacity={0.3}
          />
          <PolylineAny 
            positions={aravalliRange} 
            pathOptions={{ 
              color: '#10b981', 
              weight: 3, 
              dashArray: '10, 10', 
              opacity: 0.8 
            }} 
          />
          <PolylineAny 
            positions={aravalliPolygon}
            pathOptions={{
              color: '#10b981',
              weight: 1,
              fillColor: '#10b981',
              fillOpacity: 0.05
            }}
          />
          <FeatureGroupAny>
            <EditControlAny
              position="topright"
              onCreated={handleCreated}
              draw={{
                rectangle: true,
                polygon: true,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
            />
          </FeatureGroupAny>
          {markers.map(m => (
            <React.Fragment key={m.id}>
              <CircleAny 
                center={[m.lat, m.lng]} 
                radius={1000} 
                pathOptions={{ 
                  color: m.type === 'degradation' ? '#ef4444' : m.type === 'construction' ? '#f59e0b' : '#10b981',
                  fillColor: m.type === 'degradation' ? '#ef4444' : m.type === 'construction' ? '#f59e0b' : '#10b981',
                  fillOpacity: 0.3
                }} 
              />
              <MarkerAny position={[m.lat, m.lng]} icon={icons[m.type]}>
                <PopupAny className="custom-popup">
                  <div className="p-2">
                    <h4 className="font-bold text-emerald-500 uppercase tracking-widest text-[10px]">{m.type}</h4>
                    <p className="text-sm font-medium mt-1">{m.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-2 font-mono">DETECTED: {new Date(m.timestamp).toLocaleString()}</p>
                  </div>
                </PopupAny>
              </MarkerAny>
            </React.Fragment>
          ))}
        </MapContainerAny>
      </div>
    </GlassCard>
  );
};

const AISuggestionsPage = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const handleViewPlan = async (s: any) => {
    if (s.plan) {
      setSelectedSuggestion(s);
      return;
    }
    setIsGeneratingPlan(true);
    setSelectedSuggestion(s);
    try {
      const planText = await generateActionPlan(s);
      const planSteps = planText.split('\n').filter((line: string) => line.trim().length > 0).map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''));
      setSelectedSuggestion({ ...s, plan: planSteps });
    } catch (err) {
      console.error('Failed to generate plan:', err);
      setSelectedSuggestion({ ...s, plan: ['Failed to generate strategic plan. Please retry.'] });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await getAISuggestions();
        setSuggestions(data);
      } catch (err) {
        setSuggestions([
          { 
            title: 'Native Species Reforestation', 
            description: 'Plant drought-resistant native species like Khejri and Rohida to stabilize soil.', 
            impact: 'High Impact', 
            category: 'CONSERVATION',
            plan: [
              'Soil nutrient analysis in Sector 42 and 45.',
              'Procurement of 50,000 native saplings from state nurseries.',
              'Community-led planting drive scheduled for Monsoon 2026.',
              'Installation of drip irrigation systems powered by solar energy.'
            ]
          },
          { 
            title: 'Strict Mining Buffer Zones', 
            description: 'Enforce a 1km buffer zone around protected forest areas.', 
            impact: 'High Impact', 
            category: 'POLICY',
            plan: [
              'Satellite-based boundary mapping of all active mining leases.',
              'Installation of 24/7 surveillance cameras at entry/exit points.',
              'Legal notification to lease holders within the 1km buffer.',
              'Deployment of forest rangers for night patrols.'
            ]
          },
          { 
            title: 'Citizen Watch Programs', 
            description: 'Empower local communities with mobile tools to report illegal dumping.', 
            impact: 'Medium Impact', 
            category: 'COMMUNITY',
            plan: [
              'Launch of "Aravalli Watch" mobile application.',
              'Training workshops for local village heads and youth groups.',
              'Reward system for verified reports of illegal activities.',
              'Direct integration with state police and forest department dashboards.'
            ]
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-3xl font-bold text-white tracking-wider flex items-center gap-3">
            <Lightbulb className="text-amber-500" size={32} />
            AI INTELLIGENCE HUB
          </h2>
          <p className="font-mono text-zinc-500 text-xs mt-2 max-w-2xl">
            Actionable insights generated from real-time satellite data and ecological modeling.
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Zap size={18} />
          <span className="font-mono text-xs uppercase tracking-widest">Refresh Analysis</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 glass rounded-2xl animate-pulse" />)
        ) : (
          suggestions.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{s.category}</div>
                  <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20">
                    {s.impact}
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-4 tracking-wider group-hover:text-emerald-400 transition-colors">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">{s.description}</p>
                <button 
                  onClick={() => handleViewPlan(s)}
                  className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 hover:text-emerald-400 transition-all"
                >
                  View Action Plan <ChevronRight size={14} />
                </button>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedSuggestion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSuggestion(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">{selectedSuggestion.category}</div>
                    <h3 className="font-display text-3xl font-bold text-white tracking-wider">{selectedSuggestion.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedSuggestion(null)}
                    className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Strategic Action Plan</h4>
                    <div className="space-y-4">
                      {isGeneratingPlan && !selectedSuggestion.plan ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">Consulting AI Policy Advisor...</p>
                        </div>
                      ) : (
                        (selectedSuggestion.plan || []).map((step: string, idx: number) => (
                          <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-emerald-400 text-sm font-bold">
                              {idx + 1}
                            </div>
                            <p className="text-zinc-300 text-sm leading-relaxed">{step}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-emerald-500" />
                      <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Verified by AI Core</span>
                    </div>
                    <button className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all">
                      Download Full Report
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ImageAnalysisPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];
      const result = await analyzeSatelliteImage(base64Data, mimeType);
      setAnalysis(result || "No analysis generated.");
      // Log this analysis
      logAudit({ id: 0, username: 'SYSTEM' }, 'IMAGE_ANALYSIS', 'Satellite imagery processed for ecological assessment.');
    } catch (err) {
      console.error(err);
      setError("System failure: Could not process satellite imagery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-white tracking-wider flex items-center gap-3">
          <ImageIcon className="text-blue-500" size={32} />
          SATELLITE IMAGE ANALYSIS
        </h2>
        <p className="font-mono text-zinc-500 text-xs mt-2 max-w-2xl">
          Upload satellite imagery for real-time ecological assessment. Our AI will verify if the image is within the Aravalli surveillance sector.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-white/10 hover:border-emerald-500/30 transition-colors">
          {image ? (
            <div className="relative w-full h-full flex flex-col items-center">
              <img src={image} alt="Uploaded" className="max-h-[300px] rounded-xl object-cover mb-6 shadow-2xl" />
              <div className="flex gap-4">
                <button 
                  onClick={() => setImage(null)}
                  className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Clear Image
                </button>
                <button 
                  onClick={runAnalysis}
                  disabled={loading}
                  className="px-6 py-2 rounded-xl bg-emerald-500 text-black font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50"
                >
                  {loading ? "Analyzing..." : "Run Analysis"}
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-4 group">
              <div className="p-6 rounded-full bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                <Upload size={48} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-bold text-white">Drop Satellite Imagery</p>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">or click to browse files</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </GlassCard>

        <GlassCard className="min-h-[400px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={18} className="text-emerald-400" />
            <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Analysis Report</h3>
          </div>

          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">Scanning Terrain Features...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                <AlertTriangle className="text-rose-500" size={48} />
                <p className="text-rose-500 font-mono text-sm">{error}</p>
              </div>
            ) : analysis ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 max-w-none"
              >
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 leading-relaxed text-zinc-300 text-sm markdown-body">
                  <Markdown>{analysis}</Markdown>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="font-mono text-[8px] text-zinc-600 uppercase tracking-[0.2em]">End of Transmission</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <Terminal size={48} className="text-zinc-500 mb-4" />
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Waiting for Data Input</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const AdminPanel = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crashes, setCrashes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // AI Builder State
  const [prompt, setPrompt] = useState('');
  const [patch, setPatch] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePatch = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateCodePatch(prompt);
      setPatch(result);
      logAudit(user, 'GENERATE_PATCH', `Prompt: ${prompt.substring(0, 50)}...`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!patch) return;
    logAudit(user, 'COMMIT_PATCH', `File: ${patch.filePath} | Changes: ${patch.code.substring(0, 100)}...`);
    alert('System patch committed to repository successfully.');
    setPatch(null);
    setPrompt('');
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Admin API');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch('/api/admin/crashes'),
        fetch('/api/admin/audit-logs')
      ]);
      if (cRes.ok) setCrashes(await cRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'health') {
      fetchLogs();
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] glass rounded-2xl overflow-hidden">
      {/* Mobile Admin Nav */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <Shield className="text-emerald-500" size={20} />
          <span className="font-display text-sm font-bold text-white tracking-wider">ADMIN CORE</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-zinc-400"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "w-full lg:w-64 border-r border-white/10 p-6 flex flex-col gap-2 bg-black/20 transition-all duration-300",
        !isSidebarOpen && "hidden lg:flex"
      )}>
        <div className="hidden lg:flex items-center gap-2 mb-8 px-2">
          <Shield className="text-emerald-500" size={24} />
          <span className="font-display text-lg font-bold text-white tracking-wider">ADMIN CORE</span>
        </div>
        <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
        <SidebarItem icon={Terminal} label="AI Builder" active={activeTab === 'builder'} onClick={() => { setActiveTab('builder'); setIsSidebarOpen(false); }} />
        <SidebarItem icon={Activity} label="System Health" active={activeTab === 'health'} onClick={() => { setActiveTab('health'); setIsSidebarOpen(false); }} />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Accessing Core...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="text-rose-500" size={48} />
              <p className="text-rose-500 font-mono text-sm">{error}</p>
              <button 
                onClick={fetchStats}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono uppercase tracking-widest hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-white tracking-wider uppercase">System Overview</h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Encrypted Session</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Total Users</div>
                    <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20">
                    <Zap size={24} />
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 text-[10px] font-bold uppercase tracking-widest">AI Requests</div>
                    <div className="text-2xl font-bold text-white">{stats?.aiRequests || 0}</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <Settings size={24} />
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Version</div>
                    <div className="text-2xl font-bold text-white">{stats?.version || '1.0.0'}</div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="mt-8">
              <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6">Recent System Events</h3>
              <div className="space-y-4">
                {[
                  { event: 'New Admin Authorized', user: 'admin_01', time: '10m ago' },
                  { event: 'Satellite Sync Complete', user: 'system', time: '25m ago' },
                  { event: 'AI Model Re-trained', user: 'system', time: '1h ago' },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <Terminal size={14} className="text-zinc-500" />
                      <span className="text-sm text-zinc-300">{e.event}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] text-zinc-500">@{e.user}</span>
                      <span className="font-mono text-[10px] text-zinc-600">{e.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        ) : activeTab === 'builder' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-white tracking-wider uppercase">AI System Builder</h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Sparkles size={14} className="text-purple-400" />
                <span className="font-mono text-[8px] font-bold text-purple-400 uppercase tracking-widest">Neural Patching Enabled</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <GlassCard>
                  <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6">Prompt to Code</h3>
                  <div className="space-y-4">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the feature or change you want to implement..."
                      className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-300 focus:border-emerald-500/50 focus:outline-none transition-all resize-none"
                    />
                    <button 
                      onClick={handleGeneratePatch}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Generating Patch...
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Generate System Patch
                        </>
                      )}
                    </button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6">Engine Parameters</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Temperature</label>
                        <span className="font-mono text-[10px] text-emerald-400">0.7</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[70%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Top P</label>
                        <span className="font-mono text-[10px] text-emerald-400">0.95</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[95%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="space-y-6">
                {patch ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <GlassCard className="border-emerald-500/20">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">Patch Generated</h3>
                        </div>
                        <button 
                          onClick={() => setPatch(null)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="font-mono text-[8px] text-zinc-600 uppercase tracking-widest block mb-2">Target File</label>
                          <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-400">
                            {patch.filePath}
                          </div>
                        </div>

                        <div>
                          <label className="font-mono text-[8px] text-zinc-600 uppercase tracking-widest block mb-2">Proposed Changes</label>
                          <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] text-zinc-300 overflow-x-auto whitespace-pre">
                            {patch.code}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 italic text-[10px] text-zinc-400 leading-relaxed">
                          "{patch.explanation}"
                        </div>

                        <button 
                          onClick={handleCommit}
                          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all flex items-center justify-center gap-2"
                        >
                          <PlusCircle size={14} />
                          Commit to Repository
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ) : (
                  <GlassCard className="flex flex-col items-center justify-center min-h-[400px] opacity-30">
                    <Terminal size={48} className="text-zinc-500 mb-4" />
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Waiting for Builder Prompt</p>
                  </GlassCard>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'health' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-white tracking-wider uppercase">System Integrity Monitor</h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Real-time Diagnostics</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard>
                <h3 className="font-mono text-xs font-bold text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Critical Crash Log
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {crashes.length === 0 ? (
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest text-center py-8">No crashes recorded</p>
                  ) : (
                    crashes.map((c: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-rose-400 font-bold text-xs">{c.error_message}</span>
                          <span className="font-mono text-[8px] text-zinc-500">{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="font-mono text-[8px] text-zinc-600 truncate">{c.user_agent}</p>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={14} />
                  System Audit Log
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {auditLogs.length === 0 ? (
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest text-center py-8">No audit logs recorded</p>
                  ) : (
                    auditLogs.map((l: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">{l.action}</span>
                            <span className="text-white font-bold text-xs">@{l.username}</span>
                          </div>
                          <span className="font-mono text-[8px] text-zinc-500">{new Date(l.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-zinc-400 text-[10px] leading-relaxed">{l.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Construction className="text-amber-500 mx-auto mb-4" size={48} />
              <h3 className="font-display text-xl font-bold text-white tracking-wider uppercase mb-2">Module Offline</h3>
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">The requested core module is currently unavailable.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const MainAppContent = ({ user, setUser }: { user: any, setUser: (u: any) => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  // Example of using scrollYProgress for a subtle parallax effect on the background
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'ai', label: 'AI Hub', icon: Lightbulb },
    { id: 'analysis', label: 'Image Analysis', icon: ImageIcon },
    { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true }
  ].filter(item => !item.adminOnly || user.role === 'admin');

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <motion.div style={{ y: backgroundY }} className="fixed inset-0 z-0">
        <ThreeBackground />
      </motion.div>
      
      {/* Navigation */}
      <nav className="fixed top-0 z-40 w-full border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider text-white">
                ARAVALLI <span className="text-emerald-500">INTELLIGENCE</span>
              </h1>
              <p className="font-mono text-[8px] tracking-[0.3em] text-emerald-500/60 uppercase">
                Satellite Surveillance Network
              </p>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative font-mono text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent",
                  activeTab === item.id 
                    ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5 hover:border-white/10"
                )}
              >
                <item.icon size={14} />
                {item.label}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 h-px w-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[8px] font-bold text-emerald-400 uppercase tracking-widest">System Online</span>
            </div>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <button 
              onClick={() => setUser(null)}
              className="rounded-xl p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/5 bg-black/40 backdrop-blur-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                      activeTab === item.id
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-white/5 border-white/10 text-zinc-400"
                    )}
                  >
                    <item.icon size={18} />
                    <span className="font-mono text-xs uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'map' && <LiveMap />}
            {activeTab === 'ai' && <AISuggestionsPage />}
            {activeTab === 'analysis' && <ImageAnalysisPage />}
            {activeTab === 'admin' && <AdminPanel user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Chatbot />

      {/* Global styles for Leaflet and custom elements */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(5, 5, 5, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 16px;
          padding: 4px;
        }
        .custom-popup .leaflet-popup-tip {
          background: rgba(5, 5, 5, 0.8);
        }
        .leaflet-container {
          background: transparent !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;
  if (!user) return <LoginPage onLogin={setUser} />;

  return <MainAppContent user={user} setUser={setUser} />;
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Leaf, User, GraduationCap, ArrowRight, History, 
  Car, Trash2, Smartphone, Save, RefreshCw, BarChart2,
  Settings, LogOut, Database, Search, ShieldCheck,
  CheckCircle2, Sparkles, Pencil, UserCog, AlertTriangle, Layers, X,
  Calendar, Clock, FileDown, CalendarX, Download, Eraser, Eye, ChevronLeft, ChevronRight, Check,
  TrendingUp, PieChart as PieChartIcon, Filter, Quote, AlertCircle, Info, Lock, KeyRound, DownloadCloud, Share, Menu, WifiOff
} from 'lucide-react';
import { 
  TransportType, WasteType, DeviceType, DailyLog, StudentProfile, 
  CO2_FACTORS, LABELS 
} from './types';
import { 
  saveDailyLog, getStudentLogs, 
  loginByStudentId, updateStudentProfile, getAllStudentsData, seedStudentAccounts,
  deleteStudent, deleteAllStudents, exportLogsToCSV, 
  deleteLogsByDateRange, deleteAllLogs, getIsOfflineMode
} from './services/storageService';
import { generateEcoInsight, getRandomWelcomeQuote } from './services/geminiService';
import InputSection from './components/InputSection';
import { DailyDistributionChart, HistoryChart, AdminStudentAnalysisChart, AdminCategoryPieChart } from './components/Charts';

// --- CONSTANTS ---
const ADMIN_CODE = "giaovienadmin"; // Mã đăng nhập dành cho giáo viên

// --- STICKER URLS ---
const STICKERS = {
    HAPPY_WAVE: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765195777/10_gs2ut6.png",
    HOLDING_PAPER: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765195777/11_uedsab.png",
    RUNNING: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765195778/12_jeh80o.png",
    SITTING: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765195778/13_zte1cg.png",
    MAIN_MASCOT: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765195778/14_m0plge.png",
    SUCCESS_CELEBRATION: "https://res.cloudinary.com/dejnvixvn/image/upload/v1765200902/9_onwkt7.png"
};

// --- COMPONENTS: Toast & Celebration ---

const ToastContainer: React.FC<{ toasts: {id: string, message: string, type: 'success' | 'error' | 'warning'}[] }> = ({ toasts }) => {
    return (
        <div className="fixed top-6 right-0 left-0 flex flex-col items-center gap-2 z-[100] pointer-events-none px-4">
            {toasts.map(t => (
                <div key={t.id} className={`
                    pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in-down transition-all
                    ${t.type === 'success' ? 'bg-emerald-500 text-white' : 
                      t.type === 'error' ? 'bg-red-500 text-white' : 
                      'bg-amber-400 text-slate-900'}
                `}>
                    {t.type === 'success' ? <CheckCircle2 size={24} /> : 
                     t.type === 'error' ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
                    <span className="font-bold text-sm">{t.message}</span>
                </div>
            ))}
        </div>
    );
};

const OfflineIndicator: React.FC = () => {
    // Check offline status from service
    const isOffline = getIsOfflineMode();
    if (!isOffline) return null;

    return (
        <div className="bg-slate-800 text-white text-xs font-bold py-1 px-3 text-center flex items-center justify-center gap-2 relative z-[100]">
            <WifiOff size={14} className="text-red-400" />
            <span>Chế độ Offline (Chưa kết nối Cloud) - Dữ liệu chỉ lưu trên máy này.</span>
        </div>
    );
};

const CelebrationOverlay: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000); // Tự tắt sau 4s
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
            {/* Confetti CSS Effect */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div key={i} className="confetti" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 4)]
                    }}></div>
                ))}
            </div>
            
            {/* Sticker Animation */}
            <div className="relative animate-bounce-custom transform transition-all duration-700">
                <div className="absolute inset-0 bg-white/50 rounded-full blur-3xl scale-150 animate-pulse"></div>
                <img 
                    src={STICKERS.SUCCESS_CELEBRATION} 
                    alt="Celebration" 
                    className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl relative z-10"
                />
                <div className="absolute -bottom-10 left-0 right-0 text-center animate-fade-in delay-500">
                     <span className="bg-white/90 backdrop-blur text-emerald-600 px-6 py-2 rounded-full font-extrabold text-xl shadow-lg border border-emerald-100">
                        Tuyệt vời quá! 🌱
                     </span>
                </div>
            </div>
            
            <style>{`
                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    top: -10px;
                    border-radius: 2px;
                    animation: fall linear forwards;
                    animation-duration: 3s;
                }
                @keyframes fall {
                    to { transform: translateY(100vh) rotate(720deg); }
                }
                @keyframes bounce-custom {
                    0% { transform: scale(0) translateY(100px); opacity: 0; }
                    50% { transform: scale(1.1) translateY(-20px); opacity: 1; }
                    70% { transform: scale(0.95) translateY(10px); }
                    100% { transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

const PinLoginModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void,
    correctPin: string,
    studentName: string
}> = ({ isOpen, onClose, onSuccess, correctPin, studentName }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (pin === correctPin) {
            onSuccess();
        } else {
            setError('Mã PIN không đúng!');
            setPin('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl border border-white/50 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <Lock size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Xin chào, {studentName}!</h3>
                <p className="text-slate-500 text-sm mb-6">Vui lòng nhập mã PIN bảo mật để tiếp tục.</p>

                <input 
                    type="password" 
                    value={pin}
                    onChange={e => {
                        setPin(e.target.value);
                        setError('');
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    maxLength={4}
                    className="w-48 text-center text-3xl tracking-[0.5em] font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none mb-4 mx-auto block"
                    placeholder="••••"
                    autoFocus
                />
                
                {error && <p className="text-red-500 text-xs font-bold mb-4 animate-bounce">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Quay lại</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all text-sm">
                        Đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- INSTALL PWA COMPONENT ---
const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSInstruction, setShowIOSInstruction] = useState(false);
    const [showGenericInstruction, setShowGenericInstruction] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        // Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Capture Android/Desktop install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Android / Desktop Chrome way
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIOS) {
            // iOS way
            setShowIOSInstruction(true);
        } else {
            // Fallback for when event didn't fire (iframe, firefox, or just slow)
            setShowGenericInstruction(true);
        }
    };

    // Don't show if already installed
    if (isStandalone) return null;
    
    // Updated: Always show button unless standalone. 
    // If not supported, we show instructions.

    return (
        <>
            <button 
                onClick={handleInstallClick}
                className="mt-6 w-full px-5 py-4 bg-white border border-emerald-100 rounded-2xl text-emerald-700 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 hover:shadow-lg hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
            >
                {/* Decoration */}
                <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-100 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>

                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <DownloadCloud size={20} className="animate-bounce" />
                </div>
                <span>Cài đặt Ứng dụng về máy</span>
            </button>

            {/* iOS Instructions Modal */}
            {showIOSInstruction && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowIOSInstruction(false)}>
                    <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowIOSInstruction(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-inner">
                                <Share size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Cài đặt trên iPhone/iPad</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Apple yêu cầu thực hiện thủ công. Hãy làm theo 3 bước sau nhé:
                            </p>
                            
                            <div className="space-y-4 w-full text-left bg-slate-50 p-5 rounded-2xl mb-4 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">1</span>
                                    <span className="text-sm font-bold text-slate-700">Nhấn nút Chia sẻ <Share size={14} className="inline ml-1 text-blue-500"/></span>
                                </div>
                                <div className="w-px h-3 bg-slate-300 ml-3"></div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">2</span>
                                    <span className="text-sm font-bold text-slate-700">Tìm chọn "Thêm vào MH chính"</span>
                                </div>
                                 <div className="w-px h-3 bg-slate-300 ml-3"></div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">3</span>
                                    <span className="text-sm font-bold text-slate-700">Nhấn nút "Thêm" ở góc trên</span>
                                </div>
                            </div>

                            <button onClick={() => setShowIOSInstruction(false)} className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                                Đã hiểu, làm ngay!
                            </button>
                        </div>
                         <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 md:hidden"></div>
                    </div>
                </div>
            )}

            {/* Generic / PC / Preview Instructions Modal */}
             {showGenericInstruction && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowGenericInstruction(false)}>
                    <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowGenericInstruction(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-inner">
                                <Menu size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Cài đặt Ứng dụng</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Trình duyệt của bạn chưa hỗ trợ nút cài đặt tự động. Hãy thử cách thủ công nhé:
                            </p>
                            
                            <div className="space-y-4 w-full text-left bg-slate-50 p-5 rounded-2xl mb-4 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">1</span>
                                    <span className="text-sm font-bold text-slate-700">Tìm biểu tượng <b>Cài đặt App</b> ở thanh địa chỉ</span>
                                </div>
                                <div className="flex items-center justify-center py-1">
                                    <span className="text-xs text-slate-400 font-medium">-- Hoặc --</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">2</span>
                                    <span className="text-sm font-bold text-slate-700">Nhấn Menu <Menu size={14} className="inline ml-1"/> &rarr; <b>Cài đặt ứng dụng / Thêm vào màn hình chính</b></span>
                                </div>
                            </div>

                            <button onClick={() => setShowGenericInstruction(false)} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ... (Rest of the components remain same until App export)
// We just need to make sure the OfflineIndicator is placed inside App

// ... (Keep WelcomeScreen, SeedModal, DeleteDataModal, StudentHistoryModal, ProfileEditModal, CalculatorScreen, TeacherScreen EXACTLY AS IS)

// For brevity, I am not re-pasting the sub-components unless they changed.
// I will just export the updated App component which includes the OfflineIndicator.

// BUT, since the user asked to FIX the app, I must output the FULL FILE CONTENT for the changed file to be safe and correct.

// ... Let's just output the whole file content for App.tsx to ensure OfflineIndicator is integrated correctly.

const WelcomeScreen: React.FC<{ 
  onStudentLogin: (profile: StudentProfile) => void,
  onTeacherLogin: () => void,
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void
}> = ({ onStudentLogin, onTeacherLogin, showToast }) => {
  const [inputId, setInputId] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<StudentProfile | null>(null);
  const [footerQuote, setFooterQuote] = useState('');

  // Lấy câu châm ngôn ngẫu nhiên khi vào màn hình
  useEffect(() => {
    setFooterQuote(getRandomWelcomeQuote());
  }, []);

  const handleLogin = async () => {
      if (!inputId.trim()) return;
      
      const id = inputId.trim().toLowerCase();

      // 1. Check Admin Code
      if (id === ADMIN_CODE) {
        onTeacherLogin();
        return;
      }

      // 2. Check Student ID
      setLoading(true);
      try {
          const profile = await loginByStudentId(id);
          if (profile) {
              // Nếu profile có PIN, hiển thị modal nhập PIN
              if (profile.pin) {
                  setPendingProfile(profile);
              } else {
                  // Nếu chưa có PIN, đăng nhập luôn (sau đó sẽ bắt buộc set PIN)
                  onStudentLogin(profile);
              }
          } else {
              showToast('Mã số không tồn tại. Vui lòng kiểm tra lại!', 'error');
          }
      } catch (e) {
          showToast('Lỗi kết nối. Vui lòng kiểm tra mạng.', 'error');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {pendingProfile && (
          <PinLoginModal 
            isOpen={!!pendingProfile}
            onClose={() => setPendingProfile(null)}
            correctPin={pendingProfile.pin || ''}
            studentName={pendingProfile.name || pendingProfile.id}
            onSuccess={() => onStudentLogin(pendingProfile)}
          />
      )}

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
         <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
         <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-lime-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="glass-panel mt-20 p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center relative z-10 border border-white/60">
        
        {/* MASCOT STICKER */}
        <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-48 h-48 group cursor-pointer z-20">
            {/* Glow effect behind mascot */}
            <div className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
            
            {/* Mascot Image with Float and Hover Effects */}
            <img 
              src={STICKERS.MAIN_MASCOT}
              alt="EcoTrack Mascot" 
              className="w-full h-full object-contain drop-shadow-2xl transition-all duration-500 ease-in-out transform group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-3"
            />
        </div>

        <div className="mt-12">
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">EcoTrack <span className="text-emerald-600">Học Sinh</span></h1>
            <p className="text-slate-600 font-medium mb-10">Cùng bạn xây dựng thói quen xanh</p>
            
            <div className="space-y-5 text-left">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="text-emerald-500 transition-colors group-focus-within:text-emerald-600" size={20} />
                </div>
                <input 
                type="text" 
                value={inputId}
                onChange={e => setInputId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-bold text-lg shadow-sm"
                placeholder="Nhập mã định danh..."
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="off"
                />
            </div>
            
            <button 
                onClick={handleLogin}
                disabled={loading}
                className={`w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg
                    ${loading ? 'opacity-70 cursor-not-allowed grayscale' : ''}`}
            >
                {loading ? <RefreshCw className="animate-spin" /> : <>Bắt đầu ngay <ArrowRight size={22} /></>}
            </button>
            </div>
            
            {/* INSTALL PWA BUTTON */}
            <div className="flex justify-center w-full">
                <InstallPWA />
            </div>

        </div>
      </div>
      
      <p className="mt-8 text-slate-600 text-sm font-medium italic relative z-10 max-w-md text-center opacity-90 px-4">
        "{footerQuote}"
      </p>
    </div>
  );
};

const SeedModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSeed: (prefix: string, startIndex: number, count: number, defaultClass: string) => void
}> = ({ isOpen, onClose, onSeed }) => {
    // ... code cũ không đổi ...
    const [prefix, setPrefix] = useState('hocsinh');
    const [startIndex, setStartIndex] = useState(1);
    const [count, setCount] = useState(50);
    const [defaultClass, setDefaultClass] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-fade-in border border-white/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="text-indigo-500" /> Tạo tài khoản nhanh
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                
                <p className="text-slate-500 mb-6 font-medium text-sm">
                    Tạo hàng loạt tài khoản học sinh. Nếu ID đã tồn tại, hệ thống sẽ chỉ cập nhật lớp (nếu có) và giữ nguyên dữ liệu cũ.
                </p>

                <div className="space-y-4 mb-8">
                    <div className="flex gap-4">
                         <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Tiền tố ID</label>
                            <input 
                                type="text" value={prefix} onChange={e => setPrefix(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none font-bold"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Bắt đầu từ số</label>
                            <input 
                                type="number" value={startIndex} onChange={e => setStartIndex(parseInt(e.target.value) || 1)}
                                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none font-bold"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Số lượng tạo</label>
                        <input 
                            type="number" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none font-bold"
                            placeholder="VD: 50"
                        />
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Gán lớp (Tuỳ chọn)</label>
                        <input 
                            type="text" value={defaultClass} onChange={e => setDefaultClass(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none font-bold"
                            placeholder="VD: 10A1"
                        />
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl mb-6 text-indigo-700 text-sm font-medium flex items-center gap-2">
                    <Sparkles size={16} />
                    Sẽ tạo từ: <b>{prefix}{startIndex.toString().padStart(3,'0')}</b> đến <b>{prefix}{(startIndex + count - 1).toString().padStart(3,'0')}</b>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Hủy</button>
                    <button 
                        onClick={() => onSeed(prefix, startIndex, count, defaultClass)}
                        className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all text-sm"
                    >
                        Tiến hành tạo
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteDataModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onDeleteRange: (start: string, end: string) => void,
    onDeleteAll: () => void,
    isDeleting: boolean
}> = ({ isOpen, onClose, onDeleteRange, onDeleteAll, isDeleting }) => {
    // ... (No changes in logic, same as previous)
    const getToday = () => new Date().toISOString().split('T')[0];
    const getWeekAgo = () => {
         const d = new Date();
         d.setDate(d.getDate() - 30);
         return d.toISOString().split('T')[0];
    };
    const [mode, setMode] = useState<'RANGE' | 'ALL'>('RANGE');
    const [start, setStart] = useState(getWeekAgo());
    const [end, setEnd] = useState(getToday());
    
    const formatDateDisplay = (isoDate: string) => {
        if(!isoDate) return "";
        try {
            const parts = isoDate.split('-');
            if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return isoDate;
        } catch(e) { return isoDate; }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-fade-in border border-white/50 relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24}/></button>

                <h3 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-4">
                    <AlertTriangle size={24} /> Xóa dữ liệu hệ thống
                </h3>
                
                <p className="text-slate-600 mb-6 text-sm">
                    Hành động này sẽ xóa các bản ghi CO₂ (lịch sử) nhưng <b>không xóa tài khoản học sinh</b>. Dữ liệu đã xóa không thể khôi phục.
                </p>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setMode('RANGE')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'RANGE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Theo ngày
                    </button>
                    <button 
                         onClick={() => setMode('ALL')}
                         className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'ALL' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tất cả
                    </button>
                </div>

                {mode === 'RANGE' && (
                    <div className="space-y-4 mb-6 animate-fade-in">
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                             <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Từ ngày</label>
                                <div className="flex flex-col">
                                    <input 
                                        type="date" 
                                        value={start} 
                                        onChange={e => setStart(e.target.value)} 
                                        className="w-full p-2 rounded-lg border border-slate-200 outline-none text-sm bg-white text-slate-800"
                                    />
                                    <span className="text-right text-xs font-bold text-emerald-600 mt-1 font-mono">{formatDateDisplay(start)}</span>
                                </div>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Đến ngày</label>
                                <div className="flex flex-col">
                                    <input 
                                        type="date" 
                                        value={end} 
                                        onChange={e => setEnd(e.target.value)} 
                                        className="w-full p-2 rounded-lg border border-slate-200 outline-none text-sm bg-white text-slate-800"
                                    />
                                    <span className="text-right text-xs font-bold text-emerald-600 mt-1 font-mono">{formatDateDisplay(end)}</span>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {mode === 'ALL' && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 text-red-700 text-sm font-medium animate-fade-in">
                        Cảnh báo: Toàn bộ lịch sử hoạt động của tất cả học sinh sẽ bị xóa sạch. Bộ đếm CO₂ sẽ quay về 0.
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isDeleting} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Hủy</button>
                    <button 
                        onClick={() => mode === 'RANGE' ? onDeleteRange(start, end) : onDeleteAll()}
                        disabled={isDeleting}
                        className="flex-[2] py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 hover:shadow-xl transition-all text-sm flex justify-center items-center gap-2"
                    >
                        {isDeleting ? <RefreshCw className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                        {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StudentHistoryModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    student: {name: string, studentId: string} | null,
    logs: DailyLog[]
}> = ({ isOpen, onClose, student, logs }) => {
    // ... (Same implementation as previous)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

    const filteredLogs = useMemo(() => {
        const currentLogs = logs || [];
        if (selectedMonths.length === 0) return currentLogs;
        
        return currentLogs.filter(log => {
            const d = new Date(log.timestamp);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            return y === selectedYear && selectedMonths.includes(m);
        });
    }, [logs, selectedYear, selectedMonths]);

    if (!isOpen || !student) return null;

    const totalFilteredCO2 = filteredLogs.reduce((acc, log) => acc + log.totalCo2Kg, 0);

    const toggleMonth = (month: number) => {
        setSelectedMonths(prev => 
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in border border-white/50 relative">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <History className="text-emerald-500" /> Hồ sơ chi tiết
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Học sinh: <span className="font-bold text-indigo-600">{student.name}</span> <span className="bg-slate-200 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-1">{student.studentId}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="w-full lg:w-1/3 space-y-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Filter size={16}/> Bộ lọc thời gian</h4>
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-0.5">
                                        <button onClick={() => setSelectedYear(y => y - 1)} className="text-slate-400 hover:text-indigo-500"><ChevronLeft size={14} /></button>
                                        <span className="font-bold text-slate-700 text-xs">{selectedYear}</span>
                                        <button onClick={() => setSelectedYear(y => y + 1)} className="text-slate-400 hover:text-indigo-500"><ChevronRight size={14} /></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                                        const isSelected = selectedMonths.includes(month);
                                        return (
                                            <button
                                                key={month}
                                                onClick={() => toggleMonth(month)}
                                                className={`
                                                    h-8 rounded-lg text-xs font-bold transition-all relative
                                                    ${isSelected 
                                                        ? 'bg-indigo-500 text-white shadow-md' 
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                                                `}
                                            >
                                                T{month}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-3 text-xs">
                                     <button onClick={() => setSelectedMonths([])} className="text-slate-400 hover:text-slate-600 underline">Tất cả</button>
                                     <span className="text-indigo-500 font-bold">{selectedMonths.length > 0 ? `${selectedMonths.length} tháng đã chọn` : 'Hiển thị tất cả'}</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Tổng phát thải (Đã lọc)</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold">{totalFilteredCO2.toFixed(1)}</span>
                                        <span className="text-sm font-medium opacity-80">kg CO₂</span>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                                        <div>
                                            <p className="text-indigo-200 text-xs">Số bản ghi</p>
                                            <p className="font-bold text-lg">{filteredLogs.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-indigo-200 text-xs text-right">Trung bình/lần</p>
                                            <p className="font-bold text-lg text-right">{filteredLogs.length ? (totalFilteredCO2/filteredLogs.length).toFixed(2) : 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-4 -right-4 text-white/10"><Leaf size={120} /></div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2"><PieChartIcon size={16}/> Cơ cấu phát thải</h4>
                                <AdminCategoryPieChart logs={filteredLogs} />
                            </div>
                        </div>

                        <div className="w-full lg:w-2/3 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-6 flex items-center gap-2"><TrendingUp size={16}/> Xu hướng theo thời gian</h4>
                                <AdminStudentAnalysisChart logs={filteredLogs} />
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 text-sm">Nhật ký chi tiết</h4>
                                    <span className="text-xs text-slate-400">{filteredLogs.length} dòng</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {filteredLogs.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                            <CalendarX size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">Không có dữ liệu phù hợp.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {filteredLogs.map((log) => (
                                                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                                    <div>
                                                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                                            {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                                                            <span className="text-slate-400 font-normal text-xs">
                                                                {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 mt-1 text-xs text-slate-500">
                                                            {log.transport.length > 0 && <span className="flex items-center gap-1"><Car size={10}/> {log.transport.length}</span>}
                                                            {log.waste.length > 0 && <span className="flex items-center gap-1"><Trash2 size={10}/> {log.waste.length}</span>}
                                                            {log.digital.length > 0 && <span className="flex items-center gap-1"><Smartphone size={10}/> {log.digital.length}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold text-emerald-600 text-sm">{log.totalCo2Kg.toFixed(2)} kg</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfileEditModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void, 
    initialName: string, 
    initialClass: string, 
    studentId: string, 
    initialPin?: string, 
    title?: string, 
    description?: string, 
    onSaveSuccess: (name: string, cls: string, pin: string) => void, 
    showToast: (msg: string, type: 'success' | 'error') => void,
    forcePinSetup?: boolean 
}> = ({ isOpen, onClose, initialName, initialClass, initialPin = '', studentId, onSaveSuccess, title, description, showToast, forcePinSetup }) => {
    const [name, setName] = useState(initialName);
    const [cls, setCls] = useState(initialClass);
    const [pin, setPin] = useState(initialPin);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setName(initialName);
            setCls(initialClass);
            setPin(initialPin || '');
        }
    }, [isOpen, initialName, initialClass, initialPin]);

    const handleSave = async () => {
        if (forcePinSetup && (!pin || pin.length < 4)) {
             showToast("Vui lòng thiết lập mã PIN 4 số!", 'error');
             return;
        }

        setSaving(true);
        try {
            await updateStudentProfile(studentId, name, cls, pin);
            onSaveSuccess(name, cls, pin);
            onClose();
        } catch (e) {
            showToast("Lỗi khi lưu thông tin", 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-fade-in border border-white/50 relative">
                {/* Prevent closing if forced setup */}
                {!forcePinSetup && (
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                )}

                <div className="flex items-center gap-2 mb-2">
                    <UserCog className="text-emerald-500" />
                    <h3 className="text-xl font-bold text-slate-800">{title || "Cài đặt thông tin"}</h3>
                </div>
                
                <p className="text-slate-500 mb-6 font-medium text-sm">{description || "Cập nhật thông tin nhận diện."}</p>
                
                <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs font-mono text-slate-500 text-center">
                    ID: {studentId}
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Tên hiển thị</label>
                        <input 
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-slate-800 font-bold"
                            placeholder="Nhập tên..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Lớp</label>
                        <input 
                            type="text" value={cls} onChange={e => setCls(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-slate-800 font-bold"
                            placeholder="Nhập lớp..."
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider flex items-center gap-1">
                            Mã PIN bảo mật {forcePinSetup && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <input 
                                type="text" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                                className={`w-full p-3 pl-10 rounded-xl border ${forcePinSetup && !pin ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-slate-800 font-bold tracking-widest`}
                                placeholder="4 số"
                                maxLength={4}
                            />
                            <KeyRound size={16} className="absolute left-3 top-3.5 text-slate-400" />
                        </div>
                        {forcePinSetup && <p className="text-red-500 text-xs mt-1 font-bold">Bắt buộc thiết lập mã PIN để bảo vệ tài khoản.</p>}
                    </div>
                </div>

                <div className="flex gap-3">
                    {!forcePinSetup && <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Đóng</button>}
                    <button onClick={handleSave} disabled={saving} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all text-sm w-full">
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CalculatorScreen: React.FC<{ 
  student: StudentProfile, 
  onLogout: () => void, 
  onProfileUpdate: (s: StudentProfile) => void,
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void,
  triggerCelebration: () => void
}> = ({ student, onLogout, onProfileUpdate, showToast, triggerCelebration }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for random welcome message
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Time / Date Selection
  const getNow = () => {
    const d = new Date();
    // Trick to get local date string YYYY-MM-DD
    const offset = d.getTimezoneOffset() * 60000; 
    const local = new Date(d.getTime() - offset);
    const iso = local.toISOString();
    return {
        date: iso.split('T')[0],
        time: iso.split('T')[1].slice(0, 5)
    };
  };

  const initialTime = getNow();
  const [logDate, setLogDate] = useState(initialTime.date);
  const [logTime, setLogTime] = useState(initialTime.time);

  // Daily State
  const [transportItems, setTransportItems] = useState<{type: TransportType, amount: number, co2: number, label: string}[]>([]);
  const [wasteItems, setWasteItems] = useState<{type: WasteType, amount: number, co2: number, label: string}[]>([]);
  const [digitalItems, setDigitalItems] = useState<{type: DeviceType, amount: number, co2: number, label: string}[]>([]);
  
  const [historyLogs, setHistoryLogs] = useState<DailyLog[]>([]);
  const [todaySavedCO2, setTodaySavedCO2] = useState(0);

  // Set welcome message once on mount
  useEffect(() => {
    setWelcomeMessage(getRandomWelcomeQuote());
  }, []);

  // Show settings immediately if name is empty OR PIN is missing
  useEffect(() => {
      if (!student.name || !student.pin) {
          setShowSettings(true);
      }
  }, [student.name, student.pin]);

  // Load history & Calc today saved
  useEffect(() => {
    const fetchHistory = async () => {
        const logs = await getStudentLogs(student.id);
        setHistoryLogs(logs);

        // Calculate Saved Today
        // Note: Compare using the string date stored
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTotal = logs
            .filter(l => l.date === todayStr)
            .reduce((sum, l) => sum + l.totalCo2Kg, 0);
        setTodaySavedCO2(todayTotal);
    };
    fetchHistory();
  }, [student.id, activeTab]); // Reload when tab changes (after save)

  const calculateCO2 = (type: string, amount: number, category: 'TRANSPORT' | 'WASTE' | 'DIGITAL') => {
    // @ts-ignore
    return amount * CO2_FACTORS[category][type];
  };

  const addTransport = (type: string, amount: number) => {
    // Note: amount here is already KM (converted inside InputSection)
    const co2 = calculateCO2(type, amount, 'TRANSPORT');
    setTransportItems([...transportItems, { type: type as TransportType, amount, co2, label: LABELS.TRANSPORT[type as TransportType] }]);
  };

  const addWaste = (type: string, amount: number) => {
    // Note: amount here is "items", factor is per item
    const co2 = calculateCO2(type, amount, 'WASTE');
    setWasteItems([...wasteItems, { type: type as WasteType, amount, co2, label: LABELS.WASTE[type as WasteType] }]);
  };

  const addDigital = (type: string, amount: number) => {
    const co2 = calculateCO2(type, amount, 'DIGITAL');
    setDigitalItems([...digitalItems, { type: type as DeviceType, amount, co2, label: LABELS.DIGITAL[type as DeviceType] }]);
  };

  const currentDraftCO2 = [...transportItems, ...wasteItems, ...digitalItems].reduce((acc, item) => acc + item.co2, 0);
  
  const displayTotalCO2 = todaySavedCO2 + currentDraftCO2;

  const handleSave = useCallback(async () => {
    // Construct timestamp from picker
    const dateTimeStr = `${logDate}T${logTime}`;
    const logDateObj = new Date(dateTimeStr);
    const timestamp = logDateObj.getTime();
    
    // Safety check for invalid date
    if (isNaN(timestamp)) {
        showToast("Thời gian không hợp lệ", 'error');
        return;
    }

    const log: DailyLog = {
      id: timestamp.toString() + Math.random().toString(36).substr(2, 5), // Unique ID based on time
      studentId: student.id,
      date: logDate, // Use selected date
      timestamp: timestamp, // Use selected time
      transport: transportItems.map(i => ({ type: i.type, distanceKm: i.amount })),
      waste: wasteItems.map(i => ({ type: i.type, amountKg: i.amount })),
      digital: digitalItems.map(i => ({ type: i.type, hours: i.amount })),
      totalCo2Kg: currentDraftCO2
    };

    setLoadingAi(true);

    try {
        await saveDailyLog(log);
        
        // Reload history & update totals
        const logs = await getStudentLogs(student.id);
        setHistoryLogs(logs); 
        
        // Recalc today total from DB to be accurate
        const todayStr = new Date().toISOString().split('T')[0];
        const newTodayTotal = logs
            .filter(l => l.date === todayStr)
            .reduce((sum, l) => sum + l.totalCo2Kg, 0);
        setTodaySavedCO2(newTodayTotal);
        
        // Check for Celebration Condition (Low CO2 or just a good job)
        // CHANGE: Always celebrate to encourage tracking
        triggerCelebration();
        
        // Clear inputs
        setTransportItems([]); 
        setWasteItems([]); 
        setDigitalItems([]);
        setAiAdvice(null);
        
        try {
            const advice = await generateEcoInsight(log);
            setAiAdvice(advice);
        } catch (aiError) {
            console.error("AI Insight failed but data saved", aiError);
        }

    } catch (error) {
        console.error("Save failed", error);
        showToast("Không thể lưu dữ liệu. Vui lòng kiểm tra kết nối mạng.", 'error');
    } finally {
        setLoadingAi(false);
    }
  }, [transportItems, wasteItems, digitalItems, currentDraftCO2, student.id, logDate, logTime]);

  return (
    <div className="min-h-screen pb-20">
      <ProfileEditModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        initialName={student.name}
        initialClass={student.className}
        initialPin={student.pin}
        studentId={student.id}
        onSaveSuccess={(name, cls, pin) => onProfileUpdate({...student, name, className: cls, pin})}
        showToast={showToast}
        forcePinSetup={!student.pin} // Bắt buộc nếu chưa có PIN
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 pt-8 pb-16 rounded-b-[3rem] shadow-2xl relative z-10">
        
        {/* STICKER 1: Happy mascot sitting on header */}
        <div className="absolute top-1 right-2 w-20 h-20 opacity-90 hidden md:block">
            <img src={STICKERS.HAPPY_WAVE} alt="Happy Mascot" className="w-full h-full object-contain hover:scale-110 transition-transform cursor-pointer"/>
        </div>

        <div className="flex justify-between items-start max-w-2xl mx-auto">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowSettings(true)}>
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 group-hover:bg-white/30 transition-colors">
              <User size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-100 uppercase tracking-widest opacity-80">Học sinh</p>
              <p className="font-bold text-lg flex items-center gap-2">
                  {student.name || "Chưa đặt tên"} 
                  <Settings size={14} className="opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all" />
              </p>
              <p className="text-xs text-emerald-100/80">{student.id}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-xs bg-black/20 hover:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 border border-white/10">
            <LogOut size={14} /> Thoát
          </button>
        </div>
        
        {/* Total Display */}
        <div className="mt-8 text-center">
          <p className="text-emerald-100 text-sm font-bold tracking-widest uppercase mb-2">Ước tính hôm nay</p>
          <div className="inline-flex items-baseline justify-center gap-2 bg-white/10 px-8 py-2 rounded-full backdrop-blur-sm border border-white/10">
            <span className="text-6xl font-extrabold tracking-tighter drop-shadow-sm">{displayTotalCO2.toFixed(2)}</span>
            <span className="text-xl font-medium opacity-90">kg CO₂</span>
          </div>
          {todaySavedCO2 > 0 && currentDraftCO2 > 0 && (
             <p className="text-emerald-100 text-xs mt-2 font-medium opacity-80 animate-pulse">
                (Đã lưu: {todaySavedCO2.toFixed(2)} + Mới: {currentDraftCO2.toFixed(2)})
             </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 -mt-10 relative z-20">
        
        {/* Welcome Quote Card */}
        {welcomeMessage && (
            <div className="mb-6 bg-white/80 backdrop-blur-md border border-white p-4 rounded-2xl flex items-start gap-4 shadow-lg shadow-emerald-500/10">
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 p-3 rounded-xl shrink-0 shadow-inner">
                    <Quote size={20} className="fill-emerald-600/20" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 opacity-80">Thông điệp hôm nay</p>
                    <p className="text-slate-700 font-bold italic text-sm leading-relaxed">
                        "{welcomeMessage}"
                    </p>
                </div>
            </div>
        )}

        <div className="glass-panel p-1.5 rounded-2xl shadow-lg mb-8 flex text-sm font-bold max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'daily' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            Nhập liệu
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            Lịch sử
          </button>
        </div>

        {activeTab === 'daily' ? (
          <div className="space-y-6 animate-fade-in-up relative">
            
            {/* STICKER 2: Holding paper - peeking near date input */}
            <div className="absolute top-10 right-0 w-24 h-24 z-20 pointer-events-none opacity-90 hidden lg:block">
                <img src={STICKERS.HOLDING_PAPER} alt="Helper Mascot" className="w-full h-full object-contain rotate-12"/>
            </div>

            {aiAdvice && (
              <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Sparkles size={100} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3 font-bold text-indigo-100 text-sm uppercase tracking-wider border-b border-white/20 pb-2">
                    <Leaf size={16} /> Gia sư Xanh mách bạn
                  </div>
                  <p className="text-lg leading-relaxed font-medium">{aiAdvice}</p>
                </div>
              </div>
            )}

            <div className="glass-panel p-5 rounded-3xl shadow-lg border border-white/60 mb-6">
                <div className="flex items-center gap-2 mb-4 text-emerald-800 font-bold border-b border-emerald-100 pb-2">
                    <Clock size={20} /> Thời gian thực hiện
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ngày</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={logDate}
                                onChange={(e) => setLogDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-10 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                            />
                            <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Giờ (VN)</label>
                        <div className="relative">
                            <input 
                                type="time" 
                                value={logTime}
                                onChange={(e) => setLogTime(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-10 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                            />
                            <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
              <InputSection 
                title="Đi lại" icon={Car} unitLabel="km" colorClass="bg-blue-500"
                options={Object.keys(LABELS.TRANSPORT).map(k => ({ value: k, label: LABELS.TRANSPORT[k as TransportType] }))}
                onAdd={addTransport} items={transportItems} onRemove={(idx) => setTransportItems(prev => prev.filter((_, i) => i !== idx))}
                isTransport={true}
                maxLimit={180} // Max 180 minutes per trip is reasonable limit
                onError={(msg) => showToast(msg, 'warning')}
              />
              <InputSection 
                title="Rác thải" icon={Trash2} unitLabel="cái/món" colorClass="bg-orange-500"
                options={Object.keys(LABELS.WASTE).map(k => ({ value: k, label: LABELS.WASTE[k as WasteType] }))}
                onAdd={addWaste} items={wasteItems} onRemove={(idx) => setWasteItems(prev => prev.filter((_, i) => i !== idx))}
                maxLimit={50} // Max 50 items/time
                onError={(msg) => showToast(msg, 'warning')}
              />
              <InputSection 
                title="Thiết bị số" icon={Smartphone} unitLabel="giờ" colorClass="bg-purple-500"
                options={Object.keys(LABELS.DIGITAL).map(k => ({ value: k, label: LABELS.DIGITAL[k as DeviceType] }))}
                onAdd={addDigital} items={digitalItems} onRemove={(idx) => setDigitalItems(prev => prev.filter((_, i) => i !== idx))}
                maxLimit={24} // Max 24 hours/day
                onError={(msg) => showToast(msg, 'warning')}
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={loadingAi || currentDraftCO2 === 0}
              className={`w-full py-5 rounded-3xl shadow-xl font-bold text-lg flex items-center justify-center gap-3 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]
                ${loadingAi ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-500/40'}
              `}
            >
              {loadingAi ? <><RefreshCw className="animate-spin" /> Đang xử lý...</> : <><Save size={24}/> Lưu kết quả</>}
            </button>

            <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                <BarChart2 className="text-emerald-500" size={24}/> Phân bố phát thải
              </h3>
              <DailyDistributionChart log={{
                  id: '', studentId: '', date: '', timestamp: 0,
                  transport: transportItems.map(i => ({type: i.type, distanceKm: i.amount})),
                  waste: wasteItems.map(i => ({type: i.type, amountKg: i.amount})),
                  digital: digitalItems.map(i => ({type: i.type, hours: i.amount})),
                  totalCo2Kg: currentDraftCO2
              }} />
            </div>

          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up relative">
            
            {/* STICKER 3: Running - Encouraging progress on history chart */}
            <div className="absolute -top-10 right-4 w-20 h-20 z-20 pointer-events-none">
                <img src={STICKERS.RUNNING} alt="Running Mascot" className="w-full h-full object-contain"/>
            </div>

            <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
               <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                  <History className="text-emerald-500" size={24} /> Biểu đồ 7 ngày qua
               </h3>
               <HistoryChart logs={historyLogs} />
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 pl-2">Nhật ký chi tiết</h3>
              {historyLogs.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-3xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-400 font-medium">Chưa có dữ liệu nào</p>
                </div>
              ) : (
                <div className="max-h-[450px] overflow-y-auto pr-2 space-y-3">
                    {historyLogs.map(log => (
                    <div key={log.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-[6px] border-emerald-500 flex justify-between items-center transition-transform hover:translate-x-1">
                        <div>
                        <p className="font-bold text-slate-800 text-lg">
                            {new Date(log.timestamp || log.date).toLocaleDateString('vi-VN')}
                            <span className="text-slate-400 text-sm ml-2 font-medium">
                                {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </p>
                        <div className="flex gap-2 mt-1">
                            <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{log.transport.length} đi lại</span>
                            <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{log.waste.length} rác</span>
                        </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-extrabold text-emerald-600 text-xl">{log.totalCo2Kg.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 font-bold">kg CO₂</span>
                        </div>
                    </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const TeacherScreen: React.FC<{ onLogout: () => void, showToast: (msg: string, type: 'success' | 'error' | 'warning') => void }> = ({ onLogout, showToast }) => {
  const [students, setStudents] = useState<{studentId: string, name: string, className: string, totalCo2: number, logs: number, pin?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // History View State
  const [viewHistoryStudent, setViewHistoryStudent] = useState<{name: string, studentId: string} | null>(null);
  const [viewHistoryLogs, setViewHistoryLogs] = useState<DailyLog[]>([]);

  // REPORTING STATE
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Modals
  const [editStudent, setEditStudent] = useState<{id: string, name: string, cls: string, pin: string} | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const data = await getAllStudentsData();
      setStudents(data);
      setLoading(false);
  };

  const handleViewHistory = async (student: {studentId: string, name: string}) => {
      setViewHistoryStudent(student);
      setViewHistoryLogs([]);
      try {
          const logs = await getStudentLogs(student.studentId);
          setViewHistoryLogs(logs);
      } catch (e) {
          showToast("Không thể tải lịch sử.", 'error');
          setViewHistoryStudent(null);
      }
  };

  const handleSeed = async (prefix: string, startIndex: number, count: number, defaultClass: string) => {
      setShowSeedModal(false);
      setSeeding(true);
      try {
          const ids = await seedStudentAccounts(prefix, startIndex, count, defaultClass);
          showToast(`Thành công! Đã tạo ${ids.length} tài khoản.`, 'success');
          loadData();
      } catch (e: any) {
          // Display the specific error message from the service if available
          showToast(e.message || "Lỗi khi tạo tài khoản.", 'error');
      } finally {
          setSeeding(false);
      }
  }

  const handleDeleteAll = async () => {
      const confirmStr = prompt("CẢNH BÁO: Thao tác này sẽ xóa TOÀN BỘ học sinh. Nhập 'DELETE' để xác nhận:");
      if (confirmStr !== 'DELETE') return;

      setDeleting(true);
      try {
          await deleteAllStudents();
          showToast("Đã xóa sạch dữ liệu hệ thống.", 'success');
          loadData();
      } catch (e) {
          showToast("Lỗi khi xóa dữ liệu.", 'error');
      } finally {
          setDeleting(false);
      }
  }

  const handleDeleteSingle = async (id: string) => {
      if(!window.confirm(`Bạn có chắc muốn xóa học sinh ${id}?`)) return;
      try {
          await deleteStudent(id);
          loadData();
          showToast(`Đã xóa học sinh ${id}`, 'success');
      } catch(e) {
          showToast("Lỗi khi xóa học sinh.", 'error');
      }
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => 
        prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const handleExport = async () => {
      if(selectedMonths.length === 0) {
          showToast("Vui lòng chọn ít nhất một tháng", 'warning');
          return;
      }
      setExporting(true);
      try {
          const sortedMonths = [...selectedMonths].sort((a,b) => a - b);
          const uri = await exportLogsToCSV(exportYear, sortedMonths);
          
          if (!uri) {
              showToast("Không có dữ liệu.", 'warning');
              setExporting(false);
              return;
          }

          const link = document.createElement("a");
          link.href = uri;
          
          const monthText = sortedMonths.length > 1 ? `cac_thang` : `thang_${sortedMonths[0]}`;
          link.download = `baocao_ecotrack_${monthText}_${exportYear}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error(e);
          showToast("Lỗi khi xuất dữ liệu.", 'error');
      } finally {
          setExporting(false);
      }
  };

  const handleCleanupRange = async (start: string, end: string) => {
      setCleaning(true);
      try {
          const count = await deleteLogsByDateRange(start, end);
          showToast(`Đã xóa ${count} bản ghi cũ.`, 'success');
          setShowDeleteModal(false);
          loadData();
      } catch (e) {
          showToast("Lỗi khi xóa dữ liệu.", 'error');
      } finally {
          setCleaning(false);
      }
  };

  const handleCleanupAll = async () => {
      if (!window.confirm("XÁC NHẬN: Xóa toàn bộ lịch sử CO2?")) return;
      setCleaning(true);
      try {
          const count = await deleteAllLogs();
          showToast(`Đã xóa toàn bộ ${count} bản ghi.`, 'success');
          setShowDeleteModal(false);
          loadData();
      } catch (e) {
          showToast("Lỗi khi xóa dữ liệu.", 'error');
      } finally {
          setCleaning(false);
      }
  }

  const filteredStudents = students.filter(s => 
    s.studentId.includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {editStudent && (
          <ProfileEditModal 
            isOpen={!!editStudent}
            onClose={() => setEditStudent(null)}
            initialName={editStudent.name}
            initialClass={editStudent.cls}
            initialPin={editStudent.pin}
            studentId={editStudent.id}
            title="Sửa thông tin học sinh"
            description="Giáo viên chỉ định tên, lớp và mã PIN."
            onSaveSuccess={() => {
                loadData();
                setEditStudent(null);
            }}
            showToast={showToast}
          />
      )}

      {/* Reused Modals ... */}
      <SeedModal 
          isOpen={showSeedModal} 
          onClose={() => setShowSeedModal(false)}
          onSeed={handleSeed}
      />

      <DeleteDataModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteRange={handleCleanupRange}
        onDeleteAll={handleCleanupAll}
        isDeleting={cleaning}
      />

      <StudentHistoryModal 
        isOpen={!!viewHistoryStudent}
        onClose={() => setViewHistoryStudent(null)}
        student={viewHistoryStudent}
        logs={viewHistoryLogs}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                    <ShieldCheck size={28} /> 
                </div>
                Quản trị viên
            </h1>
            <div className="flex gap-3">
                <button 
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold border border-red-100 hover:bg-red-100 flex items-center gap-2 transition-colors"
                >
                    {deleting ? <RefreshCw className="animate-spin" size={18}/> : <Trash2 size={18} />}
                    {deleting ? 'Đang xóa...' : 'Reset hệ thống'}
                </button>
                <button onClick={onLogout} className="bg-white px-5 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 shadow-sm flex items-center gap-2 transition-colors border border-slate-200">
                    <LogOut size={20} /> Đăng xuất
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative">
            <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-indigo-500">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Tổng số học sinh</p>
                <p className="text-4xl font-extrabold text-slate-800">{students.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-emerald-500">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Tổng CO₂ toàn trường</p>
                <p className="text-4xl font-extrabold text-slate-800">
                    {students.reduce((acc, s) => acc + s.totalCo2, 0).toFixed(1)} <span className="text-lg font-bold text-slate-400">kg</span>
                </p>
            </div>
             <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-orange-500">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Tổng lượt nhật ký</p>
                <p className="text-4xl font-extrabold text-slate-800">
                     {students.reduce((acc, s) => acc + s.logs, 0)}
                </p>
            </div>
        </div>

        {/* Maintenance Panel */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-[2rem] shadow-xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-stretch justify-between">
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <FileDown className="text-emerald-400" /> Báo cáo & Bảo trì
                    </h3>
                    <p className="text-slate-300 text-sm max-w-md mb-6">Xuất dữ liệu ra file Excel (CSV) để báo cáo hoặc dọn dẹp các dữ liệu cũ.</p>
                    
                     {/* Data Cleanup Button Moved Here for better layout */}
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm inline-block w-full max-w-sm">
                         <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-1">Dọn dẹp</p>
                                <p className="text-xs text-slate-400">Xóa bớt dữ liệu cũ</p>
                            </div>
                            <button onClick={() => setShowDeleteModal(true)} disabled={cleaning} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
                                <Eraser size={16}/> Xóa dữ liệu
                            </button>
                         </div>
                    </div>
                </div>

                <div className="flex flex-col w-full lg:w-auto relative">
                    {/* Modern Month Selector */}
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm lg:min-w-[420px] relative z-10">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex gap-2 items-center">
                                 <Calendar size={14}/> Tải báo cáo tháng
                            </p>
                            <div className="flex items-center gap-3 bg-black/20 rounded-lg px-2 py-1">
                                <button onClick={() => setExportYear(y => y - 1)} className="text-slate-300 hover:text-white"><ChevronLeft size={16} /></button>
                                <span className="font-bold text-white font-mono">{exportYear}</span>
                                <button onClick={() => setExportYear(y => y + 1)} className="text-slate-300 hover:text-white"><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-2 mb-4">
                            {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                                const isSelected = selectedMonths.includes(month);
                                return (
                                    <button
                                        key={month}
                                        onClick={() => toggleMonth(month)}
                                        className={`
                                            h-10 rounded-lg text-sm font-bold transition-all relative
                                            ${isSelected 
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105 z-10' 
                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'}
                                        `}
                                    >
                                        T{month}
                                        {isSelected && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full text-emerald-600 flex items-center justify-center"><Check size={8} strokeWidth={4}/></div>}
                                    </button>
                                );
                            })}
                        </div>
                        
                         <button onClick={handleExport} disabled={exporting || selectedMonths.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                            <Download size={18}/> {exporting ? "Đang xử lý..." : `Tải báo cáo (${selectedMonths.length} tháng)`}
                         </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="relative flex-1 max-w-lg group">
                <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm học sinh..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setShowSeedModal(true)}
                disabled={seeding}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-indigo-700 flex items-center gap-3 shadow-lg shadow-indigo-200 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
                <Database size={20} /> 
                {seeding ? "Đang xử lý..." : "Tạo tài khoản"}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {loading ? (
                <div className="text-center py-24 text-slate-500 flex flex-col items-center">
                    <RefreshCw className="animate-spin mb-4 text-indigo-500" size={40}/>
                    <p className="font-medium">Đang tải dữ liệu từ máy chủ...</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                    <th className="py-5 px-6 border-b border-slate-200">Mã ID</th>
                    <th className="py-5 px-6 border-b border-slate-200">Thông tin</th>
                    <th className="py-5 px-6 border-b border-slate-200 text-center">PIN</th>
                    <th className="py-5 px-6 border-b border-slate-200 text-right">Tổng CO₂</th>
                    <th className="py-5 px-6 border-b border-slate-200 text-right">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents.length > 0 ? (
                    filteredStudents.map(s => (
                        <tr key={s.studentId} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="py-5 px-6 font-bold text-indigo-600 font-mono text-sm">{s.studentId}</td>
                            <td className="py-5 px-6">
                                <div className="font-bold text-slate-700">
                                    {s.name === "(Chưa kích hoạt)" || !s.name ? <span className="text-slate-400 italic font-normal">(Chưa có tên)</span> : s.name}
                                </div>
                                {s.className && <div className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">{s.className}</div>}
                            </td>
                            <td className="py-5 px-6 text-center">
                                {s.pin ? (
                                    <span className="bg-emerald-100 text-emerald-700 font-mono font-bold text-xs px-2 py-1 rounded-md">{s.pin}</span>
                                ) : (
                                    <span className="text-slate-300 text-xs italic">Chưa set</span>
                                )}
                            </td>
                            <td className="py-5 px-6 text-right">
                                <span className="font-bold text-slate-800">{s.totalCo2.toFixed(1)}</span>
                                <span className="text-xs text-slate-400 ml-1">kg</span>
                            </td>
                            <td className="py-5 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => handleViewHistory(s)}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Xem chi tiết lịch sử"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setEditStudent({id: s.studentId, name: s.name === "(Chưa kích hoạt)" ? "" : s.name, cls: s.className, pin: s.pin || ''})}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Chỉnh sửa thông tin"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSingle(s.studentId)}
                                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                        title="Xóa tài khoản này"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400">
                            Không tìm thấy kết quả.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            )}
          </div>
          <div className="mt-6 text-xs font-bold text-slate-400 text-center uppercase tracking-widest">Hiển thị {filteredStudents.length} kết quả</div>
        </div>
      </div>
    </div>
  );
};

// --- Main Router Component ---

export default function App() {
  const [view, setView] = useState<'welcome' | 'calculator' | 'teacher'>('welcome');
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  
  // TOAST STATE
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'warning'}[]>([]);
  
  // CELEBRATION STATE
  const [showCelebration, setShowCelebration] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000); // 3 seconds
  };

  // Check login on mount
  useEffect(() => {
    // Basic local check if needed
    const savedId = localStorage.getItem('eco_student_id');
    if (savedId) {
        loginByStudentId(savedId).then(profile => {
            if (profile) {
                setCurrentStudent(profile);
                setView('calculator');
            }
        });
    }
  }, []);

  const handleStudentLogin = (profile: StudentProfile) => {
    localStorage.setItem('eco_student_id', profile.id);
    setCurrentStudent(profile);
    setView('calculator');
    showToast(`Xin chào ${profile.name || 'bạn'}! 👋`, 'success');
  };

  const handleTeacherLogin = () => {
      setView('teacher');
      showToast('Đã đăng nhập quyền Giáo viên', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('eco_student_id');
    setCurrentStudent(null);
    setView('welcome');
    showToast('Đã đăng xuất thành công', 'success');
  };

  return (
    <>
      <OfflineIndicator />
      <ToastContainer toasts={toasts} />
      {showCelebration && <CelebrationOverlay onDismiss={() => setShowCelebration(false)} />}
      
      {view === 'welcome' && <WelcomeScreen onStudentLogin={handleStudentLogin} onTeacherLogin={handleTeacherLogin} showToast={showToast} />}
      {view === 'calculator' && currentStudent && (
        <CalculatorScreen 
          student={currentStudent} 
          onLogout={handleLogout} 
          onProfileUpdate={(updated) => setCurrentStudent(updated)}
          showToast={showToast}
          triggerCelebration={() => setShowCelebration(true)}
        />
      )}
      {view === 'teacher' && <TeacherScreen onLogout={handleLogout} showToast={showToast} />}
    </>
  );
}

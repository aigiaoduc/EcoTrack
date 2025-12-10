
import React from 'react';
import { LucideIcon, Plus, X, Clock, AlertCircle } from 'lucide-react';
import { AVG_SPEED_KMH, TransportType } from '../types';

interface Option {
  value: string;
  label: string;
}

interface InputSectionProps {
  title: string;
  icon: LucideIcon;
  options: Option[];
  unitLabel: string;
  onAdd: (type: string, amount: number) => void;
  items: { type: string; amount: number; co2: number; label: string; displayAmount?: string }[];
  onRemove: (index: number) => void;
  colorClass: string;
  // New props
  isTransport?: boolean; // Nếu là transport thì nhập phút
  maxLimit: number; // Giới hạn nhập liệu
  onError: (msg: string) => void; // Callback bắn toast lỗi
}

const InputSection: React.FC<InputSectionProps> = ({
  title,
  icon: Icon,
  options,
  unitLabel,
  onAdd,
  items,
  onRemove,
  colorClass,
  isTransport = false,
  maxLimit,
  onError
}) => {
  const [selectedType, setSelectedType] = React.useState<string>(options[0].value);
  const [amount, setAmount] = React.useState<string>('');

  const handleAdd = () => {
    let val = parseFloat(amount);
    
    // 1. Sanity Check
    if (isNaN(val) || val <= 0) {
        return;
    }

    if (val > maxLimit) {
        onError(`Woa! Con số ${val} ${isTransport ? 'phút' : unitLabel} có vẻ hơi quá nhiều. Hãy kiểm tra lại nhé!`);
        return;
    }

    // 2. Unit Conversion for Transport (Minutes -> Km)
    if (isTransport) {
        const speed = AVG_SPEED_KMH[selectedType as TransportType] || 15;
        // Distance = (Minutes / 60) * Speed
        const distanceKm = (val / 60) * speed;
        // Pass converted KM to parent, but parent logic needs to handle display
        onAdd(selectedType, distanceKm);
    } else {
        onAdd(selectedType, val);
    }
    
    setAmount('');
  };

  const getDisplayValue = (item: any) => {
     if (isTransport) {
         // Convert back to minutes for display approximation or use the saved user input if we stored it
         // Since the parent currently only stores 'amount' (which is now KM), we need to reverse calc for display
         // Simplification: Just show KM calculated.
         const speed = AVG_SPEED_KMH[item.type as TransportType] || 15;
         const minutes = Math.round((item.amount / speed) * 60);
         return `${minutes} phút (${item.amount.toFixed(1)} km)`;
     }
     return `${item.amount} ${unitLabel}`;
  };

  return (
    <div className="glass-panel p-5 rounded-3xl shadow-lg border border-white/60 mb-6 transition-all hover:shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-md`}>
          <Icon size={24} />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex-[2] bg-white border border-slate-200 rounded-2xl text-slate-800 font-medium p-4 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none appearance-none cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        
        <div className="flex flex-1 gap-2 relative">
            <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold p-4 pr-16 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none placeholder:text-slate-300"
            />
             {/* Visual helper for unit */}
            <span className="absolute right-16 top-1/2 transform -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none bg-white pl-1">
                {isTransport ? 'phút' : unitLabel}
            </span>

            <button
            onClick={handleAdd}
            className={`${colorClass} text-white w-14 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0 absolute right-0 top-0 bottom-0`}
            >
            <Plus size={24} />
            </button>
        </div>
      </div>

      {isTransport && (
         <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
            <Clock size={14} /> 
            <span>Nhập <b>thời gian di chuyển</b>, hệ thống sẽ tự tính quãng đường (km).</span>
         </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2 mt-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/60 border border-white p-3 rounded-xl text-sm shadow-sm animate-fade-in group">
              <span className="text-slate-700 font-medium pl-1">
                {item.label} <span className="text-slate-400 mx-1">•</span> <span className="text-slate-900 font-bold">{getDisplayValue(item)}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs md:text-sm">{item.co2.toFixed(2)} kg</span>
                <button
                  onClick={() => onRemove(idx)}
                  className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                >
                  <X size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputSection;

import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { DailyLog, CO2_FACTORS, LABELS } from '../types';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']; // Emerald, Amber, Blue, Violet, Pink

interface ChartProps {
  currentLog: DailyLog;
  historyLogs: DailyLog[];
}

export const DailyDistributionChart: React.FC<{ log: DailyLog }> = ({ log }) => {
  // Recalculate totals for chart display based on log data and factors
  const tTotal = log.transport.reduce((acc, t) => acc + t.distanceKm * CO2_FACTORS.TRANSPORT[t.type], 0);
  const wTotal = log.waste.reduce((acc, w) => acc + w.amountKg * CO2_FACTORS.WASTE[w.type], 0);
  const dTotal = log.digital.reduce((acc, d) => acc + d.hours * CO2_FACTORS.DIGITAL[d.type], 0);

  const data = [
    { name: 'Đi lại', value: tTotal },
    { name: 'Rác thải', value: wTotal },
    { name: 'Thiết bị', value: dTotal },
  ].filter(d => d.value > 0);

  if (data.length === 0) return <div className="text-center text-gray-400 py-10">Chưa có dữ liệu</div>;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ReTooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HistoryChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
  // 1. Group logs by date (YYYY-MM-DD) and sum CO2
  const dailyTotals: Record<string, number> = {};

  logs.forEach(log => {
    // log.date is formatted as YYYY-MM-DD
    if (!dailyTotals[log.date]) {
      dailyTotals[log.date] = 0;
    }
    dailyTotals[log.date] += log.totalCo2Kg;
  });

  // 2. Convert to array, Sort by date (oldest to newest), and map to display format
  const chartData = Object.keys(dailyTotals)
    .sort() // Sorts YYYY-MM-DD strings correctly chronologically
    .map(dateKey => ({
      date: new Date(dateKey).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      co2: dailyTotals[dateKey]
    }));

  // 3. Take only the last 7 days
  const finalData = chartData.slice(-7);

  if (finalData.length === 0) return <div className="text-center text-gray-400 py-10">Chưa có lịch sử</div>;

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={finalData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <ReTooltip formatter={(value: number) => `${value.toFixed(2)} kg`} cursor={{fill: 'transparent'}} />
          <Bar dataKey="co2" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Biểu đồ cột phân tích xu hướng dành cho Admin
 * Hiển thị toàn bộ logs được lọc, gộp theo ngày
 */
export const AdminStudentAnalysisChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
  const dailyTotals: Record<string, number> = {};

  logs.forEach(log => {
    if (!dailyTotals[log.date]) dailyTotals[log.date] = 0;
    dailyTotals[log.date] += log.totalCo2Kg;
  });

  const data = Object.keys(dailyTotals).sort().map(date => ({
      dateShort: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      fullDate: new Date(date).toLocaleDateString('vi-VN'),
      co2: dailyTotals[date]
  }));

  if (data.length === 0) return <div className="text-center text-slate-400 py-10 italic">Không có dữ liệu trong khoảng thời gian này</div>;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="dateShort" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
          <Tooltip 
            cursor={{fill: '#f1f5f9'}}
            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            formatter={(value: number) => [`${value.toFixed(2)} kg`, 'CO2']}
            labelFormatter={(label) => `Ngày ${label}`}
          />
          <Bar dataKey="co2" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={Math.max(400 / data.length, 10)} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Biểu đồ tròn phân tích cơ cấu phát thải (Tổng hợp toàn bộ logs lọc được)
 */
export const AdminCategoryPieChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    let tTotal = 0, wTotal = 0, dTotal = 0;

    logs.forEach(log => {
        tTotal += log.transport.reduce((acc, t) => acc + t.distanceKm * CO2_FACTORS.TRANSPORT[t.type], 0);
        wTotal += log.waste.reduce((acc, w) => acc + w.amountKg * CO2_FACTORS.WASTE[w.type], 0);
        dTotal += log.digital.reduce((acc, d) => acc + d.hours * CO2_FACTORS.DIGITAL[d.type], 0);
    });

    const data = [
        { name: 'Đi lại', value: tTotal },
        { name: 'Rác thải', value: wTotal },
        { name: 'Thiết bị số', value: dTotal },
    ].filter(d => d.value > 0);

    if (data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 italic text-sm">Chưa có dữ liệu</div>;

    return (
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
                    <Legend wrapperStyle={{fontSize: '11px'}} iconSize={8} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
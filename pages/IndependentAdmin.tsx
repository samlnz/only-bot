
import React, { useEffect, useState } from 'react';

interface Stats {
  total: number;
  profit: number;
  perUser: { name: string; amount: number }[];
}

interface DashboardData {
  onlineCount: number;
  stats: {
    daily: Stats;
    weekly: Stats;
    monthly: Stats;
  };
  deposits: any[];
  withdrawals: any[];
}

interface IndependentAdminProps {
  onExit?: () => void;
}

const MOCK_DATA: DashboardData = {
  onlineCount: 42,
  stats: {
    daily: { total: 4500, profit: 900, perUser: [{ name: "Abebe B.", amount: 1200 }, { name: "Sara K.", amount: 800 }, { name: "Dawit M.", amount: 500 }] },
    weekly: { total: 28400, profit: 5680, perUser: [{ name: "Abebe B.", amount: 5400 }, { name: "Hana T.", amount: 3200 }] },
    monthly: { total: 112000, profit: 22400, perUser: [{ name: "Mekdes G.", amount: 15000 }] }
  },
  deposits: [
    { id: 1, from: { name: "Solomon K." }, amount: 500, text: "Telebirr Ref: 89HJ23", approved: false },
    { id: 2, from: { name: "Bethlehem A." }, amount: 1000, text: "CBE Transfer Receipt attached", approved: false }
  ],
  withdrawals: [
    { id: 101, name: "Daniel R.", amount: 2400, info: "Telebirr: 0911223344", status: "pending" },
    { id: 102, name: "Yared S.", amount: 1200, info: "CBE: 100023456789", status: "pending" }
  ]
};

const IndependentAdmin: React.FC<IndependentAdminProps> = ({ onExit }) => {
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [activeTab, setActiveTab] = useState<'stats' | 'requests'>('stats');

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: { 'Authorization': 'Basic ' + btoa('admin:password') }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Using mock data for preview");
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleAction = async (type: string, id: number, action: string) => {
    setData(prev => {
      const next = { ...prev };
      if (type === 'deposit') {
        next.deposits = next.deposits.filter(d => d.id !== id);
      } else {
        next.withdrawals = next.withdrawals.filter(w => w.id !== id);
      }
      return next;
    });

    try {
      await fetch(`${API_BASE}/api/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, action })
      });
    } catch (e) {
      console.error("Action failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#050b1a] p-3 md:p-8 font-['Rajdhani'] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Responsive Navbar */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
              <i className="fas fa-user-shield text-xl text-amber-400"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-['Orbitron']">STAR <span className="text-amber-500">ADMIN</span></h1>
              <p className="text-[9px] text-white/30 uppercase tracking-[0.3em]">Protocol Management</p>
            </div>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'stats' ? 'bg-amber-500 text-white' : 'text-white/30'}`}
            >
              METRICS
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'requests' ? 'bg-amber-500 text-white' : 'text-white/30'}`}
            >
              QUEUE
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-5 py-2 rounded-xl flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-lg font-bold font-['Orbitron']">{data.onlineCount} <span className="text-[8px] text-white/40 uppercase">Nodes</span></span>
            </div>
            {onExit && (
              <button onClick={onExit} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-red-400 hover:bg-red-500/20 transition-all">
                <i className="fas fa-power-off"></i>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Daily', 'Weekly', 'Monthly'].map((period) => {
              const key = period.toLowerCase() as keyof typeof data.stats;
              const stats = data.stats[key];
              return (
                <div key={period} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
                  <div>
                    <p className="text-[9px] text-amber-400 uppercase font-bold tracking-[0.3em] mb-3">{period} Performance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold font-['Orbitron']">{stats.total.toLocaleString()}</span>
                      <span className="text-[10px] text-white/20 uppercase font-bold">Volume (ETB)</span>
                    </div>
                  </div>

                  {/* House Profit Indicator */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                    <p className="text-[8px] text-emerald-400 uppercase font-bold tracking-[0.2em] mb-1">House Profit (20%)</p>
                    <div className="text-2xl font-bold font-['Orbitron'] text-emerald-400">
                      {stats.profit.toLocaleString()} <span className="text-[10px] opacity-50">ETB</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest border-b border-white/5 pb-2">Top Participant Flow</p>
                    {stats.perUser.map((u, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="text-white/60 truncate max-w-[120px]">{u.name}</span>
                        <span className="text-amber-400 font-bold">{u.amount.toLocaleString()} ETB</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h3 className="text-lg font-['Orbitron'] font-bold mb-6 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Deposits
              </h3>
              <div className="space-y-3">
                {data.deposits.map(d => (
                  <div key={d.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="font-bold text-sm">{d.from.name}</p>
                      <p className="text-[9px] text-white/30">ID: {d.id} • {d.amount} ETB</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleAction('deposit', d.id, 'approve')} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold">Approve</button>
                      <button onClick={() => handleAction('deposit', d.id, 'reject')} className="flex-1 px-4 py-2 bg-white/5 text-white/40 rounded-lg text-[10px] font-bold">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <h3 className="text-lg font-['Orbitron'] font-bold mb-6 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                Withdrawals
              </h3>
              <div className="space-y-3">
                {data.withdrawals.map(w => (
                  <div key={w.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{w.name}</p>
                        <p className="text-xl font-bold text-orange-400 font-['Orbitron']">{w.amount} ETB</p>
                      </div>
                      <button onClick={() => handleAction('withdrawal', w.id, 'approve')} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-[10px] font-bold">Pay</button>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-amber-400">
                      {w.info}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndependentAdmin;

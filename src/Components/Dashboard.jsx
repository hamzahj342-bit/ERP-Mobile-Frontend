import React, { useState, useEffect, useMemo } from 'react';
import {
  FaCalendarAlt,
  FaMobileAlt,
  FaChartLine,
  FaWallet,
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa';
import Footer from './Footer';
import '../Dashboard.css';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';

const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const Dashboard = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const firstDay = `${year}-${month}-01`;

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');

  const [movementData, setMovementData] = useState([]);
  const [lineChartData, setLineChartData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topModels, setTopModels] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    expenses: 0,
    equity: 0,
  });

  useEffect(() => {
    const loadCompanyName = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const companyId = Number(user?.company_id);
        if (!companyId) return;
        const res = await api.get('/companies');
        const company = (res.data || []).find((c) => Number(c.id) === companyId);
        if (company?.name) setCompanyName(String(company.name).trim());
      } catch (err) {
        console.error('Company name fetch error:', err);
      }
    };
    loadCompanyName();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = { fromDate, toDate };

        const [bar, line, statsRes, trend, trendingData] = await Promise.all([
          api.get('/dashboard/bar-chart', { params }),
          api.get('/dashboard/line-chart', { params }),
          api.get('/dashboard/stats-cards', { params }),
          api.get('/dashboard/revenue-expense-trend', { params }),
          api.get('/dashboard/trending-products', { params }),
        ]);

        setMovementData(Array.isArray(bar.data) ? bar.data : []);
        setLineChartData(Array.isArray(line.data) ? line.data : []);
        setStats(statsRes.data || { revenue: 0, profit: 0, expenses: 0, equity: 0 });
        setTrendData(Array.isArray(trend.data) ? trend.data : []);

        const phones =
          trendingData.data?.phones ||
          trendingData.data?.materials ||
          [];
        setTopModels(Array.isArray(phones) ? phones : []);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [fromDate, toDate]);

  const maxModelSales = useMemo(
    () => Math.max(...topModels.map((m) => Number(m.sales || 0)), 1),
    [topModels]
  );

  const tooltipStyle = {
    borderRadius: '10px',
    border: 'none',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
    fontSize: '12px',
    padding: '8px 12px',
  };

  return (
    <MainLayout>
      <div className="dashboard dash-mobile">
        <div className="dashboard-header-flex">
          <div>
            <div className="dashboard-title">
              {companyName ? `${companyName} Dashboard` : 'Dashboard'}
            </div>
            <p className="dashboard-subtitle">
              Phone sales, purchases &amp; profit at a glance
              {loading ? ' · refreshing…' : ''}
            </p>
          </div>

          <div className="date-filter-container">
            <div className="filter-group">
              <FaCalendarAlt className="calendar-icon" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="to-label">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">
                <FaWallet />
              </div>
              <div className="stat-info">
                <p>Total Revenue</p>
                <h3>{money(stats.revenue)}</h3>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <FaChartLine />
              </div>
              <div className="stat-info">
                <p>Net Profit</p>
                <h3 style={{ color: stats.profit >= 0 ? '#0f766e' : '#dc2626' }}>
                  {money(stats.profit)}
                </h3>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <FaArrowDown />
              </div>
              <div className="stat-info">
                <p>Total Expenses</p>
                <h3>{money(stats.expenses)}</h3>
              </div>
            </div>

            <div className="stat-card teal">
              <div className="stat-icon">
                <FaArrowUp />
              </div>
              <div className="stat-info">
                <p>Total Equity</p>
                <h3>{money(stats.equity)}</h3>
              </div>
            </div>
          </div>

          <div className="chart-section">
            {/* Phone units in / out — replaces old Inventory Sales bar */}
            <div className="chart-box">
              <div className="chart-box-head">
                <h3>Phone Movement</h3>
                <span className="chart-chip">Last 7 days · units</span>
              </div>
              <div className="chart-plot">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={movementData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                    barGap={4}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="sellGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      width={32}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                      contentStyle={tooltipStyle}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: 4, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="purchased"
                      name="Purchased"
                      fill="url(#buyGrad)"
                      barSize={18}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="sold"
                      name="Sold"
                      fill="url(#sellGrad)"
                      barSize={18}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <div className="chart-box-head">
                <h3>Sales &amp; Purchases (Rs)</h3>
                <span className="chart-chip">Last 7 days</span>
              </div>
              <div className="chart-plot">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={lineChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(str) => {
                        const d = new Date(`${str}T00:00:00`);
                        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                      }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => money(v)}
                      labelFormatter={(str) =>
                        new Date(`${str}T00:00:00`).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Phone Sales"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0f766e', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="purchases"
                      name="Purchases"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0284c7', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bottom-chart-section">
            <div className="chart-box full-width">
              <div className="chart-box-head">
                <h3>Revenue vs Expenses</h3>
                <span className="chart-chip">Accounting · 7 days</span>
              </div>
              <div className="chart-plot">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(str) => {
                        const date = new Date(`${str}T00:00:00`);
                        return date.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        });
                      }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                      }
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0f766e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="purchases"
                      stroke="#ea580c"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPurchases)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top models — FP products chart removed */}
          <div className="chart-box full-width top-models-panel">
            <div className="chart-box-head">
              <h3>
                <FaMobileAlt style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Top Selling Models
              </h3>
              <span className="chart-chip">Selected period</span>
            </div>

            {topModels.length === 0 ? (
              <p className="dash-empty">No phone sales in this period.</p>
            ) : (
              <ul className="top-models-list">
                {topModels.map((model, index) => {
                  const pct = Math.round(
                    (Number(model.sales || 0) / maxModelSales) * 100
                  );
                  const stockQty = Number(model.stock || 0);
                  return (
                    <li key={`${model.rm_id || model.name}-${index}`} className="top-model-row">
                      <div className="top-model-rank">{index + 1}</div>
                      <div className="top-model-body">
                        <div className="top-model-meta">
                          <span className="top-model-name">{model.name}</span>
                          <span className="top-model-stats">
                            {Number(model.sales || 0).toLocaleString()} sold
                            {model.revenue != null ? (
                              <> · {money(model.revenue)}</>
                            ) : null}
                          </span>
                        </div>
                        <div className="top-model-track">
                          <div
                            className="top-model-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="top-model-stock">
                          <span className="top-model-stock-label">In stock</span>
                          <span className="top-model-stock-value">
                            {stockQty.toLocaleString()} phone{stockQty === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
};

export default Dashboard;

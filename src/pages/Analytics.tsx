import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  PieChart as PieIcon,
  Lightbulb,
  MapPin,
  CalendarDays,
  FileText,
} from "lucide-react";

import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import "../styles/Analytics.css";

// ─── Interfaces ──────────────────────────────────────────────────────

interface Soul {
  id?: number;
  place: string;
  dataadded: string | Date;
  // add other fields if they exist in your API
}

interface PieData {
  key: string;
  city: string;
  users: number;
  percent: number;
  color: string;
}

interface StatItem {
  key: string;
  label: string;
  value: number | string;
  change: string;
  iconVariant: "violet" | "green" | "blue" | "orange";
  iconSvg: React.ReactNode;
  clickable?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

const API_BASE_URL = "/jrmobile";
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PIE_COLORS = ["#7C3AED", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

// ─── Helper Components ──────────────────────────────────────────────

const LineTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tooltip-card">
      <p className="tooltip-label">{label}</p>
      <p className="tooltip-value">{payload[0].value} users</p>
    </div>
  );
};

const PieTooltip = ({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload as PieData;
  return (
    <div className="tooltip-card">
      <p className="tooltip-label">{d.city}</p>
      <p className="tooltip-value" style={{ color: d.color }}>
        {d.users} users ({d.percent}%)
      </p>
    </div>
  );
};

function computeYAxisTicks(maxValue: number) {
  if (maxValue <= 0) return { domainMax: 10, ticks: [0, 2, 4, 6, 8, 10] };
  const step = Math.ceil(maxValue / 5);
  const niceSteps = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000,
  ];
  const niceStep = niceSteps.find((n) => n >= step) || step;
  const domainMax = niceStep * 5;
  const ticks = [
    0,
    niceStep,
    niceStep * 2,
    niceStep * 3,
    niceStep * 4,
    domainMax,
  ];
  return { domainMax, ticks };
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [souls, setSouls] = useState<Soul[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [yearOpen, setYearOpen] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(
  new Date().getFullYear(),
  );

  const [reportCount, setReportCount] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSouls = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/soul/list`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Soul[] = await res.json();
      setSouls(data);
    } catch (err) {
      console.error(err);
      setError("Could not load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSouls();
    const logsString = localStorage.getItem("reportLogs");
    const logs = logsString ? JSON.parse(logsString) : [];
    setReportCount(logs.length);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setYearOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ─── Derived Logic ─────────────────────────────────────────────────

  const getAddedDate = (s: Soul): Date | null => {
    if (!s.dataadded) return null;
    return new Date(s.dataadded);
  };

  const totalUsers = souls.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const newUsersThisMonth = souls.filter((s) => {
    const d = getAddedDate(s);
    return (
      d && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    );
  }).length;

  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthUsers = souls.filter((s) => {
    const d = getAddedDate(s);
    return (
      d &&
      d.getMonth() === lastMonthDate.getMonth() &&
      d.getFullYear() === lastMonthDate.getFullYear()
    );
  }).length;

  const growthDiff = newUsersThisMonth - lastMonthUsers;
  const growthIsUp = growthDiff >= 0;
  const totalPlaces = new Set(souls.map((s) => s.place).filter(Boolean)).size;

  const availableYears: number[] = Array.from(
    new Set(
      souls
        .map((s) => getAddedDate(s)?.getFullYear())
        .filter((y): y is number => y !== undefined),
    ),
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) availableYears.push(currentYear);
  if (!availableYears.includes(currentYear))
    availableYears.unshift(currentYear);

  const monthCounts = MONTH_SHORT.map((label, idx) => {
    const count = souls.filter((s) => {
      const d = getAddedDate(s);
      return d && d.getFullYear() === selectedYear && d.getMonth() === idx;
    }).length;
    return { date: label, users: count };
  });

  const maxMonthCount = Math.max(...monthCounts.map((m) => m.users), 0);
  const { domainMax, ticks } = computeYAxisTicks(maxMonthCount);

  const placeCounts: Record<string, number> = {};
  souls.forEach((s) => {
    if (!s.place) return;
    placeCounts[s.place] = (placeCounts[s.place] || 0) + 1;
  });

  const sortedPlaces = Object.entries(placeCounts).sort((a, b) => b[1] - a[1]);
  const top5 = sortedPlaces.slice(0, 5);
  const othersCount = sortedPlaces.slice(5).reduce((sum, [, c]) => sum + c, 0);

  const placeChartData: PieData[] = [
    ...top5.map(([city, users], i) => ({
      key: `city-${city}`,
      city,
      users,
      percent: totalUsers ? Math.round((users / totalUsers) * 100) : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })),
  ];

  if (othersCount > 0) {
    placeChartData.push({
      key: "city-others",
      city: "Others",
      users: othersCount,
      percent: totalUsers ? Math.round((othersCount / totalUsers) * 100) : 0,
      color: "#C4B5FD",
    });
  }

  const topPlace = sortedPlaces[0];
  const monthActivity = new Array(12).fill(0);
  souls.forEach((s) => {
    const d = getAddedDate(s);
    if (d) monthActivity[d.getMonth()]++;
  });
  const maxMonthActivity = Math.max(...monthActivity, 0);
  const mostActiveMonthIdx = monthActivity.indexOf(maxMonthActivity);

  const stats: StatItem[] = [
    {
      key: "stat-total-users",
      label: "Total Users",
      value: totalUsers,
      change: `${totalUsers} users since the beginning`,
      iconVariant: "violet",
      iconSvg: (
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke="#7C3AED" strokeWidth="1.6" />
          <path
            d="M2 18c0-3.314 2.686-5 6-5h4c3.314 0 6 1.686 6 5"
            stroke="#7C3AED"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="15" cy="8" r="3" stroke="#A78BFA" strokeWidth="1.4" />
        </svg>
      ),
    },
    {
      key: "stat-new-users",
      label: `New Users (${MONTH_FULL[currentMonth]})`,
      value: newUsersThisMonth,
      change: `${MONTH_FULL[currentMonth]} 1 - ${new Date(currentYear, currentMonth + 1, 0).getDate()}`,
      iconVariant: "green",
      iconSvg: (
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <circle cx="9" cy="8" r="3.5" stroke="#16A34A" strokeWidth="1.6" />
          <path
            d="M2 18c0-3.314 2.686-5 7-5h2c4.314 0 7 1.686 7 5"
            stroke="#16A34A"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="4"
            x2="16"
            y2="10"
            stroke="#22C55E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="7"
            x2="19"
            y2="7"
            stroke="#22C55E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "stat-total-places",
      label: "Total Places",
      value: totalPlaces,
      change: `${totalPlaces} places overall`,
      iconVariant: "blue",
      iconSvg: (
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="9" r="3" stroke="#3B82F6" strokeWidth="1.6" />
          <path
            d="M11 2C7.134 2 4 5.134 4 9c0 5.25 7 11 7 11s7-5.75 7-11c0-3.866-3.134-7-7-7z"
            stroke="#3B82F6"
            strokeWidth="1.6"
          />
        </svg>
      ),
    },
    {
      key: "stat-reports",
      label: "Total Reports Generated",
      value: reportCount,
      change: `${reportCount} reports generated`,
      iconVariant: "orange",
      clickable: true,
      iconSvg: (
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <rect
            x="4"
            y="2"
            width="14"
            height="18"
            rx="2"
            stroke="#F97316"
            strokeWidth="1.6"
          />
          <line
            x1="7"
            y1="7"
            x2="15"
            y2="7"
            stroke="#F97316"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="7"
            y1="11"
            x2="15"
            y2="11"
            stroke="#F97316"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="7"
            y1="15"
            x2="11"
            y2="15"
            stroke="#F97316"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="analytics-page">
        <Header />
        <main className="analytics-main">
          <p
            style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}
          >
            Loading analytics...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="analytics-page" ref={containerRef}>
      <Header />
      <main className="analytics-main">
        <div className="analytics-header">
          <div>
            <h1 className="page-title">
              <span className="text-primary">Analytics</span>{" "}
              <span className="text-foreground">Overview</span>
            </h1>
            <p className="page-subtitle">
              Get insights and overview of user data
            </p>
          </div>
        </div>

        {error && (
          <p style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</p>
        )}

        <div className="stats-grid">
          {stats.map((stat) => (
            <div
              key={stat.key}
              className="stat-card"
              onClick={
                stat.clickable ? () => navigate("/report-history") : undefined
              }
              style={stat.clickable ? { cursor: "pointer" } : undefined}
            >
              <div className="stat-card-inner">
                <div className="stat-left">
                  <div className={`stat-icon ${stat.iconVariant}`}>
                    {stat.iconSvg}
                  </div>
                  <div>
                    <p className="stat-label">{stat.label}</p>
                    <p className="stat-value">{stat.value}</p>
                  </div>
                </div>
              </div>
              <div className="stat-change">
                <span className="change-text">{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <div className="chart-icon violet">
                  <TrendingUp size={17} className="icon-primary" />
                </div>
                <div>
                  <p className="chart-title">Users Over Time</p>
                  <p className="chart-subtitle">
                    Number of users added over time
                  </p>
                </div>
              </div>
              <div className="time-dropdown-wrapper">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setYearOpen(!yearOpen);
                  }}
                  className="time-dropdown-btn"
                >
                  {selectedYear}
                  <ChevronDown
                    size={12}
                    className={`dropdown-chevron ${yearOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {yearOpen && (
                  <div className="dropdown-menu small">
                    {availableYears.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => {
                          setSelectedYear(yr);
                          setYearOpen(false);
                        }}
                        className={`dropdown-item ${selectedYear === yr ? "active" : ""}`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={monthCounts}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, domainMax]}
                  ticks={ticks}
                />
                <Tooltip content={LineTooltip} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <div className="chart-icon violet">
                  <PieIcon size={17} className="icon-primary" />
                </div>
                <div>
                  <p className="chart-title">Users by Place</p>
                  <p className="chart-subtitle">Top 5 places by user count</p>
                </div>
              </div>
            </div>
            <div className="pie-chart-container">
              <div className="pie-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={placeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="users"
                    >
                      {placeChartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={PieTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-center-text">
                  <span className="pie-total">{totalUsers}</span>
                  <span className="pie-label">Total</span>
                </div>
              </div>
              <div className="pie-legend">
                {placeChartData.length === 0 ? (
                  <p>No place data yet.</p>
                ) : (
                  placeChartData.map((item) => (
                    <div key={item.key} className="legend-item">
                      <div
                        className="legend-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="legend-city">{item.city}</span>
                      <span className="legend-stats">
                        {item.users} ({item.percent}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="insights-card">
          <div className="insights-header">
            <div className="insights-icon">
              <Lightbulb size={17} className="icon-primary" />
            </div>
            <div>
              <p className="insights-title">Key Insights</p>
              <p className="insights-subtitle">
                Important insights about your user data
              </p>
            </div>
          </div>
          <div className="insights-grid">
            {/* User Growth Insight */}
            <div className="insight-item grow">
              <div className="insight-top">
                <div
                  className={`insight-badge ${growthIsUp ? "green" : "orange"}`}
                >
                  {growthIsUp ? (
                    <TrendingUp size={15} />
                  ) : (
                    <TrendingDown size={15} />
                  )}
                </div>
                <span
                  className={`insight-label ${growthIsUp ? "green" : "orange"}`}
                >
                  User Growth
                </span>
              </div>
              <p className="insight-text">
                {growthIsUp ? (
                  <>
                    <span className="highlight-primary">
                      {Math.abs(growthDiff)} new users
                    </span>{" "}
                    compared to last month.
                  </>
                ) : (
                  <>
                    <span className="highlight-orange">
                      {Math.abs(growthDiff)} fewer users
                    </span>{" "}
                    compared to last month.
                  </>
                )}
              </p>
            </div>

            {/* Top Place Insight */}
            <div className="insight-item place">
              <div className="insight-top">
                <div className="insight-badge blue">
                  <MapPin size={15} />
                </div>
                <span className="insight-label blue">Top Place</span>
              </div>
              <p className="insight-text">
                {topPlace ? (
                  <>
                    <span className="highlight-primary">{topPlace[0]}</span> has
                    the most users ({topPlace[1]}).
                  </>
                ) : (
                  "No data yet."
                )}
              </p>
            </div>

            {/* Most Active Month */}
            <div className="insight-item day">
              <div className="insight-top">
                <div className="insight-badge orange">
                  <CalendarDays size={15} />
                </div>
                <span className="insight-label orange">Most Active Month</span>
              </div>
              <p className="insight-text">
                {maxMonthActivity > 0 ? (
                  <>
                    Most users added in{" "}
                    <span className="highlight-orange">
                      {MONTH_FULL[mostActiveMonthIdx]}
                    </span>
                    .
                  </>
                ) : (
                  "No data yet."
                )}
              </p>
            </div>

            {/* Report Insight */}
            <div className="insight-item report">
              <div className="insight-top">
                <div className="insight-badge violet">
                  <FileText size={15} />
                </div>
                <span className="insight-label violet">Reports</span>
              </div>
              <p className="insight-text">
                You have generated{" "}
                {user?.role === "admin" ? (
                  <span
                    className="highlight-primary"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => navigate("/report-history")}
                  >
                    {reportCount} reports
                  </span>
                ) : (
                  <span className="highlight-primary">
                    {reportCount} reports
                  </span>
                )}{" "}
                so far.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

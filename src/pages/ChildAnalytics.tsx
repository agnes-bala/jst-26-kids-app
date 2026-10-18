// import { useState, useEffect, useMemo } from "react";
// import type { ReactNode } from "react";
// import Header from "../components/Header";
// import {
//   loadKids,
//   loadPresentMany,
//   clearAttendanceCaches,
//   recentSessionDates,
//   weekBefore,
//   stdLabel,
//   stdOrder,
// } from "./AttendanceApi";

// // One attendance session (a day on which children checked in)
// interface Session {
//   date: string; // yyyy-mm-dd
//   male: number;
//   female: number;
//   total: number;
//   ages: Record<number, { male: number; female: number }>; // age -> counts (0 = age not set)
//   places: Record<string, number>; // place / district -> attendance count
//   classes: Record<string, number>; // raw std ("3", "LKG") -> attendance count
//   newKids: number; // children registered in the 7 days up to this session
// }

// interface Slice {
//   key: string;
//   label: string;
//   value: number;
//   color: string;
// }

// interface Busiest {
//   key: string;
//   avg: number;
// }

// interface LineSeries {
//   key: string;
//   label: string;
//   color: string;
//   values: number[];
//   primary?: boolean; // thicker line + bigger dots
//   dashed?: boolean;
// }

// // ─── Helpers ────────────────────────────────────────────────────────────
// const pad = (n: number) => String(n).padStart(2, "0");
// const MONTHS = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "May",
//   "Jun",
//   "Jul",
//   "Aug",
//   "Sep",
//   "Oct",
//   "Nov",
//   "Dec",
// ];
// const MONTH_FULL = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const isoDate = (d: Date) =>
//   `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// const shortDate = (iso: string) => {
//   const [, m, d] = iso.split("-");
//   return `${d} ${MONTHS[Number(m) - 1]}`;
// };
// const longDate = (iso: string) => `${shortDate(iso)} ${iso.slice(0, 4)}`;
// const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// const ageSort = (x: number, y: number) => (x === 0 ? 1 : y === 0 ? -1 : x - y);

// // WhatsApp-ready text for one session (WhatsApp shows *text* in bold)
// const buildMessage = (s: Session) => {
//   const ageKeys = Object.keys(s.ages).map(Number).sort(ageSort);
//   const lines = [
//     `*Attendance Report*`,
//     `Date: ${longDate(s.date)}`,
//     ``,
//     `Male: ${s.male}`,
//     `Female: ${s.female}`,
//     `*Total: ${s.total}*`,
//     ``,
//     `*Age Wise Count*`,
//     ...ageKeys
//       .map((a) => {
//         const c = s.ages[a];
//         if (!c) return "";
//         return `${a === 0 ? "Age not set" : `${a} yrs`} : ${c.male + c.female} (M ${c.male}, F ${c.female})`;
//       })
//       .filter(Boolean),
//   ];
//   return lines.join("\n");
// };

// const pctChange = (now: number, before: number) =>
//   before === 0
//     ? now === 0
//       ? 0
//       : 100
//     : Math.round(((now - before) / before) * 100);

// const MALE = "#2563eb";
// const FEMALE = "#db2777";
// const PURPLE = "#7c3aed";
// const AMBER = "#f59e0b";
// const GREEN = "#16a34a";
// const RED = "#dc2626";
// const PIE_COLORS = ["#7C3AED", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

// // ─── Icons ──────────────────────────────────────────────────────────────
// const Ico = ({
//   size = 20,
//   children,
// }: {
//   size?: number;
//   children: ReactNode;
// }) => (
//   <svg
//     width={size}
//     height={size}
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     aria-hidden="true"
//   >
//     {children}
//   </svg>
// );
// const IcCalendar = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <rect x="3" y="4" width="18" height="18" rx="2" />
//     <line x1="16" y1="2" x2="16" y2="6" />
//     <line x1="8" y1="2" x2="8" y2="6" />
//     <line x1="3" y1="10" x2="21" y2="10" />
//   </Ico>
// );
// const IcUsers = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//     <circle cx="9" cy="7" r="4" />
//     <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//     <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//   </Ico>
// );
// const IcUser = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
//     <circle cx="12" cy="7" r="4" />
//   </Ico>
// );
// const IcTrendUp = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
//     <polyline points="17 6 23 6 23 12" />
//   </Ico>
// );
// const IcTrendDown = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
//     <polyline points="17 18 23 18 23 12" />
//   </Ico>
// );
// const IcPin = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
//     <circle cx="12" cy="10" r="3" />
//   </Ico>
// );
// const IcStar = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
//   </Ico>
// );
// const IcBulb = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <line x1="9" y1="18" x2="15" y2="18" />
//     <line x1="10" y1="22" x2="14" y2="22" />
//     <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
//   </Ico>
// );
// const IcPie = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
//     <path d="M22 12A10 10 0 0 0 12 2v10z" />
//   </Ico>
// );
// const IcBars = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <line x1="18" y1="20" x2="18" y2="10" />
//     <line x1="12" y1="20" x2="12" y2="4" />
//     <line x1="6" y1="20" x2="6" y2="14" />
//   </Ico>
// );
// const IcChat = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//   </Ico>
// );
// const IcActivity = ({ size }: { size?: number }) => (
//   <Ico size={size}>
//     <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
//   </Ico>
// );

// // ─── Small components ───────────────────────────────────────────────────
// const Delta = ({ value, pct }: { value: number; pct?: number }) => {
//   if (value === 0) return <span className="an-d flat">● No change</span>;
//   const up = value > 0;
//   return (
//     <span className={`an-d ${up ? "up" : "down"}`}>
//       {up ? "▲ +" : "▼ "}
//       {value}
//       {pct !== undefined ? ` (${up ? "+" : ""}${pct}%)` : ""}
//     </span>
//   );
// };

// // Stacked bar chart – boys + girls per session (hover a bar for details)
// const StackedBars = ({ data }: { data: Session[] }) => {
//   const W = 760,
//     H = 260,
//     L = 36,
//     R = 10,
//     T = 14,
//     B = 34;
//   const max = Math.max(1, ...data.map((d) => d.total));
//   const niceMax = Math.ceil(max / 5) * 5 || 5;
//   const innerW = W - L - R;
//   const step = innerW / Math.max(1, data.length);
//   const bw = Math.min(46, step * 0.62);
//   const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
//   const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
//   const every = Math.ceil(data.length / 12);
//   return (
//     <svg
//       viewBox={`0 0 ${W} ${H}`}
//       className="an-svg"
//       role="img"
//       aria-label="Weekly attendance, boys and girls"
//     >
//       {ticks.map((t) => (
//         <g key={t}>
//           <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f3f4f6" />
//           <text
//             x={L - 6}
//             y={y(t) + 4}
//             fontSize="10"
//             fill="#9ca3af"
//             textAnchor="end"
//           >
//             {t}
//           </text>
//         </g>
//       ))}
//       {data.map((d, i) => {
//         const x = L + i * step + (step - bw) / 2;
//         return (
//           <g key={d.date} className="an-hit">
//             <rect
//               x={L + i * step}
//               y={T}
//               width={step}
//               height={H - T - B}
//               fill="transparent"
//               className="an-hitbg"
//             />
//             <rect
//               x={x}
//               y={y(d.male)}
//               width={bw}
//               height={y(0) - y(d.male)}
//               fill={MALE}
//               rx="2"
//             />
//             <rect
//               x={x}
//               y={y(d.total)}
//               width={bw}
//               height={y(d.male) - y(d.total)}
//               fill={FEMALE}
//               rx="2"
//             />
//             <text
//               x={x + bw / 2}
//               y={y(d.total) - 4}
//               fontSize="10"
//               fontWeight="700"
//               fill="#374151"
//               textAnchor="middle"
//             >
//               {d.total}
//             </text>
//             {i % every === 0 && (
//               <text
//                 x={x + bw / 2}
//                 y={H - 12}
//                 fontSize="10"
//                 fill="#6b7280"
//                 textAnchor="middle"
//               >
//                 {shortDate(d.date)}
//               </text>
//             )}
//             <title>{`${longDate(d.date)}\nMale: ${d.male}\nFemale: ${d.female}\nTotal: ${d.total}`}</title>
//           </g>
//         );
//       })}
//     </svg>
//   );
// };

// // Reusable multi-series line chart (hover a column for every series' value)
// const LineChart = ({
//   labels,
//   titles,
//   series,
//   ariaLabel,
//   height = 240,
//   suffix = "",
//   maxOverride,
// }: {
//   labels: string[];
//   titles?: string[]; // full tooltip heading per point (defaults to the label)
//   series: LineSeries[];
//   ariaLabel: string;
//   height?: number;
//   suffix?: string;
//   maxOverride?: number;
// }) => {
//   const W = 760,
//     H = height,
//     L = 36,
//     R = 16,
//     T = 14,
//     B = 34;
//   const n = labels.length;
//   const max = maxOverride ?? Math.max(1, ...series.flatMap((s) => s.values));
//   const niceMax = maxOverride ?? (Math.ceil(max / 5) * 5 || 5);
//   const step = n > 1 ? (W - L - R) / (n - 1) : 0;
//   const x = (i: number) => (n > 1 ? L + i * step : (W + L - R) / 2);
//   const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
//   const path = (vals: number[]) =>
//     vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
//   const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
//   const every = Math.ceil(n / 12);
//   const colW = n > 1 ? step : W - L - R;

//   return (
//     <svg
//       viewBox={`0 0 ${W} ${H}`}
//       className="an-svg"
//       role="img"
//       aria-label={ariaLabel}
//     >
//       {ticks.map((t) => (
//         <g key={t}>
//           <line
//             x1={L}
//             x2={W - R}
//             y1={y(t)}
//             y2={y(t)}
//             stroke="#f3f4f6"
//             strokeDasharray="3 3"
//           />
//           <text
//             x={L - 6}
//             y={y(t) + 4}
//             fontSize="10"
//             fill="#9ca3af"
//             textAnchor="end"
//           >
//             {t}
//             {suffix}
//           </text>
//         </g>
//       ))}
//       {series.map((s) => (
//         <g key={s.key}>
//           <path
//             d={path(s.values)}
//             fill="none"
//             stroke={s.color}
//             strokeWidth={s.primary ? 2.5 : 1.8}
//             strokeDasharray={s.dashed ? "6 4" : undefined}
//             strokeLinejoin="round"
//           />
//           {!s.dashed &&
//             s.values.map((v, i) => (
//               <circle
//                 key={`${s.key}-${i}`}
//                 cx={x(i)}
//                 cy={y(v)}
//                 r={s.primary ? 4 : 2.8}
//                 fill={s.color}
//               />
//             ))}
//         </g>
//       ))}
//       {labels.map((lb, i) => (
//         <g key={`h-${i}`} className="an-hit">
//           <rect
//             x={x(i) - colW / 2}
//             y={T}
//             width={colW}
//             height={H - T - B}
//             fill="transparent"
//             className="an-hitbg"
//           />
//           <title>
//             {[
//               titles?.[i] ?? lb,
//               ...series.map(
//                 (s) => `${s.label}: ${fmtNum(s.values[i])}${suffix}`,
//               ),
//             ].join("\n")}
//           </title>
//         </g>
//       ))}
//       {labels.map((lb, i) =>
//         i % every === 0 ? (
//           <text
//             key={`l-${i}`}
//             x={x(i)}
//             y={H - 12}
//             fontSize="10"
//             fill="#6b7280"
//             textAnchor="middle"
//           >
//             {lb}
//           </text>
//         ) : null,
//       )}
//     </svg>
//   );
// };

// const SeriesLegend = ({ series }: { series: LineSeries[] }) => (
//   <div className="an-legend">
//     {series.map((s) => (
//       <span key={s.key}>
//         <i style={{ background: s.color }} />
//         {s.label}
//       </span>
//     ))}
//   </div>
// );

// // Donut with any number of slices (used for gender split and place split)
// const DonutMulti = ({
//   slices,
//   centerValue,
//   centerLabel,
// }: {
//   slices: Slice[];
//   centerValue: number;
//   centerLabel: string;
// }) => {
//   const total = slices.reduce((s, x) => s + x.value, 0);
//   const r = 52;
//   const c = 2 * Math.PI * r;
//   let acc = 0;
//   return (
//     <svg
//       viewBox="0 0 140 140"
//       className="an-donut"
//       role="img"
//       aria-label={centerLabel}
//     >
//       <circle
//         cx="70"
//         cy="70"
//         r={r}
//         fill="none"
//         stroke="#f3f4f6"
//         strokeWidth="18"
//       />
//       {total > 0 &&
//         slices.map((s) => {
//           const len = (s.value / total) * c;
//           const dash = Math.max(0, len - 1.5);
//           const el = (
//             <circle
//               key={s.key}
//               cx="70"
//               cy="70"
//               r={r}
//               fill="none"
//               stroke={s.color}
//               strokeWidth="18"
//               strokeDasharray={`${dash} ${c - dash}`}
//               strokeDashoffset={-acc}
//               transform="rotate(-90 70 70)"
//             >
//               <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
//             </circle>
//           );
//           acc += len;
//           return el;
//         })}
//       <text
//         x="70"
//         y="68"
//         textAnchor="middle"
//         fontSize="20"
//         fontWeight="700"
//         fill="#111827"
//       >
//         {centerValue}
//       </text>
//       <text x="70" y="85" textAnchor="middle" fontSize="10" fill="#6b7280">
//         {centerLabel}
//       </text>
//     </svg>
//   );
// };

// const Legend = ({ slices }: { slices: Slice[] }) => {
//   const total = slices.reduce((s, x) => s + x.value, 0);
//   return (
//     <div className="an-pie-legend">
//       {slices.map((s) => (
//         <div key={s.key} className="an-legend-item">
//           <span className="an-dot" style={{ background: s.color }} />
//           <span className="an-legend-name">{s.label}</span>
//           <span className="an-legend-val">
//             {s.value} ({total ? Math.round((s.value / total) * 100) : 0}%)
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// };

// // ─── Styles ─────────────────────────────────────────────────────────────
// const css = `
// .an { height: 100vh; height: 100dvh; display: flex; flex-direction: column; background: #f8f7ff; color: #111827;
//   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
// .an, .an * { text-align: left; box-sizing: border-box; }
// .an button { width: auto; transform: none !important; font-family: inherit; }
// .an-top { flex: none; position: relative; z-index: 100; }
// .an-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
// .an-wrap { width: 100%; max-width: 1280px; margin: 0 auto; padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 16px; }

// .an-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
// .an-title { font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; }
// .an-title .p { color: #7c3aed; }
// .an-sub { font-size: 13px; color: #6b7280; margin: 3px 0 0; }
// .an-stamp { font-size: 12px; color: #9ca3af; margin: 2px 0 0; }
// .an-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
// .an select { height: 34px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; color: #374151; font-family: inherit; }
// .an select:focus-visible, .an .an-btn:focus-visible, .an-msg:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
// .an .an-btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 600; cursor: pointer; }
// .an .an-btn:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
// .an .an-btn:disabled { opacity: .55; cursor: not-allowed; }
// .an .an-copy { background: #7c3aed; border-color: #7c3aed; color: #fff; }
// .an .an-copy:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; color: #fff; }
// .an a.an-wa { display: inline-flex; align-items: center; text-decoration: none; background: #16a34a; border-color: #16a34a; color: #fff; }
// .an a.an-wa:hover { background: #15803d; border-color: #15803d; color: #fff; }

// .an-error { padding: 8px 12px; border-radius: 8px; font-size: 13px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

// /* stat cards */
// .an-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
// .an-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; transition: box-shadow .15s, transform .15s; }
// .an-stat:hover { box-shadow: 0 6px 18px rgba(124, 58, 237, .10); }
// .an-stat-top { display: flex; align-items: center; gap: 12px; }
// .an-sico { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
// .an-sico.violet { background: #ede9fe; color: #7c3aed; }
// .an-sico.green { background: #dcfce7; color: #16a34a; }
// .an-sico.blue { background: #dbeafe; color: #2563eb; }
// .an-sico.pink { background: #fce7f3; color: #db2777; }
// .an-sico.orange { background: #ffedd5; color: #ea580c; }
// .an-sl { font-size: 12.5px; font-weight: 500; color: #6b7280; margin: 0; }
// .an-sv { font-size: 26px; font-weight: 800; margin: 0; line-height: 1.15; }
// .an-sc { font-size: 12px; color: #9ca3af; margin: 0; border-top: 1px solid #f3f4f6; padding-top: 8px; }

// /* cards */
// .an-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; min-width: 0; }
// .an-ch { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid #f3f4f6; }
// .an-cht { display: flex; align-items: center; gap: 10px; min-width: 0; }
// .an-chi { width: 34px; height: 34px; border-radius: 9px; background: #ede9fe; color: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
// .an-ct { font-size: 15px; font-weight: 700; margin: 0; }
// .an-cs { font-size: 12px; color: #9ca3af; margin: 1px 0 0; }
// .an-cb { padding: 14px 18px; }
// .an-legend { display: flex; gap: 14px; font-size: 12px; color: #6b7280; flex-wrap: wrap; }
// .an-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
// .an-svg { width: 100%; height: auto; display: block; }
// .an-hit .an-hitbg:hover { fill: rgba(124, 58, 237, .07); }

// .an-grid2 { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
// .an-grid2e { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
// .an-donutwrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center; }
// .an-donut { width: 170px; height: 170px; flex-shrink: 0; }
// .an-pie-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
// .an-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
// .an-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
// .an-legend-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #374151; }
// .an-legend-val { font-weight: 600; color: #111827; white-space: nowrap; }

// /* age bars */
// .an-age { display: flex; flex-direction: column; gap: 8px; max-height: 330px; overflow-y: auto; padding-right: 4px; }
// .an-agerow { display: grid; grid-template-columns: 62px minmax(0, 1fr) 36px; align-items: center; gap: 10px; font-size: 13px; }
// .an-agel { color: #6b7280; font-weight: 500; }
// .an-track { height: 14px; border-radius: 99px; background: #f3f4f6; overflow: hidden; display: flex; }
// .an-track span { display: block; height: 100%; }
// .an-agen { font-weight: 700; text-align: right; }

// /* whatsapp */
// .an-msg { width: 100%; resize: none; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; background: #fafafa;
//   font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; color: #111827; outline: none; }
// .an-msg:focus { border-color: #7c3aed; }

// /* key insights */
// .an-ig { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
// .an-ii { border: 1px solid #f3f4f6; border-radius: 14px; padding: 14px; background: #fafafa; display: flex; flex-direction: column; gap: 8px; }
// .an-it { display: flex; align-items: center; gap: 8px; }
// .an-ib { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
// .an-ib.green { background: #dcfce7; color: #16a34a; }
// .an-ib.red { background: #fee2e2; color: #dc2626; }
// .an-ib.blue { background: #dbeafe; color: #2563eb; }
// .an-ib.orange { background: #ffedd5; color: #ea580c; }
// .an-ib.violet { background: #ede9fe; color: #7c3aed; }
// .an-il { font-size: 12.5px; font-weight: 700; }
// .an-il.green { color: #16a34a; } .an-il.red { color: #dc2626; } .an-il.blue { color: #2563eb; }
// .an-il.orange { color: #ea580c; } .an-il.violet { color: #7c3aed; }
// .an-itx { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }
// .an-hl { font-weight: 700; color: #7c3aed; }
// .an-hl.o { color: #ea580c; } .an-hl.g { color: #16a34a; } .an-hl.r { color: #dc2626; }

// /* comparison table */
// .an-tw { overflow-x: auto; }
// .an-table { width: 100%; border-collapse: collapse; min-width: 640px; }
// .an-table th { padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
// .an-table td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
// .an-table tr.latest td { background: #faf5ff; }
// .an-table tfoot td { font-weight: 700; background: #f5f3ff; border-top: 1px solid #ede9fe; }
// .an .m { color: ${MALE}; font-weight: 600; }
// .an .f { color: ${FEMALE}; font-weight: 600; }

// .an .an-d { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
// .an .an-d.up { background: #f0fdf4; color: #16a34a; }
// .an .an-d.down { background: #fef2f2; color: #dc2626; }
// .an .an-d.flat { background: #f3f4f6; color: #6b7280; }

// .an-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
// .an-empty * { text-align: center; }
// .an-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: an-rot .8s linear infinite; margin: 0 auto 12px; }
// @keyframes an-rot { to { transform: rotate(360deg); } }
// @media (prefers-reduced-motion: reduce) { .an-spin { animation: none; } .an-stat { transition: none; } }

// @media (max-width: 900px) {
//   .an-grid2, .an-grid2e { grid-template-columns: minmax(0, 1fr); }
// }
// @media (max-width: 600px) {
//   .an-wrap { padding: 10px 10px 24px; gap: 12px; }
//   .an-title { font-size: 20px; }
//   .an-sv { font-size: 22px; }
//   .an-sico { width: 40px; height: 40px; }
//   .an-ch, .an-cb { padding-left: 12px; padding-right: 12px; }
//   .an-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
// }

// /* Print / Save as PDF: whole report on paper, no header or buttons */
// @media print {
//   html, body, #root { overflow: visible !important; height: auto !important; }
//   .an { height: auto; overflow: visible; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//   .an-scroll { overflow: visible; }
//   .an-top, .an-tools { display: none !important; }
//   .an-card, .an-stat { break-inside: avoid; }
//   .an-grid2, .an-grid2e { grid-template-columns: minmax(0, 1fr); }
//   .an-age { max-height: none; }
// }
// `;

// // ─── Page ───────────────────────────────────────────────────────────────
// export default function Analytics() {
//   const [sessions, setSessions] = useState<Session[]>([]);
//   const [uniqueKids, setUniqueKids] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [weeks, setWeeks] = useState(12);
//   const [reloadKey, setReloadKey] = useState(0);
//   const [msgDate, setMsgDate] = useState("");
//   const [copied, setCopied] = useState(false);
//   const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
//   const [noGender, setNoGender] = useState(0);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       setLoading(true);
//       setError("");
//       try {
//         const kids = await loadKids();
//         if (cancelled) return;
//         const kidOf = new Map(kids.map((k) => [k.id, k]));
//         const dates = recentSessionDates(weeks);
//         const { data, failed } = await loadPresentMany(dates);
//         if (cancelled) return;

//         const out: Session[] = [];
//         const uniq = new Set<string>();
//         let skipped = 0;
//         dates.forEach((date) => {
//           const present = data[date];
//           if (!present) return;
//           const ids = Object.keys(present);
//           if (ids.length === 0) return;
//           const since = weekBefore(date);
//           let male = 0,
//             female = 0,
//             newKids = 0;
//           const ages: Session["ages"] = {};
//           const places: Session["places"] = {};
//           const classes: Session["classes"] = {};
//           ids.forEach((id) => {
//             const k = kidOf.get(id);
//             if (!k) return; // child was deleted
//             if (k.gender !== "Male" && k.gender !== "Female") {
//               skipped += 1;
//               return;
//             }
//             uniq.add(id);
//             if (!ages[k.age]) ages[k.age] = { male: 0, female: 0 };
//             if (k.gender === "Male") {
//               male += 1;
//               ages[k.age].male += 1;
//             } else {
//               female += 1;
//               ages[k.age].female += 1;
//             }
//             places[k.place] = (places[k.place] || 0) + 1;
//             const cls = k.std || "—";
//             classes[cls] = (classes[cls] || 0) + 1;
//             if (k.createdDate && k.createdDate > since && k.createdDate <= date)
//               newKids += 1;
//           });
//           if (male + female === 0) return;
//           out.push({
//             date,
//             male,
//             female,
//             total: male + female,
//             ages,
//             places,
//             classes,
//             newKids,
//           });
//         });
//         out.sort((a, b) => a.date.localeCompare(b.date));
//         setSessions(out);
//         setUniqueKids(uniq.size);
//         setNoGender(skipped);
//         setUpdatedAt(new Date());
//         if (failed.length === dates.length)
//           setError("Could not load attendance from the server.");
//         else if (failed.length > 0)
//           setError(
//             `${failed.length} date(s) could not be loaded. Press Refresh to retry.`,
//           );
//       } catch (err) {
//         if (cancelled) return;
//         setSessions([]);
//         setUniqueKids(0);
//         setError(
//           err instanceof Error ? err.message : "Could not load analytics data.",
//         );
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [weeks, reloadKey]);

//   const a = useMemo(() => {
//     const n = sessions.length;
//     const sum = (k: "male" | "female" | "total") =>
//       sessions.reduce((s, x) => s + x[k], 0);
//     const totalAtt = sum("total");
//     const male = sum("male");
//     const female = sum("female");
//     const latest: Session | null = n ? sessions[n - 1] : null;
//     const prev: Session | null = n > 1 ? sessions[n - 2] : null;
//     const before = sessions.slice(0, Math.max(0, n - 1));
//     const avgBefore = before.length
//       ? Math.round(before.reduce((s, x) => s + x.total, 0) / before.length)
//       : 0;

//     let best: Session | null = null;
//     let low: Session | null = null;
//     for (const s of sessions) {
//       if (best === null || s.total > best.total) best = s;
//       if (low === null || s.total < low.total) low = s;
//     }

//     const rows = sessions.map((s, i) => {
//       const p = i > 0 ? sessions[i - 1] : null;
//       return {
//         ...s,
//         dTotal: p ? s.total - p.total : null,
//         dMale: p ? s.male - p.male : null,
//         dFemale: p ? s.female - p.female : null,
//         pct: p ? pctChange(s.total, p.total) : null,
//       };
//     });
//     const increased = rows.filter((r) => (r.dTotal ?? 0) > 0).length;
//     const decreased = rows.filter((r) => (r.dTotal ?? 0) < 0).length;

//     // 3-session moving average of the total (smooths out one-off dips)
//     const movingAvg = sessions.map((_, i) => {
//       const win = sessions.slice(Math.max(0, i - 2), i + 1);
//       return (
//         Math.round((win.reduce((s, x) => s + x.total, 0) / win.length) * 10) /
//         10
//       );
//     });

//     // boys / girls share (%) per session
//     const malePct = sessions.map((s) =>
//       s.total ? Math.round((s.male / s.total) * 100) : 0,
//     );
//     const femalePct = sessions.map((s) =>
//       s.total ? Math.round((s.female / s.total) * 100) : 0,
//     );

//     // attendance by place (top 5 + Others)
//     const placeTotals: Record<string, number> = {};
//     sessions.forEach((s) =>
//       Object.entries(s.places).forEach(([p, c]) => {
//         placeTotals[p] = (placeTotals[p] || 0) + c;
//       }),
//     );
//     const sortedPlaces = Object.entries(placeTotals).sort(
//       (x, y) => y[1] - x[1],
//     );
//     const placeSlices: Slice[] = sortedPlaces
//       .slice(0, 5)
//       .map(([label, value], i) => ({
//         key: `p-${label}`,
//         label,
//         value,
//         color: PIE_COLORS[i % PIE_COLORS.length],
//       }));
//     const others = sortedPlaces.slice(5).reduce((s, [, c]) => s + c, 0);
//     if (others > 0)
//       placeSlices.push({
//         key: "p-others",
//         label: "Others",
//         value: others,
//         color: "#C4B5FD",
//       });
//     const topPlace: [string, number] | null = sortedPlaces[0] ?? null;

//     // top 4 places, one line each over time
//     const placeTrend: LineSeries[] = sortedPlaces
//       .slice(0, 4)
//       .map(([label], i) => ({
//         key: `pt-${label}`,
//         label,
//         color: PIE_COLORS[i % PIE_COLORS.length],
//         values: sessions.map((s) => s.places[label] || 0),
//         primary: i === 0,
//       }));

//     // busiest month = highest average attendance per session
//     const monthMap = new Map<string, { sum: number; count: number }>();
//     sessions.forEach((s) => {
//       const k = s.date.slice(0, 7);
//       const e = monthMap.get(k) ?? { sum: 0, count: 0 };
//       e.sum += s.total;
//       e.count += 1;
//       monthMap.set(k, e);
//     });
//     let busiest: Busiest | null = null;
//     for (const [key, e] of monthMap) {
//       const avg = Math.round(e.sum / e.count);
//       if (!busiest || avg > busiest.avg) busiest = { key, avg };
//     }

//     return {
//       n,
//       totalAtt,
//       male,
//       female,
//       latest,
//       prev,
//       avgBefore,
//       best,
//       low,
//       rows,
//       increased,
//       decreased,
//       placeSlices,
//       placeTrend,
//       topPlace,
//       busiest,
//       movingAvg,
//       malePct,
//       femalePct,
//       avg: n ? Math.round(totalAtt / n) : 0,
//       avgMale: n ? Math.round(male / n) : 0,
//       avgFemale: n ? Math.round(female / n) : 0,
//     };
//   }, [sessions]);

//   const msgSession = sessions.find((s) => s.date === msgDate) ?? a.latest;
//   const message = msgSession ? buildMessage(msgSession) : "";

//   const ageRows = useMemo(() => {
//     if (!msgSession) return [];
//     return Object.keys(msgSession.ages)
//       .map(Number)
//       .sort(ageSort)
//       .map((age) => {
//         const slot = msgSession.ages[age];
//         return { age, male: slot?.male ?? 0, female: slot?.female ?? 0 };
//       });
//   }, [msgSession]);
//   const maxAge = Math.max(1, ...ageRows.map((r) => r.male + r.female));

//   const classRows = useMemo(() => {
//     if (!msgSession) return [];
//     return Object.entries(msgSession.classes)
//       .sort((x, y) => stdOrder(x[0]) - stdOrder(y[0]))
//       .map(([std, count]) => ({ label: stdLabel(std), count }));
//   }, [msgSession]);
//   const maxClass = Math.max(1, ...classRows.map((r) => r.count));

//   const copyMessage = async () => {
//     try {
//       await navigator.clipboard.writeText(message);
//     } catch {
//       const ta = document.createElement("textarea");
//       ta.value = message;
//       ta.style.position = "fixed";
//       ta.style.opacity = "0";
//       document.body.appendChild(ta);
//       ta.select();
//       document.execCommand("copy");
//       document.body.removeChild(ta);
//     }
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const exportCsv = () => {
//     const head = [
//       "Date",
//       "Male",
//       "Female",
//       "Total",
//       "Male change",
//       "Female change",
//       "Total change",
//     ];
//     const lines = a.rows.map((r) =>
//       [
//         r.date,
//         r.male,
//         r.female,
//         r.total,
//         r.dMale ?? "",
//         r.dFemale ?? "",
//         r.dTotal ?? "",
//       ].join(","),
//     );
//     const blob = new Blob([[head.join(","), ...lines].join("\n")], {
//       type: "text/csv;charset=utf-8;",
//     });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `attendance-${isoDate(new Date())}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   // ─── Line chart data ────────────────────────────────────────────────
//   const dateLabels = a.rows.map((r) => shortDate(r.date));
//   const dateTitles = a.rows.map((r) => longDate(r.date));

//   const overTimeSeries: LineSeries[] = [
//     {
//       key: "total",
//       label: "Total",
//       color: PURPLE,
//       values: a.rows.map((r) => r.total),
//       primary: true,
//     },
//     {
//       key: "male",
//       label: "Male",
//       color: MALE,
//       values: a.rows.map((r) => r.male),
//     },
//     {
//       key: "female",
//       label: "Female",
//       color: FEMALE,
//       values: a.rows.map((r) => r.female),
//     },
//   ];
//   const movingSeries: LineSeries[] = [
//     {
//       key: "total",
//       label: "Total",
//       color: PURPLE,
//       values: a.rows.map((r) => r.total),
//       primary: true,
//     },
//     {
//       key: "ma",
//       label: "3-session average",
//       color: AMBER,
//       values: a.movingAvg,
//       dashed: true,
//     },
//   ];
//   const genderShareSeries: LineSeries[] = [
//     {
//       key: "mp",
//       label: "Male %",
//       color: MALE,
//       values: a.malePct,
//       primary: true,
//     },
//     {
//       key: "fp",
//       label: "Female %",
//       color: FEMALE,
//       values: a.femalePct,
//       primary: true,
//     },
//   ];
//   const ageSeries: LineSeries[] = [
//     {
//       key: "am",
//       label: "Male",
//       color: MALE,
//       values: ageRows.map((r) => r.male),
//     },
//     {
//       key: "af",
//       label: "Female",
//       color: FEMALE,
//       values: ageRows.map((r) => r.female),
//     },
//     {
//       key: "at",
//       label: "Total",
//       color: PURPLE,
//       values: ageRows.map((r) => r.male + r.female),
//       primary: true,
//     },
//   ];
//   const newReturningSeries: LineSeries[] = [
//     {
//       key: "ret",
//       label: "Returning",
//       color: GREEN,
//       values: a.rows.map((r) => r.total - r.newKids),
//       primary: true,
//     },
//     {
//       key: "new",
//       label: "New (joined that week)",
//       color: AMBER,
//       values: a.rows.map((r) => r.newKids),
//     },
//   ];
//   const ageLabels = ageRows.map((r) => (r.age === 0 ? "Not set" : `${r.age}y`));

//   // ─── Key insights ───────────────────────────────────────────────────
//   const growthDiff = a.latest && a.prev ? a.latest.total - a.prev.total : 0;
//   const growthUp = growthDiff >= 0;
//   const busiestLabel = a.busiest
//     ? `${MONTH_FULL[Number(a.busiest.key.slice(5, 7)) - 1]} ${a.busiest.key.slice(0, 4)}`
//     : "";
//   const bestS: Session | null = a.best;
//   const lowS: Session | null = a.low;

//   const genderSlices: Slice[] = [
//     { key: "g-m", label: "Male", value: a.male, color: MALE },
//     { key: "g-f", label: "Female", value: a.female, color: FEMALE },
//   ];

//   const stats: {
//     key: string;
//     label: string;
//     value: number;
//     note: string;
//     variant: string;
//     icon: ReactNode;
//     color?: string;
//   }[] = [
//     {
//       key: "s1",
//       label: "Total Dates (Sessions)",
//       value: a.n,
//       variant: "violet",
//       icon: <IcCalendar size={24} />,
//       note: `Days with attendance · last ${weeks} weeks`,
//       color: PURPLE,
//     },
//     {
//       key: "s2",
//       label: "Total Attendance",
//       value: a.totalAtt,
//       variant: "orange",
//       icon: <IcUsers size={24} />,
//       note: `Avg ${a.avg} per session`,
//     },
//     {
//       key: "s3",
//       label: "Unique Children",
//       value: uniqueKids,
//       variant: "green",
//       icon: <IcUser size={24} />,
//       note: "Different children who attended",
//     },
//     {
//       key: "s4",
//       label: "Male Count",
//       value: a.male,
//       variant: "blue",
//       icon: <IcUser size={24} />,
//       note: `${a.totalAtt ? Math.round((a.male / a.totalAtt) * 100) : 0}% · avg ${a.avgMale} per session`,
//       color: MALE,
//     },
//     {
//       key: "s5",
//       label: "Female Count",
//       value: a.female,
//       variant: "pink",
//       icon: <IcUser size={24} />,
//       note: `${a.totalAtt ? Math.round((a.female / a.totalAtt) * 100) : 0}% · avg ${a.avgFemale} per session`,
//       color: FEMALE,
//     },
//   ];

//   const cmpCard = (
//     title: string,
//     now: number,
//     before: number | null,
//     color: string,
//   ) => (
//     <div className="an-ii" style={{ background: "#fafafa" }}>
//       <div className="an-il" style={{ color: "#6b7280", fontWeight: 600 }}>
//         {title}
//       </div>
//       <div
//         style={{
//           display: "flex",
//           alignItems: "baseline",
//           gap: 10,
//           flexWrap: "wrap",
//         }}
//       >
//         <span style={{ fontSize: 26, fontWeight: 800, color }}>{now}</span>
//         {before !== null && (
//           <Delta value={now - before} pct={pctChange(now, before)} />
//         )}
//       </div>
//       <small style={{ color: "#9ca3af", fontSize: 12 }}>
//         {before !== null
//           ? `Previous session: ${before}`
//           : "No previous session"}
//       </small>
//     </div>
//   );

//   // Small helper so every line-chart card has the same header
//   const lineCard = (
//     icon: ReactNode,
//     title: string,
//     subtitle: string,
//     legend: LineSeries[],
//     chart: ReactNode,
//   ) => (
//     <div className="an-card">
//       <div className="an-ch">
//         <div className="an-cht">
//           <div className="an-chi">{icon}</div>
//           <div>
//             <p className="an-ct">{title}</p>
//             <p className="an-cs">{subtitle}</p>
//           </div>
//         </div>
//         <SeriesLegend series={legend} />
//       </div>
//       <div className="an-cb">{chart}</div>
//     </div>
//   );

//   return (
//     <div className="an">
//       <style>{css}</style>
//       <div className="an-top">
//         <Header />
//       </div>

//       <div className="an-scroll">
//         <div className="an-wrap">
//           <div className="an-head">
//             <div>
//               <h1 className="an-title">
//                 <span className="p">Attendance</span> Analytics
//               </h1>
//               <p className="an-sub">
//                 {a.n > 0
//                   ? `${longDate(a.rows[0].date)} – ${longDate(a.rows[a.n - 1].date)} · overview and week-to-week comparison`
//                   : "Attendance trends and week-to-week comparison"}
//               </p>
//               {updatedAt && !loading && (
//                 <p className="an-stamp">
//                   Updated {pad(updatedAt.getHours())}:
//                   {pad(updatedAt.getMinutes())}
//                 </p>
//               )}
//             </div>
//             <div className="an-tools">
//               <select
//                 value={weeks}
//                 onChange={(e) => setWeeks(Number(e.target.value))}
//                 aria-label="Range"
//               >
//                 <option value={4}>Last 4 weeks</option>
//                 <option value={8}>Last 8 weeks</option>
//                 <option value={12}>Last 12 weeks</option>
//                 <option value={26}>Last 26 weeks</option>
//                 <option value={52}>Last 52 weeks</option>
//               </select>
//               <button
//                 type="button"
//                 className="an-btn"
//                 disabled={loading || a.n === 0}
//                 onClick={exportCsv}
//               >
//                 Export CSV
//               </button>
//               <button
//                 type="button"
//                 className="an-btn"
//                 disabled={loading || a.n === 0}
//                 onClick={() => window.print()}
//               >
//                 Print / PDF
//               </button>
//               <button
//                 type="button"
//                 className="an-btn"
//                 disabled={loading}
//                 onClick={() => {
//                   clearAttendanceCaches();
//                   setReloadKey((k) => k + 1);
//                 }}
//               >
//                 {loading ? "Loading..." : "Refresh"}
//               </button>
//             </div>
//           </div>

//           {error && (
//             <div className="an-error" role="alert">
//               {error}
//             </div>
//           )}
//           {!loading && noGender > 0 && (
//             <div className="an-error" role="status">
//               {noGender} attendance entr{noGender === 1 ? "y has" : "ies have"}{" "}
//               no gender set, so
//               {noGender === 1 ? " it is" : " they are"} left out of these
//               counts. Open the child in Add Child and set the gender.
//             </div>
//           )}

//           {loading ? (
//             <div className="an-card">
//               <div className="an-empty">
//                 <div className="an-spin" />
//                 Loading analytics...
//               </div>
//             </div>
//           ) : a.n === 0 ? (
//             <div className="an-card">
//               <div className="an-empty">
//                 No attendance found in this range. Try a longer range.
//               </div>
//             </div>
//           ) : (
//             <>
//               {/* Stat cards */}
//               <div className="an-stats">
//                 {stats.map((s) => (
//                   <div key={s.key} className="an-stat">
//                     <div className="an-stat-top">
//                       <div className={`an-sico ${s.variant}`}>{s.icon}</div>
//                       <div style={{ minWidth: 0 }}>
//                         <p className="an-sl">{s.label}</p>
//                         <p
//                           className="an-sv"
//                           style={s.color ? { color: s.color } : undefined}
//                         >
//                           {s.value}
//                         </p>
//                       </div>
//                     </div>
//                     <p className="an-sc">{s.note}</p>
//                   </div>
//                 ))}
//               </div>

//               {/* Line chart + place pie */}
//               <div className="an-grid2">
//                 {lineCard(
//                   <IcTrendUp size={17} />,
//                   "Attendance Over Time",
//                   "Total, male and female per session (hover for details)",
//                   overTimeSeries,
//                   <LineChart
//                     labels={dateLabels}
//                     titles={dateTitles}
//                     series={overTimeSeries}
//                     ariaLabel="Attendance trend"
//                   />,
//                 )}

//                 <div className="an-card">
//                   <div className="an-ch">
//                     <div className="an-cht">
//                       <div className="an-chi">
//                         <IcPie size={17} />
//                       </div>
//                       <div>
//                         <p className="an-ct">Attendance by Place</p>
//                         <p className="an-cs">Top 5 places by attendance</p>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="an-cb">
//                     {a.placeSlices.length === 0 ? (
//                       <div className="an-empty">No place data yet.</div>
//                     ) : (
//                       <div className="an-donutwrap">
//                         <DonutMulti
//                           slices={a.placeSlices}
//                           centerValue={a.totalAtt}
//                           centerLabel="attendances"
//                         />
//                         <Legend slices={a.placeSlices} />
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Weekly bars + gender donut */}
//               <div className="an-grid2">
//                 <div className="an-card">
//                   <div className="an-ch">
//                     <div className="an-cht">
//                       <div className="an-chi">
//                         <IcBars size={17} />
//                       </div>
//                       <div>
//                         <p className="an-ct">Weekly Attendance</p>
//                         <p className="an-cs">
//                           Boys and girls stacked per session
//                         </p>
//                       </div>
//                     </div>
//                     <div className="an-legend">
//                       <span>
//                         <i style={{ background: MALE }} />
//                         Male
//                       </span>
//                       <span>
//                         <i style={{ background: FEMALE }} />
//                         Female
//                       </span>
//                     </div>
//                   </div>
//                   <div className="an-cb">
//                     <StackedBars data={a.rows} />
//                   </div>
//                 </div>

//                 <div className="an-card">
//                   <div className="an-ch">
//                     <div className="an-cht">
//                       <div className="an-chi">
//                         <IcUsers size={17} />
//                       </div>
//                       <div>
//                         <p className="an-ct">Male vs Female</p>
//                         <p className="an-cs">Share of total attendance</p>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="an-cb">
//                     <div className="an-donutwrap">
//                       <DonutMulti
//                         slices={genderSlices}
//                         centerValue={a.totalAtt}
//                         centerLabel="attendances"
//                       />
//                       <Legend slices={genderSlices} />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* moving average + places over time */}
//               <div className="an-grid2e">
//                 {lineCard(
//                   <IcActivity size={17} />,
//                   "Trend vs 3-Session Average",
//                   "The dashed line smooths out one-off dips and spikes",
//                   movingSeries,
//                   <LineChart
//                     labels={dateLabels}
//                     titles={dateTitles}
//                     series={movingSeries}
//                     ariaLabel="Attendance with 3-session moving average"
//                   />,
//                 )}

//                 {a.placeTrend.length > 0 &&
//                   lineCard(
//                     <IcPin size={17} />,
//                     "Top Places Over Time",
//                     "Attendance per session for the top 4 places",
//                     a.placeTrend,
//                     <LineChart
//                       labels={dateLabels}
//                       titles={dateTitles}
//                       series={a.placeTrend}
//                       ariaLabel="Attendance by place over time"
//                     />,
//                   )}
//               </div>

//               {/* Latest vs previous */}
//               {a.latest && (
//                 <div className="an-card">
//                   <div className="an-ch">
//                     <div className="an-cht">
//                       <div className="an-chi">
//                         <IcActivity size={17} />
//                       </div>
//                       <div>
//                         <p className="an-ct">Latest Session vs Previous</p>
//                         <p className="an-cs">
//                           {longDate(a.latest.date)}
//                           {a.prev
//                             ? ` compared with ${longDate(a.prev.date)}`
//                             : ""}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="an-cb">
//                     <div className="an-ig">
//                       {cmpCard(
//                         "Total",
//                         a.latest.total,
//                         a.prev ? a.prev.total : null,
//                         PURPLE,
//                       )}
//                       {cmpCard(
//                         "Male",
//                         a.latest.male,
//                         a.prev ? a.prev.male : null,
//                         MALE,
//                       )}
//                       {cmpCard(
//                         "Female",
//                         a.latest.female,
//                         a.prev ? a.prev.female : null,
//                         FEMALE,
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Age chart + WhatsApp box (both use the selected session date) */}
//               {msgSession && (
//                 <div className="an-grid2e">
//                   <div className="an-card">
//                     <div className="an-ch">
//                       <div className="an-cht">
//                         <div className="an-chi">
//                           <IcBars size={17} />
//                         </div>
//                         <div>
//                           <p className="an-ct">Age Wise Count</p>
//                           <p className="an-cs">{longDate(msgSession.date)}</p>
//                         </div>
//                       </div>
//                       <div className="an-legend">
//                         <span>
//                           <i style={{ background: MALE }} />
//                           Male
//                         </span>
//                         <span>
//                           <i style={{ background: FEMALE }} />
//                           Female
//                         </span>
//                       </div>
//                     </div>
//                     <div className="an-cb">
//                       <div className="an-age">
//                         {ageRows.map((r) => {
//                           const t = r.male + r.female;
//                           return (
//                             <div
//                               key={r.age}
//                               className="an-agerow"
//                               title={`Male ${r.male} · Female ${r.female}`}
//                             >
//                               <span className="an-agel">
//                                 {r.age === 0 ? "Not set" : `${r.age} yrs`}
//                               </span>
//                               <div className="an-track">
//                                 <span
//                                   style={{
//                                     width: `${(r.male / maxAge) * 100}%`,
//                                     background: MALE,
//                                   }}
//                                 />
//                                 <span
//                                   style={{
//                                     width: `${(r.female / maxAge) * 100}%`,
//                                     background: FEMALE,
//                                   }}
//                                 />
//                               </div>
//                               <span className="an-agen">{t}</span>
//                             </div>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="an-card">
//                     <div className="an-ch">
//                       <div className="an-cht">
//                         <div className="an-chi">
//                           <IcChat size={17} />
//                         </div>
//                         <div>
//                           <p className="an-ct">Share Count on WhatsApp</p>
//                           <p className="an-cs">Copy and send to your group</p>
//                         </div>
//                       </div>
//                       <div className="an-tools">
//                         <select
//                           value={msgSession.date}
//                           onChange={(e) => setMsgDate(e.target.value)}
//                           aria-label="Session date"
//                         >
//                           {[...sessions].reverse().map((s) => (
//                             <option key={s.date} value={s.date}>
//                               {longDate(s.date)}
//                             </option>
//                           ))}
//                         </select>
//                         <button
//                           type="button"
//                           className="an-btn an-copy"
//                           onClick={copyMessage}
//                         >
//                           {copied ? "Copied ✓" : "Copy"}
//                         </button>
//                         <a
//                           className="an-btn an-wa"
//                           href={`https://wa.me/?text=${encodeURIComponent(message)}`}
//                           target="_blank"
//                           rel="noreferrer"
//                         >
//                           WhatsApp
//                         </a>
//                       </div>
//                     </div>
//                     <div className="an-cb">
//                       <textarea
//                         className="an-msg"
//                         readOnly
//                         value={message}
//                         rows={Math.min(22, message.split("\n").length + 1)}
//                         onFocus={(e) => e.target.select()}
//                         aria-label="WhatsApp message"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* age line chart (selected session) + gender share over time */}
//               <div className="an-grid2e">
//                 {msgSession &&
//                   lineCard(
//                     <IcTrendUp size={17} />,
//                     "Age Distribution",
//                     `${longDate(msgSession.date)} · children per age (change the date in the WhatsApp card)`,
//                     ageSeries,
//                     <LineChart
//                       labels={ageLabels}
//                       titles={ageRows.map((r) =>
//                         r.age === 0 ? "Age not set" : `${r.age} years`,
//                       )}
//                       series={ageSeries}
//                       ariaLabel="Age distribution for the selected session"
//                     />,
//                   )}

//                 {lineCard(
//                   <IcUsers size={17} />,
//                   "Boys vs Girls Share",
//                   "Percentage of each session's attendance",
//                   genderShareSeries,
//                   <LineChart
//                     labels={dateLabels}
//                     titles={dateTitles}
//                     series={genderShareSeries}
//                     ariaLabel="Male and female share over time"
//                     suffix="%"
//                     maxOverride={100}
//                   />,
//                 )}
//               </div>

//               {/* Class-wise count + new vs returning */}
//               <div className="an-grid2e">
//                 {msgSession && (
//                   <div className="an-card">
//                     <div className="an-ch">
//                       <div className="an-cht">
//                         <div className="an-chi">
//                           <IcBars size={17} />
//                         </div>
//                         <div>
//                           <p className="an-ct">Class Wise Count</p>
//                           <p className="an-cs">
//                             {longDate(msgSession.date)} · children per class
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                     <div className="an-cb">
//                       <div className="an-age">
//                         {classRows.map((r) => (
//                           <div key={r.label} className="an-agerow">
//                             <span className="an-agel">{r.label}</span>
//                             <div className="an-track">
//                               <span
//                                 style={{
//                                   width: `${(r.count / maxClass) * 100}%`,
//                                   background: PURPLE,
//                                 }}
//                               />
//                             </div>
//                             <span className="an-agen">{r.count}</span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {lineCard(
//                   <IcUsers size={17} />,
//                   "New vs Returning",
//                   "Children registered that week vs those already registered",
//                   newReturningSeries,
//                   <LineChart
//                     labels={dateLabels}
//                     titles={dateTitles}
//                     series={newReturningSeries}
//                     ariaLabel="New and returning children per session"
//                   />,
//                 )}
//               </div>

//               {/* Key insights */}
//               <div className="an-card">
//                 <div className="an-ch">
//                   <div className="an-cht">
//                     <div className="an-chi">
//                       <IcBulb size={17} />
//                     </div>
//                     <div>
//                       <p className="an-ct">Key Insights</p>
//                       <p className="an-cs">
//                         Important insights about your attendance data
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="an-cb">
//                   <div className="an-ig">
//                     {a.latest && a.prev && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div
//                             className={`an-ib ${growthDiff === 0 ? "violet" : growthUp ? "green" : "red"}`}
//                           >
//                             {growthUp ? (
//                               <IcTrendUp size={16} />
//                             ) : (
//                               <IcTrendDown size={16} />
//                             )}
//                           </div>
//                           <span
//                             className={`an-il ${growthDiff === 0 ? "violet" : growthUp ? "green" : "red"}`}
//                           >
//                             Attendance Growth
//                           </span>
//                         </div>
//                         <p className="an-itx">
//                           {growthDiff === 0 ? (
//                             <>
//                               Same as the previous session (
//                               {longDate(a.prev.date)}).
//                             </>
//                           ) : (
//                             <>
//                               <span className={`an-hl ${growthUp ? "g" : "r"}`}>
//                                 {Math.abs(growthDiff)}{" "}
//                                 {growthUp ? "more" : "fewer"} children
//                               </span>{" "}
//                               than the previous session ({longDate(a.prev.date)}
//                               ) – boys{" "}
//                               {a.latest.male - a.prev.male >= 0 ? "+" : ""}
//                               {a.latest.male - a.prev.male}, girls{" "}
//                               {a.latest.female - a.prev.female >= 0 ? "+" : ""}
//                               {a.latest.female - a.prev.female}.
//                             </>
//                           )}
//                         </p>
//                       </div>
//                     )}

//                     {a.topPlace && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div className="an-ib blue">
//                             <IcPin size={16} />
//                           </div>
//                           <span className="an-il blue">Top Place</span>
//                         </div>
//                         <p className="an-itx">
//                           <span className="an-hl">{a.topPlace[0]}</span> has the
//                           highest attendance ({a.topPlace[1]} attendances).
//                         </p>
//                       </div>
//                     )}

//                     {bestS && lowS && a.n > 1 && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div className="an-ib orange">
//                             <IcStar size={16} />
//                           </div>
//                           <span className="an-il orange">
//                             Best &amp; Lowest Day
//                           </span>
//                         </div>
//                         <p className="an-itx">
//                           Best: <span className="an-hl g">{bestS.total}</span>{" "}
//                           on {longDate(bestS.date)}. Lowest:{" "}
//                           <span className="an-hl r">{lowS.total}</span> on{" "}
//                           {longDate(lowS.date)}.
//                         </p>
//                       </div>
//                     )}

//                     {a.busiest && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div className="an-ib violet">
//                             <IcCalendar size={16} />
//                           </div>
//                           <span className="an-il violet">Busiest Month</span>
//                         </div>
//                         <p className="an-itx">
//                           <span className="an-hl o">{busiestLabel}</span> had
//                           the highest average attendance ({a.busiest.avg} per
//                           session).
//                         </p>
//                       </div>
//                     )}

//                     {a.latest && a.n > 1 && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div className="an-ib green">
//                             <IcActivity size={16} />
//                           </div>
//                           <span className="an-il green">Vs Average</span>
//                         </div>
//                         <p className="an-itx">
//                           {a.latest.total - a.avgBefore === 0 ? (
//                             <>
//                               The latest session is exactly on average (
//                               {a.avgBefore}).
//                             </>
//                           ) : (
//                             <>
//                               The latest session is{" "}
//                               <span
//                                 className={`an-hl ${a.latest.total > a.avgBefore ? "g" : "r"}`}
//                               >
//                                 {Math.abs(a.latest.total - a.avgBefore)}{" "}
//                                 {a.latest.total > a.avgBefore
//                                   ? "above"
//                                   : "below"}
//                               </span>{" "}
//                               the average of the earlier {a.n - 1} sessions (
//                               {a.avgBefore}).
//                             </>
//                           )}
//                         </p>
//                       </div>
//                     )}

//                     {a.n > 1 && (
//                       <div className="an-ii">
//                         <div className="an-it">
//                           <div className="an-ib violet">
//                             <IcBars size={16} />
//                           </div>
//                           <span className="an-il violet">Week-to-Week</span>
//                         </div>
//                         <p className="an-itx">
//                           Out of {a.n - 1} changes, attendance went{" "}
//                           <span className="an-hl g">up {a.increased}</span> time
//                           {a.increased === 1 ? "" : "s"} and{" "}
//                           <span className="an-hl r">down {a.decreased}</span>{" "}
//                           time{a.decreased === 1 ? "" : "s"}.
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Week-by-week comparison */}
//               <div className="an-card">
//                 <div className="an-ch">
//                   <div className="an-cht">
//                     <div className="an-chi">
//                       <IcActivity size={17} />
//                     </div>
//                     <div>
//                       <p className="an-ct">Week-by-Week Comparison</p>
//                       <p className="an-cs">
//                         Every session with its change from the week before
//                       </p>
//                     </div>
//                   </div>
//                   <div className="an-legend">
//                     <span style={{ color: GREEN }}>
//                       ▲ {a.increased} increased
//                     </span>
//                     <span style={{ color: RED }}>
//                       ▼ {a.decreased} decreased
//                     </span>
//                   </div>
//                 </div>
//                 <div className="an-tw">
//                   <table className="an-table">
//                     <thead>
//                       <tr>
//                         <th>Date</th>
//                         <th>Male</th>
//                         <th>Female</th>
//                         <th>Total</th>
//                         <th>Male +/−</th>
//                         <th>Female +/−</th>
//                         <th>Total +/−</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {[...a.rows].reverse().map((r, idx) => (
//                         <tr key={r.date} className={idx === 0 ? "latest" : ""}>
//                           <td>
//                             <b>{longDate(r.date)}</b>
//                           </td>
//                           <td className="m">{r.male}</td>
//                           <td className="f">{r.female}</td>
//                           <td>
//                             <b>{r.total}</b>
//                           </td>
//                           <td>
//                             {r.dMale === null ? (
//                               <span className="an-d flat">—</span>
//                             ) : (
//                               <Delta value={r.dMale} />
//                             )}
//                           </td>
//                           <td>
//                             {r.dFemale === null ? (
//                               <span className="an-d flat">—</span>
//                             ) : (
//                               <Delta value={r.dFemale} />
//                             )}
//                           </td>
//                           <td>
//                             {r.dTotal === null ? (
//                               <span className="an-d flat">—</span>
//                             ) : (
//                               <Delta value={r.dTotal} pct={r.pct ?? 0} />
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                     <tfoot>
//                       <tr>
//                         <td>Total ({a.n} dates)</td>
//                         <td>{a.male}</td>
//                         <td>{a.female}</td>
//                         <td>{a.totalAtt}</td>
//                         <td colSpan={3} />
//                       </tr>
//                     </tfoot>
//                   </table>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import Header from "../components/Header";
import {
  loadKids,
  loadPresentMany,
  clearAttendanceCaches,
  recentSessionDates,
  weekBefore,
  stdLabel,
  stdOrder,
} from "./AttendanceApi";

// One attendance session (a day on which children checked in)
interface Session {
  date: string; // yyyy-mm-dd
  male: number;
  female: number;
  total: number;
  checkedOut: number; // children who also have a check-out time
  ages: Record<number, { male: number; female: number }>; // age -> counts (0 = age not set)
  places: Record<string, number>; // place / district -> attendance count
  classes: Record<string, number>; // raw std ("3", "LKG") -> attendance count
  newKids: number; // children registered in the 7 days up to this session
}

interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Busiest {
  key: string;
  avg: number;
}

interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  primary?: boolean; // thicker line + bigger dots
  dashed?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = [
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
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]}`;
};
const longDate = (iso: string) => `${shortDate(iso)} ${iso.slice(0, 4)}`;
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const ageSort = (x: number, y: number) => (x === 0 ? 1 : y === 0 ? -1 : x - y);

// WhatsApp-ready text for one session (WhatsApp shows *text* in bold)
const buildMessage = (s: Session) => {
  const ageKeys = Object.keys(s.ages).map(Number).sort(ageSort);
  const lines = [
    `*Attendance Report*`,
    `Date: ${longDate(s.date)}`,
    ``,
    `Male: ${s.male}`,
    `Female: ${s.female}`,
    `*Total: ${s.total}*`,
    `Checked out: ${s.checkedOut}`,
    ``,
    `*Age Wise Count*`,
    ...ageKeys
      .map((a) => {
        const c = s.ages[a];
        if (!c) return "";
        return `${a === 0 ? "Age not set" : `${a} yrs`} : ${c.male + c.female} (M ${c.male}, F ${c.female})`;
      })
      .filter(Boolean),
  ];
  return lines.join("\n");
};

const pctChange = (now: number, before: number) =>
  before === 0
    ? now === 0
      ? 0
      : 100
    : Math.round(((now - before) / before) * 100);

const MALE = "#2563eb";
const FEMALE = "#db2777";
const PURPLE = "#7c3aed";
const AMBER = "#f59e0b";
const GREEN = "#16a34a";
const RED = "#dc2626";
const PIE_COLORS = ["#7C3AED", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

// ─── Icons ──────────────────────────────────────────────────────────────
const Ico = ({
  size = 20,
  children,
}: {
  size?: number;
  children: ReactNode;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);
const IcCalendar = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Ico>
);
const IcUsers = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Ico>
);
const IcUser = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Ico>
);
const IcLogout = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Ico>
);
const IcTrendUp = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Ico>
);
const IcTrendDown = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </Ico>
);
const IcPin = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Ico>
);
const IcStar = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Ico>
);
const IcBulb = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </Ico>
);
const IcPie = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </Ico>
);
const IcBars = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Ico>
);
const IcChat = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Ico>
);
const IcActivity = ({ size }: { size?: number }) => (
  <Ico size={size}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Ico>
);

// ─── Small components ───────────────────────────────────────────────────
const Delta = ({ value, pct }: { value: number; pct?: number }) => {
  if (value === 0) return <span className="an-d flat">● No change</span>;
  const up = value > 0;
  return (
    <span className={`an-d ${up ? "up" : "down"}`}>
      {up ? "▲ +" : "▼ "}
      {value}
      {pct !== undefined ? ` (${up ? "+" : ""}${pct}%)` : ""}
    </span>
  );
};

// Stacked bar chart – boys + girls per session (hover a bar for details)
const StackedBars = ({ data }: { data: Session[] }) => {
  const W = 760,
    H = 260,
    L = 36,
    R = 10,
    T = 14,
    B = 34;
  const max = Math.max(1, ...data.map((d) => d.total));
  const niceMax = Math.ceil(max / 5) * 5 || 5;
  const innerW = W - L - R;
  const step = innerW / Math.max(1, data.length);
  const bw = Math.min(46, step * 0.62);
  const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const every = Math.ceil(data.length / 12);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="an-svg"
      role="img"
      aria-label="Weekly attendance, boys and girls"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f3f4f6" />
          <text
            x={L - 6}
            y={y(t) + 4}
            fontSize="10"
            fill="#9ca3af"
            textAnchor="end"
          >
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = L + i * step + (step - bw) / 2;
        return (
          <g key={d.date} className="an-hit">
            <rect
              x={L + i * step}
              y={T}
              width={step}
              height={H - T - B}
              fill="transparent"
              className="an-hitbg"
            />
            <rect
              x={x}
              y={y(d.male)}
              width={bw}
              height={y(0) - y(d.male)}
              fill={MALE}
              rx="2"
            />
            <rect
              x={x}
              y={y(d.total)}
              width={bw}
              height={y(d.male) - y(d.total)}
              fill={FEMALE}
              rx="2"
            />
            <text
              x={x + bw / 2}
              y={y(d.total) - 4}
              fontSize="10"
              fontWeight="700"
              fill="#374151"
              textAnchor="middle"
            >
              {d.total}
            </text>
            {i % every === 0 && (
              <text
                x={x + bw / 2}
                y={H - 12}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {shortDate(d.date)}
              </text>
            )}
            <title>{`${longDate(d.date)}\nMale: ${d.male}\nFemale: ${d.female}\nTotal: ${d.total}`}</title>
          </g>
        );
      })}
    </svg>
  );
};

// Reusable multi-series line chart (hover a column for every series' value)
const LineChart = ({
  labels,
  titles,
  series,
  ariaLabel,
  height = 240,
  suffix = "",
  maxOverride,
}: {
  labels: string[];
  titles?: string[]; // full tooltip heading per point (defaults to the label)
  series: LineSeries[];
  ariaLabel: string;
  height?: number;
  suffix?: string;
  maxOverride?: number;
}) => {
  const W = 760,
    H = height,
    L = 36,
    R = 16,
    T = 14,
    B = 34;
  const n = labels.length;
  const max = maxOverride ?? Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = maxOverride ?? (Math.ceil(max / 5) * 5 || 5);
  const step = n > 1 ? (W - L - R) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? L + i * step : (W + L - R) / 2);
  const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const every = Math.ceil(n / 12);
  const colW = n > 1 ? step : W - L - R;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="an-svg"
      role="img"
      aria-label={ariaLabel}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={L}
            x2={W - R}
            y1={y(t)}
            y2={y(t)}
            stroke="#f3f4f6"
            strokeDasharray="3 3"
          />
          <text
            x={L - 6}
            y={y(t) + 4}
            fontSize="10"
            fill="#9ca3af"
            textAnchor="end"
          >
            {t}
            {suffix}
          </text>
        </g>
      ))}
      {series.map((s) => (
        <g key={s.key}>
          <path
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.primary ? 2.5 : 1.8}
            strokeDasharray={s.dashed ? "6 4" : undefined}
            strokeLinejoin="round"
          />
          {!s.dashed &&
            s.values.map((v, i) => (
              <circle
                key={`${s.key}-${i}`}
                cx={x(i)}
                cy={y(v)}
                r={s.primary ? 4 : 2.8}
                fill={s.color}
              />
            ))}
        </g>
      ))}
      {labels.map((lb, i) => (
        <g key={`h-${i}`} className="an-hit">
          <rect
            x={x(i) - colW / 2}
            y={T}
            width={colW}
            height={H - T - B}
            fill="transparent"
            className="an-hitbg"
          />
          <title>
            {[
              titles?.[i] ?? lb,
              ...series.map(
                (s) => `${s.label}: ${fmtNum(s.values[i])}${suffix}`,
              ),
            ].join("\n")}
          </title>
        </g>
      ))}
      {labels.map((lb, i) =>
        i % every === 0 ? (
          <text
            key={`l-${i}`}
            x={x(i)}
            y={H - 12}
            fontSize="10"
            fill="#6b7280"
            textAnchor="middle"
          >
            {lb}
          </text>
        ) : null,
      )}
    </svg>
  );
};

const SeriesLegend = ({ series }: { series: LineSeries[] }) => (
  <div className="an-legend">
    {series.map((s) => (
      <span key={s.key}>
        <i style={{ background: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);

// Donut with any number of slices (used for gender split and place split)
const DonutMulti = ({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: Slice[];
  centerValue: number;
  centerLabel: string;
}) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg
      viewBox="0 0 140 140"
      className="an-donut"
      role="img"
      aria-label={centerLabel}
    >
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="18"
      />
      {total > 0 &&
        slices.map((s) => {
          const len = (s.value / total) * c;
          const dash = Math.max(0, len - 1.5);
          const el = (
            <circle
              key={s.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 70 70)"
            >
              <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      <text
        x="70"
        y="68"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="#111827"
      >
        {centerValue}
      </text>
      <text x="70" y="85" textAnchor="middle" fontSize="10" fill="#6b7280">
        {centerLabel}
      </text>
    </svg>
  );
};

const Legend = ({ slices }: { slices: Slice[] }) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="an-pie-legend">
      {slices.map((s) => (
        <div key={s.key} className="an-legend-item">
          <span className="an-dot" style={{ background: s.color }} />
          <span className="an-legend-name">{s.label}</span>
          <span className="an-legend-val">
            {s.value} ({total ? Math.round((s.value / total) * 100) : 0}%)
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────
const css = `
.an { height: 100vh; height: 100dvh; display: flex; flex-direction: column; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
.an, .an * { text-align: left; box-sizing: border-box; }
.an button { width: auto; transform: none !important; font-family: inherit; }
.an-top { flex: none; position: relative; z-index: 100; }
.an-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.an-wrap { width: 100%; max-width: 1280px; margin: 0 auto; padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 16px; }

.an-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.an-title { font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; }
.an-title .p { color: #7c3aed; }
.an-sub { font-size: 13px; color: #6b7280; margin: 3px 0 0; }
.an-stamp { font-size: 12px; color: #9ca3af; margin: 2px 0 0; }
.an-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.an select { height: 34px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; color: #374151; font-family: inherit; }
.an select:focus-visible, .an .an-btn:focus-visible, .an-msg:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.an .an-btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 600; cursor: pointer; }
.an .an-btn:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
.an .an-btn:disabled { opacity: .55; cursor: not-allowed; }
.an .an-copy { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.an .an-copy:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; color: #fff; }
.an a.an-wa { display: inline-flex; align-items: center; text-decoration: none; background: #16a34a; border-color: #16a34a; color: #fff; }
.an a.an-wa:hover { background: #15803d; border-color: #15803d; color: #fff; }

.an-error { padding: 8px 12px; border-radius: 8px; font-size: 13px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* stat cards */
.an-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.an-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; transition: box-shadow .15s, transform .15s; }
.an-stat:hover { box-shadow: 0 6px 18px rgba(124, 58, 237, .10); }
.an-stat-top { display: flex; align-items: center; gap: 12px; }
.an-sico { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.an-sico.violet { background: #ede9fe; color: #7c3aed; }
.an-sico.green { background: #dcfce7; color: #16a34a; }
.an-sico.blue { background: #dbeafe; color: #2563eb; }
.an-sico.pink { background: #fce7f3; color: #db2777; }
.an-sico.orange { background: #ffedd5; color: #ea580c; }
.an-sl { font-size: 12.5px; font-weight: 500; color: #6b7280; margin: 0; }
.an-sv { font-size: 26px; font-weight: 800; margin: 0; line-height: 1.15; }
.an-sc { font-size: 12px; color: #9ca3af; margin: 0; border-top: 1px solid #f3f4f6; padding-top: 8px; }

/* cards */
.an-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; min-width: 0; }
.an-ch { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid #f3f4f6; }
.an-cht { display: flex; align-items: center; gap: 10px; min-width: 0; }
.an-chi { width: 34px; height: 34px; border-radius: 9px; background: #ede9fe; color: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.an-ct { font-size: 15px; font-weight: 700; margin: 0; }
.an-cs { font-size: 12px; color: #9ca3af; margin: 1px 0 0; }
.an-cb { padding: 14px 18px; }
.an-legend { display: flex; gap: 14px; font-size: 12px; color: #6b7280; flex-wrap: wrap; }
.an-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.an-svg { width: 100%; height: auto; display: block; }
.an-hit .an-hitbg:hover { fill: rgba(124, 58, 237, .07); }

.an-grid2 { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
.an-grid2e { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.an-donutwrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center; }
.an-donut { width: 170px; height: 170px; flex-shrink: 0; }
.an-pie-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
.an-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.an-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.an-legend-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #374151; }
.an-legend-val { font-weight: 600; color: #111827; white-space: nowrap; }

/* age bars */
.an-age { display: flex; flex-direction: column; gap: 8px; max-height: 330px; overflow-y: auto; padding-right: 4px; }
.an-agerow { display: grid; grid-template-columns: 62px minmax(0, 1fr) 36px; align-items: center; gap: 10px; font-size: 13px; }
.an-agel { color: #6b7280; font-weight: 500; }
.an-track { height: 14px; border-radius: 99px; background: #f3f4f6; overflow: hidden; display: flex; }
.an-track span { display: block; height: 100%; }
.an-agen { font-weight: 700; text-align: right; }

/* whatsapp */
.an-msg { width: 100%; resize: none; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; background: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; color: #111827; outline: none; }
.an-msg:focus { border-color: #7c3aed; }

/* key insights */
.an-ig { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
.an-ii { border: 1px solid #f3f4f6; border-radius: 14px; padding: 14px; background: #fafafa; display: flex; flex-direction: column; gap: 8px; }
.an-it { display: flex; align-items: center; gap: 8px; }
.an-ib { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.an-ib.green { background: #dcfce7; color: #16a34a; }
.an-ib.red { background: #fee2e2; color: #dc2626; }
.an-ib.blue { background: #dbeafe; color: #2563eb; }
.an-ib.orange { background: #ffedd5; color: #ea580c; }
.an-ib.violet { background: #ede9fe; color: #7c3aed; }
.an-il { font-size: 12.5px; font-weight: 700; }
.an-il.green { color: #16a34a; } .an-il.red { color: #dc2626; } .an-il.blue { color: #2563eb; }
.an-il.orange { color: #ea580c; } .an-il.violet { color: #7c3aed; }
.an-itx { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }
.an-hl { font-weight: 700; color: #7c3aed; }
.an-hl.o { color: #ea580c; } .an-hl.g { color: #16a34a; } .an-hl.r { color: #dc2626; }

/* comparison table */
.an-tw { overflow-x: auto; }
.an-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.an-table th { padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
.an-table td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
.an-table tr.latest td { background: #faf5ff; }
.an-table tfoot td { font-weight: 700; background: #f5f3ff; border-top: 1px solid #ede9fe; }
.an .m { color: ${MALE}; font-weight: 600; }
.an .f { color: ${FEMALE}; font-weight: 600; }

.an .an-d { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
.an .an-d.up { background: #f0fdf4; color: #16a34a; }
.an .an-d.down { background: #fef2f2; color: #dc2626; }
.an .an-d.flat { background: #f3f4f6; color: #6b7280; }

.an-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
.an-empty * { text-align: center; }
.an-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: an-rot .8s linear infinite; margin: 0 auto 12px; }
@keyframes an-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .an-spin { animation: none; } .an-stat { transition: none; } }

@media (max-width: 900px) {
  .an-grid2, .an-grid2e { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .an-wrap { padding: 10px 10px 24px; gap: 12px; }
  .an-title { font-size: 20px; }
  .an-sv { font-size: 22px; }
  .an-sico { width: 40px; height: 40px; }
  .an-ch, .an-cb { padding-left: 12px; padding-right: 12px; }
  .an-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
}

/* Print / Save as PDF: whole report on paper, no header or buttons */
@media print {
  html, body, #root { overflow: visible !important; height: auto !important; }
  .an { height: auto; overflow: visible; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .an-scroll { overflow: visible; }
  .an-top, .an-tools { display: none !important; }
  .an-card, .an-stat { break-inside: avoid; }
  .an-grid2, .an-grid2e { grid-template-columns: minmax(0, 1fr); }
  .an-age { max-height: none; }
}
`;

// ─── Page ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [uniqueKids, setUniqueKids] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weeks, setWeeks] = useState(12);
  const [reloadKey, setReloadKey] = useState(0);
  const [msgDate, setMsgDate] = useState("");
  const [copied, setCopied] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [noGender, setNoGender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const kids = await loadKids();
        if (cancelled) return;
        const kidOf = new Map(kids.map((k) => [k.id, k]));
        const dates = recentSessionDates(weeks);
        const { data, failed } = await loadPresentMany(dates);
        if (cancelled) return;

        const out: Session[] = [];
        const uniq = new Set<string>();
        let skipped = 0;
        dates.forEach((date) => {
          const present = data[date];
          if (!present) return;
          const ids = Object.keys(present);
          if (ids.length === 0) return;
          const since = weekBefore(date);
          let male = 0,
            female = 0,
            newKids = 0,
            checkedOut = 0;
          const ages: Session["ages"] = {};
          const places: Session["places"] = {};
          const classes: Session["classes"] = {};
          ids.forEach((id) => {
            const k = kidOf.get(id);
            if (!k) return; // child was deleted
            if (k.gender !== "Male" && k.gender !== "Female") {
              skipped += 1;
              return;
            }
            uniq.add(id);
            if (present[id].outTime) checkedOut += 1;
            if (!ages[k.age]) ages[k.age] = { male: 0, female: 0 };
            if (k.gender === "Male") {
              male += 1;
              ages[k.age].male += 1;
            } else {
              female += 1;
              ages[k.age].female += 1;
            }
            places[k.place] = (places[k.place] || 0) + 1;
            const cls = k.std || "—";
            classes[cls] = (classes[cls] || 0) + 1;
            if (k.createdDate && k.createdDate > since && k.createdDate <= date)
              newKids += 1;
          });
          if (male + female === 0) return;
          out.push({
            date,
            male,
            female,
            total: male + female,
            checkedOut,
            ages,
            places,
            classes,
            newKids,
          });
        });
        out.sort((a, b) => a.date.localeCompare(b.date));
        setSessions(out);
        setUniqueKids(uniq.size);
        setNoGender(skipped);
        setUpdatedAt(new Date());
        if (failed.length === dates.length)
          setError("Could not load attendance from the server.");
        else if (failed.length > 0)
          setError(
            `${failed.length} date(s) could not be loaded. Press Refresh to retry.`,
          );
      } catch (err) {
        if (cancelled) return;
        setSessions([]);
        setUniqueKids(0);
        setError(
          err instanceof Error ? err.message : "Could not load analytics data.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weeks, reloadKey]);

  const a = useMemo(() => {
    const n = sessions.length;
    const sum = (k: "male" | "female" | "total" | "checkedOut") =>
      sessions.reduce((s, x) => s + x[k], 0);
    const totalAtt = sum("total");
    const male = sum("male");
    const female = sum("female");
    const checkedOut = sum("checkedOut");
    const latest: Session | null = n ? sessions[n - 1] : null;
    const prev: Session | null = n > 1 ? sessions[n - 2] : null;
    const before = sessions.slice(0, Math.max(0, n - 1));
    const avgBefore = before.length
      ? Math.round(before.reduce((s, x) => s + x.total, 0) / before.length)
      : 0;

    let best: Session | null = null;
    let low: Session | null = null;
    for (const s of sessions) {
      if (best === null || s.total > best.total) best = s;
      if (low === null || s.total < low.total) low = s;
    }

    const rows = sessions.map((s, i) => {
      const p = i > 0 ? sessions[i - 1] : null;
      return {
        ...s,
        dTotal: p ? s.total - p.total : null,
        dMale: p ? s.male - p.male : null,
        dFemale: p ? s.female - p.female : null,
        pct: p ? pctChange(s.total, p.total) : null,
      };
    });
    const increased = rows.filter((r) => (r.dTotal ?? 0) > 0).length;
    const decreased = rows.filter((r) => (r.dTotal ?? 0) < 0).length;

    // 3-session moving average of the total (smooths out one-off dips)
    const movingAvg = sessions.map((_, i) => {
      const win = sessions.slice(Math.max(0, i - 2), i + 1);
      return (
        Math.round((win.reduce((s, x) => s + x.total, 0) / win.length) * 10) /
        10
      );
    });

    // boys / girls share (%) per session
    const malePct = sessions.map((s) =>
      s.total ? Math.round((s.male / s.total) * 100) : 0,
    );
    const femalePct = sessions.map((s) =>
      s.total ? Math.round((s.female / s.total) * 100) : 0,
    );

    // attendance by place (top 5 + Others)
    const placeTotals: Record<string, number> = {};
    sessions.forEach((s) =>
      Object.entries(s.places).forEach(([p, c]) => {
        placeTotals[p] = (placeTotals[p] || 0) + c;
      }),
    );
    const sortedPlaces = Object.entries(placeTotals).sort(
      (x, y) => y[1] - x[1],
    );
    const placeSlices: Slice[] = sortedPlaces
      .slice(0, 5)
      .map(([label, value], i) => ({
        key: `p-${label}`,
        label,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
    const others = sortedPlaces.slice(5).reduce((s, [, c]) => s + c, 0);
    if (others > 0)
      placeSlices.push({
        key: "p-others",
        label: "Others",
        value: others,
        color: "#C4B5FD",
      });
    const topPlace: [string, number] | null = sortedPlaces[0] ?? null;

    // top 4 places, one line each over time
    const placeTrend: LineSeries[] = sortedPlaces
      .slice(0, 4)
      .map(([label], i) => ({
        key: `pt-${label}`,
        label,
        color: PIE_COLORS[i % PIE_COLORS.length],
        values: sessions.map((s) => s.places[label] || 0),
        primary: i === 0,
      }));

    // busiest month = highest average attendance per session
    const monthMap = new Map<string, { sum: number; count: number }>();
    sessions.forEach((s) => {
      const k = s.date.slice(0, 7);
      const e = monthMap.get(k) ?? { sum: 0, count: 0 };
      e.sum += s.total;
      e.count += 1;
      monthMap.set(k, e);
    });
    let busiest: Busiest | null = null;
    for (const [key, e] of monthMap) {
      const avg = Math.round(e.sum / e.count);
      if (!busiest || avg > busiest.avg) busiest = { key, avg };
    }

    return {
      n,
      totalAtt,
      male,
      female,
      checkedOut,
      latest,
      prev,
      avgBefore,
      best,
      low,
      rows,
      increased,
      decreased,
      placeSlices,
      placeTrend,
      topPlace,
      busiest,
      movingAvg,
      malePct,
      femalePct,
      avg: n ? Math.round(totalAtt / n) : 0,
      avgMale: n ? Math.round(male / n) : 0,
      avgFemale: n ? Math.round(female / n) : 0,
    };
  }, [sessions]);

  const msgSession = sessions.find((s) => s.date === msgDate) ?? a.latest;
  const message = msgSession ? buildMessage(msgSession) : "";

  const ageRows = useMemo(() => {
    if (!msgSession) return [];
    return Object.keys(msgSession.ages)
      .map(Number)
      .sort(ageSort)
      .map((age) => {
        const slot = msgSession.ages[age];
        return { age, male: slot?.male ?? 0, female: slot?.female ?? 0 };
      });
  }, [msgSession]);
  const maxAge = Math.max(1, ...ageRows.map((r) => r.male + r.female));

  const classRows = useMemo(() => {
    if (!msgSession) return [];
    return Object.entries(msgSession.classes)
      .sort((x, y) => stdOrder(x[0]) - stdOrder(y[0]))
      .map(([std, count]) => ({ label: stdLabel(std), count }));
  }, [msgSession]);
  const maxClass = Math.max(1, ...classRows.map((r) => r.count));

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    const head = [
      "Date",
      "Male",
      "Female",
      "Total",
      "Checked out",
      "Male change",
      "Female change",
      "Total change",
    ];
    const lines = a.rows.map((r) =>
      [
        r.date,
        r.male,
        r.female,
        r.total,
        r.checkedOut,
        r.dMale ?? "",
        r.dFemale ?? "",
        r.dTotal ?? "",
      ].join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${isoDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Line chart data ────────────────────────────────────────────────
  const dateLabels = a.rows.map((r) => shortDate(r.date));
  const dateTitles = a.rows.map((r) => longDate(r.date));

  const overTimeSeries: LineSeries[] = [
    {
      key: "total",
      label: "Total",
      color: PURPLE,
      values: a.rows.map((r) => r.total),
      primary: true,
    },
    {
      key: "male",
      label: "Male",
      color: MALE,
      values: a.rows.map((r) => r.male),
    },
    {
      key: "female",
      label: "Female",
      color: FEMALE,
      values: a.rows.map((r) => r.female),
    },
  ];
  const movingSeries: LineSeries[] = [
    {
      key: "total",
      label: "Total",
      color: PURPLE,
      values: a.rows.map((r) => r.total),
      primary: true,
    },
    {
      key: "ma",
      label: "3-session average",
      color: AMBER,
      values: a.movingAvg,
      dashed: true,
    },
  ];
  const genderShareSeries: LineSeries[] = [
    {
      key: "mp",
      label: "Male %",
      color: MALE,
      values: a.malePct,
      primary: true,
    },
    {
      key: "fp",
      label: "Female %",
      color: FEMALE,
      values: a.femalePct,
      primary: true,
    },
  ];
  const ageSeries: LineSeries[] = [
    {
      key: "am",
      label: "Male",
      color: MALE,
      values: ageRows.map((r) => r.male),
    },
    {
      key: "af",
      label: "Female",
      color: FEMALE,
      values: ageRows.map((r) => r.female),
    },
    {
      key: "at",
      label: "Total",
      color: PURPLE,
      values: ageRows.map((r) => r.male + r.female),
      primary: true,
    },
  ];
  const newReturningSeries: LineSeries[] = [
    {
      key: "ret",
      label: "Returning",
      color: GREEN,
      values: a.rows.map((r) => r.total - r.newKids),
      primary: true,
    },
    {
      key: "new",
      label: "New (joined that week)",
      color: AMBER,
      values: a.rows.map((r) => r.newKids),
    },
  ];
  const ageLabels = ageRows.map((r) => (r.age === 0 ? "Not set" : `${r.age}y`));

  // ─── Key insights ───────────────────────────────────────────────────
  const growthDiff = a.latest && a.prev ? a.latest.total - a.prev.total : 0;
  const growthUp = growthDiff >= 0;
  const busiestLabel = a.busiest
    ? `${MONTH_FULL[Number(a.busiest.key.slice(5, 7)) - 1]} ${a.busiest.key.slice(0, 4)}`
    : "";
  const bestS: Session | null = a.best;
  const lowS: Session | null = a.low;

  const genderSlices: Slice[] = [
    { key: "g-m", label: "Male", value: a.male, color: MALE },
    { key: "g-f", label: "Female", value: a.female, color: FEMALE },
  ];

  const stats: {
    key: string;
    label: string;
    value: number;
    note: string;
    variant: string;
    icon: ReactNode;
    color?: string;
  }[] = [
    {
      key: "s1",
      label: "Total Dates (Sessions)",
      value: a.n,
      variant: "violet",
      icon: <IcCalendar size={24} />,
      note: `Days with attendance · last ${weeks} weeks`,
      color: PURPLE,
    },
    {
      key: "s2",
      label: "Total Attendance",
      value: a.totalAtt,
      variant: "orange",
      icon: <IcUsers size={24} />,
      note: `Avg ${a.avg} per session`,
    },
    {
      key: "s3",
      label: "Unique Children",
      value: uniqueKids,
      variant: "green",
      icon: <IcUser size={24} />,
      note: "Different children who attended",
    },
    {
      key: "s4",
      label: "Checked Out",
      value: a.checkedOut,
      variant: "orange",
      icon: <IcLogout size={24} />,
      note: `${a.totalAtt ? Math.round((a.checkedOut / a.totalAtt) * 100) : 0}% of attendance has a check-out time`,
      color: "#ea580c",
    },
    {
      key: "s5",
      label: "Male Count",
      value: a.male,
      variant: "blue",
      icon: <IcUser size={24} />,
      note: `${a.totalAtt ? Math.round((a.male / a.totalAtt) * 100) : 0}% · avg ${a.avgMale} per session`,
      color: MALE,
    },
    {
      key: "s6",
      label: "Female Count",
      value: a.female,
      variant: "pink",
      icon: <IcUser size={24} />,
      note: `${a.totalAtt ? Math.round((a.female / a.totalAtt) * 100) : 0}% · avg ${a.avgFemale} per session`,
      color: FEMALE,
    },
  ];

  const cmpCard = (
    title: string,
    now: number,
    before: number | null,
    color: string,
  ) => (
    <div className="an-ii" style={{ background: "#fafafa" }}>
      <div className="an-il" style={{ color: "#6b7280", fontWeight: 600 }}>
        {title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 800, color }}>{now}</span>
        {before !== null && (
          <Delta value={now - before} pct={pctChange(now, before)} />
        )}
      </div>
      <small style={{ color: "#9ca3af", fontSize: 12 }}>
        {before !== null
          ? `Previous session: ${before}`
          : "No previous session"}
      </small>
    </div>
  );

  // Small helper so every line-chart card has the same header
  const lineCard = (
    icon: ReactNode,
    title: string,
    subtitle: string,
    legend: LineSeries[],
    chart: ReactNode,
  ) => (
    <div className="an-card">
      <div className="an-ch">
        <div className="an-cht">
          <div className="an-chi">{icon}</div>
          <div>
            <p className="an-ct">{title}</p>
            <p className="an-cs">{subtitle}</p>
          </div>
        </div>
        <SeriesLegend series={legend} />
      </div>
      <div className="an-cb">{chart}</div>
    </div>
  );

  return (
    <div className="an">
      <style>{css}</style>
      <div className="an-top">
        <Header />
      </div>

      <div className="an-scroll">
        <div className="an-wrap">
          <div className="an-head">
            <div>
              <h1 className="an-title">
                <span className="p">Attendance</span> Analytics
              </h1>
              <p className="an-sub">
                {a.n > 0
                  ? `${longDate(a.rows[0].date)} – ${longDate(a.rows[a.n - 1].date)} · overview and week-to-week comparison`
                  : "Attendance trends and week-to-week comparison"}
              </p>
              {updatedAt && !loading && (
                <p className="an-stamp">
                  Updated {pad(updatedAt.getHours())}:
                  {pad(updatedAt.getMinutes())}
                </p>
              )}
            </div>
            <div className="an-tools">
              <select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                aria-label="Range"
              >
                <option value={4}>Last 4 weeks</option>
                <option value={8}>Last 8 weeks</option>
                <option value={12}>Last 12 weeks</option>
                <option value={26}>Last 26 weeks</option>
                <option value={52}>Last 52 weeks</option>
              </select>
              <button
                type="button"
                className="an-btn"
                disabled={loading || a.n === 0}
                onClick={exportCsv}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="an-btn"
                disabled={loading || a.n === 0}
                onClick={() => window.print()}
              >
                Print / PDF
              </button>
              <button
                type="button"
                className="an-btn"
                disabled={loading}
                onClick={() => {
                  clearAttendanceCaches();
                  setReloadKey((k) => k + 1);
                }}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="an-error" role="alert">
              {error}
            </div>
          )}
          {!loading && noGender > 0 && (
            <div className="an-error" role="status">
              {noGender} attendance entr{noGender === 1 ? "y has" : "ies have"}{" "}
              no gender set, so
              {noGender === 1 ? " it is" : " they are"} left out of these
              counts. Open the child in Add Child and set the gender.
            </div>
          )}

          {loading ? (
            <div className="an-card">
              <div className="an-empty">
                <div className="an-spin" />
                Loading analytics...
              </div>
            </div>
          ) : a.n === 0 ? (
            <div className="an-card">
              <div className="an-empty">
                No attendance found in this range. Try a longer range.
              </div>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="an-stats">
                {stats.map((s) => (
                  <div key={s.key} className="an-stat">
                    <div className="an-stat-top">
                      <div className={`an-sico ${s.variant}`}>{s.icon}</div>
                      <div style={{ minWidth: 0 }}>
                        <p className="an-sl">{s.label}</p>
                        <p
                          className="an-sv"
                          style={s.color ? { color: s.color } : undefined}
                        >
                          {s.value}
                        </p>
                      </div>
                    </div>
                    <p className="an-sc">{s.note}</p>
                  </div>
                ))}
              </div>

              {/* Line chart + place pie */}
              <div className="an-grid2">
                {lineCard(
                  <IcTrendUp size={17} />,
                  "Attendance Over Time",
                  "Total, male and female per session (hover for details)",
                  overTimeSeries,
                  <LineChart
                    labels={dateLabels}
                    titles={dateTitles}
                    series={overTimeSeries}
                    ariaLabel="Attendance trend"
                  />,
                )}

                <div className="an-card">
                  <div className="an-ch">
                    <div className="an-cht">
                      <div className="an-chi">
                        <IcPie size={17} />
                      </div>
                      <div>
                        <p className="an-ct">Attendance by Place</p>
                        <p className="an-cs">Top 5 places by attendance</p>
                      </div>
                    </div>
                  </div>
                  <div className="an-cb">
                    {a.placeSlices.length === 0 ? (
                      <div className="an-empty">No place data yet.</div>
                    ) : (
                      <div className="an-donutwrap">
                        <DonutMulti
                          slices={a.placeSlices}
                          centerValue={a.totalAtt}
                          centerLabel="attendances"
                        />
                        <Legend slices={a.placeSlices} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly bars + gender donut */}
              <div className="an-grid2">
                <div className="an-card">
                  <div className="an-ch">
                    <div className="an-cht">
                      <div className="an-chi">
                        <IcBars size={17} />
                      </div>
                      <div>
                        <p className="an-ct">Weekly Attendance</p>
                        <p className="an-cs">
                          Boys and girls stacked per session
                        </p>
                      </div>
                    </div>
                    <div className="an-legend">
                      <span>
                        <i style={{ background: MALE }} />
                        Male
                      </span>
                      <span>
                        <i style={{ background: FEMALE }} />
                        Female
                      </span>
                    </div>
                  </div>
                  <div className="an-cb">
                    <StackedBars data={a.rows} />
                  </div>
                </div>

                <div className="an-card">
                  <div className="an-ch">
                    <div className="an-cht">
                      <div className="an-chi">
                        <IcUsers size={17} />
                      </div>
                      <div>
                        <p className="an-ct">Male vs Female</p>
                        <p className="an-cs">Share of total attendance</p>
                      </div>
                    </div>
                  </div>
                  <div className="an-cb">
                    <div className="an-donutwrap">
                      <DonutMulti
                        slices={genderSlices}
                        centerValue={a.totalAtt}
                        centerLabel="attendances"
                      />
                      <Legend slices={genderSlices} />
                    </div>
                  </div>
                </div>
              </div>

              {/* moving average + places over time */}
              <div className="an-grid2e">
                {lineCard(
                  <IcActivity size={17} />,
                  "Trend vs 3-Session Average",
                  "The dashed line smooths out one-off dips and spikes",
                  movingSeries,
                  <LineChart
                    labels={dateLabels}
                    titles={dateTitles}
                    series={movingSeries}
                    ariaLabel="Attendance with 3-session moving average"
                  />,
                )}

                {a.placeTrend.length > 0 &&
                  lineCard(
                    <IcPin size={17} />,
                    "Top Places Over Time",
                    "Attendance per session for the top 4 places",
                    a.placeTrend,
                    <LineChart
                      labels={dateLabels}
                      titles={dateTitles}
                      series={a.placeTrend}
                      ariaLabel="Attendance by place over time"
                    />,
                  )}
              </div>

              {/* Latest vs previous */}
              {a.latest && (
                <div className="an-card">
                  <div className="an-ch">
                    <div className="an-cht">
                      <div className="an-chi">
                        <IcActivity size={17} />
                      </div>
                      <div>
                        <p className="an-ct">Latest Session vs Previous</p>
                        <p className="an-cs">
                          {longDate(a.latest.date)}
                          {a.prev
                            ? ` compared with ${longDate(a.prev.date)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="an-cb">
                    <div className="an-ig">
                      {cmpCard(
                        "Total",
                        a.latest.total,
                        a.prev ? a.prev.total : null,
                        PURPLE,
                      )}
                      {cmpCard(
                        "Male",
                        a.latest.male,
                        a.prev ? a.prev.male : null,
                        MALE,
                      )}
                      {cmpCard(
                        "Female",
                        a.latest.female,
                        a.prev ? a.prev.female : null,
                        FEMALE,
                      )}
                      {cmpCard(
                        "Checked out",
                        a.latest.checkedOut,
                        a.prev ? a.prev.checkedOut : null,
                        "#ea580c",
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Age chart + WhatsApp box (both use the selected session date) */}
              {msgSession && (
                <div className="an-grid2e">
                  <div className="an-card">
                    <div className="an-ch">
                      <div className="an-cht">
                        <div className="an-chi">
                          <IcBars size={17} />
                        </div>
                        <div>
                          <p className="an-ct">Age Wise Count</p>
                          <p className="an-cs">{longDate(msgSession.date)}</p>
                        </div>
                      </div>
                      <div className="an-legend">
                        <span>
                          <i style={{ background: MALE }} />
                          Male
                        </span>
                        <span>
                          <i style={{ background: FEMALE }} />
                          Female
                        </span>
                      </div>
                    </div>
                    <div className="an-cb">
                      <div className="an-age">
                        {ageRows.map((r) => {
                          const t = r.male + r.female;
                          return (
                            <div
                              key={r.age}
                              className="an-agerow"
                              title={`Male ${r.male} · Female ${r.female}`}
                            >
                              <span className="an-agel">
                                {r.age === 0 ? "Not set" : `${r.age} yrs`}
                              </span>
                              <div className="an-track">
                                <span
                                  style={{
                                    width: `${(r.male / maxAge) * 100}%`,
                                    background: MALE,
                                  }}
                                />
                                <span
                                  style={{
                                    width: `${(r.female / maxAge) * 100}%`,
                                    background: FEMALE,
                                  }}
                                />
                              </div>
                              <span className="an-agen">{t}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="an-card">
                    <div className="an-ch">
                      <div className="an-cht">
                        <div className="an-chi">
                          <IcChat size={17} />
                        </div>
                        <div>
                          <p className="an-ct">Share Count on WhatsApp</p>
                          <p className="an-cs">Copy and send to your group</p>
                        </div>
                      </div>
                      <div className="an-tools">
                        <select
                          value={msgSession.date}
                          onChange={(e) => setMsgDate(e.target.value)}
                          aria-label="Session date"
                        >
                          {[...sessions].reverse().map((s) => (
                            <option key={s.date} value={s.date}>
                              {longDate(s.date)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="an-btn an-copy"
                          onClick={copyMessage}
                        >
                          {copied ? "Copied ✓" : "Copy"}
                        </button>
                        <a
                          className="an-btn an-wa"
                          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <div className="an-cb">
                      <textarea
                        className="an-msg"
                        readOnly
                        value={message}
                        rows={Math.min(22, message.split("\n").length + 1)}
                        onFocus={(e) => e.target.select()}
                        aria-label="WhatsApp message"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* age line chart (selected session) + gender share over time */}
              <div className="an-grid2e">
                {msgSession &&
                  lineCard(
                    <IcTrendUp size={17} />,
                    "Age Distribution",
                    `${longDate(msgSession.date)} · children per age (change the date in the WhatsApp card)`,
                    ageSeries,
                    <LineChart
                      labels={ageLabels}
                      titles={ageRows.map((r) =>
                        r.age === 0 ? "Age not set" : `${r.age} years`,
                      )}
                      series={ageSeries}
                      ariaLabel="Age distribution for the selected session"
                    />,
                  )}

                {lineCard(
                  <IcUsers size={17} />,
                  "Boys vs Girls Share",
                  "Percentage of each session's attendance",
                  genderShareSeries,
                  <LineChart
                    labels={dateLabels}
                    titles={dateTitles}
                    series={genderShareSeries}
                    ariaLabel="Male and female share over time"
                    suffix="%"
                    maxOverride={100}
                  />,
                )}
              </div>

              {/* Class-wise count + new vs returning */}
              <div className="an-grid2e">
                {msgSession && (
                  <div className="an-card">
                    <div className="an-ch">
                      <div className="an-cht">
                        <div className="an-chi">
                          <IcBars size={17} />
                        </div>
                        <div>
                          <p className="an-ct">Class Wise Count</p>
                          <p className="an-cs">
                            {longDate(msgSession.date)} · children per class
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="an-cb">
                      <div className="an-age">
                        {classRows.map((r) => (
                          <div key={r.label} className="an-agerow">
                            <span className="an-agel">{r.label}</span>
                            <div className="an-track">
                              <span
                                style={{
                                  width: `${(r.count / maxClass) * 100}%`,
                                  background: PURPLE,
                                }}
                              />
                            </div>
                            <span className="an-agen">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {lineCard(
                  <IcUsers size={17} />,
                  "New vs Returning",
                  "Children registered that week vs those already registered",
                  newReturningSeries,
                  <LineChart
                    labels={dateLabels}
                    titles={dateTitles}
                    series={newReturningSeries}
                    ariaLabel="New and returning children per session"
                  />,
                )}
              </div>

              {/* Key insights */}
              <div className="an-card">
                <div className="an-ch">
                  <div className="an-cht">
                    <div className="an-chi">
                      <IcBulb size={17} />
                    </div>
                    <div>
                      <p className="an-ct">Key Insights</p>
                      <p className="an-cs">
                        Important insights about your attendance data
                      </p>
                    </div>
                  </div>
                </div>
                <div className="an-cb">
                  <div className="an-ig">
                    {a.latest && a.prev && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div
                            className={`an-ib ${growthDiff === 0 ? "violet" : growthUp ? "green" : "red"}`}
                          >
                            {growthUp ? (
                              <IcTrendUp size={16} />
                            ) : (
                              <IcTrendDown size={16} />
                            )}
                          </div>
                          <span
                            className={`an-il ${growthDiff === 0 ? "violet" : growthUp ? "green" : "red"}`}
                          >
                            Attendance Growth
                          </span>
                        </div>
                        <p className="an-itx">
                          {growthDiff === 0 ? (
                            <>
                              Same as the previous session (
                              {longDate(a.prev.date)}).
                            </>
                          ) : (
                            <>
                              <span className={`an-hl ${growthUp ? "g" : "r"}`}>
                                {Math.abs(growthDiff)}{" "}
                                {growthUp ? "more" : "fewer"} children
                              </span>{" "}
                              than the previous session ({longDate(a.prev.date)}
                              ) – boys{" "}
                              {a.latest.male - a.prev.male >= 0 ? "+" : ""}
                              {a.latest.male - a.prev.male}, girls{" "}
                              {a.latest.female - a.prev.female >= 0 ? "+" : ""}
                              {a.latest.female - a.prev.female}.
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {a.topPlace && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div className="an-ib blue">
                            <IcPin size={16} />
                          </div>
                          <span className="an-il blue">Top Place</span>
                        </div>
                        <p className="an-itx">
                          <span className="an-hl">{a.topPlace[0]}</span> has the
                          highest attendance ({a.topPlace[1]} attendances).
                        </p>
                      </div>
                    )}

                    {bestS && lowS && a.n > 1 && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div className="an-ib orange">
                            <IcStar size={16} />
                          </div>
                          <span className="an-il orange">
                            Best &amp; Lowest Day
                          </span>
                        </div>
                        <p className="an-itx">
                          Best: <span className="an-hl g">{bestS.total}</span>{" "}
                          on {longDate(bestS.date)}. Lowest:{" "}
                          <span className="an-hl r">{lowS.total}</span> on{" "}
                          {longDate(lowS.date)}.
                        </p>
                      </div>
                    )}

                    {a.busiest && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div className="an-ib violet">
                            <IcCalendar size={16} />
                          </div>
                          <span className="an-il violet">Busiest Month</span>
                        </div>
                        <p className="an-itx">
                          <span className="an-hl o">{busiestLabel}</span> had
                          the highest average attendance ({a.busiest.avg} per
                          session).
                        </p>
                      </div>
                    )}

                    {a.latest && a.n > 1 && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div className="an-ib green">
                            <IcActivity size={16} />
                          </div>
                          <span className="an-il green">Vs Average</span>
                        </div>
                        <p className="an-itx">
                          {a.latest.total - a.avgBefore === 0 ? (
                            <>
                              The latest session is exactly on average (
                              {a.avgBefore}).
                            </>
                          ) : (
                            <>
                              The latest session is{" "}
                              <span
                                className={`an-hl ${a.latest.total > a.avgBefore ? "g" : "r"}`}
                              >
                                {Math.abs(a.latest.total - a.avgBefore)}{" "}
                                {a.latest.total > a.avgBefore
                                  ? "above"
                                  : "below"}
                              </span>{" "}
                              the average of the earlier {a.n - 1} sessions (
                              {a.avgBefore}).
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {a.n > 1 && (
                      <div className="an-ii">
                        <div className="an-it">
                          <div className="an-ib violet">
                            <IcBars size={16} />
                          </div>
                          <span className="an-il violet">Week-to-Week</span>
                        </div>
                        <p className="an-itx">
                          Out of {a.n - 1} changes, attendance went{" "}
                          <span className="an-hl g">up {a.increased}</span> time
                          {a.increased === 1 ? "" : "s"} and{" "}
                          <span className="an-hl r">down {a.decreased}</span>{" "}
                          time{a.decreased === 1 ? "" : "s"}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Week-by-week comparison */}
              <div className="an-card">
                <div className="an-ch">
                  <div className="an-cht">
                    <div className="an-chi">
                      <IcActivity size={17} />
                    </div>
                    <div>
                      <p className="an-ct">Week-by-Week Comparison</p>
                      <p className="an-cs">
                        Every session with its change from the week before
                      </p>
                    </div>
                  </div>
                  <div className="an-legend">
                    <span style={{ color: GREEN }}>
                      ▲ {a.increased} increased
                    </span>
                    <span style={{ color: RED }}>
                      ▼ {a.decreased} decreased
                    </span>
                  </div>
                </div>
                <div className="an-tw">
                  <table className="an-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Male</th>
                        <th>Female</th>
                        <th>Total</th>
                        <th>Checked out</th>
                        <th>Male +/−</th>
                        <th>Female +/−</th>
                        <th>Total +/−</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...a.rows].reverse().map((r, idx) => (
                        <tr key={r.date} className={idx === 0 ? "latest" : ""}>
                          <td>
                            <b>{longDate(r.date)}</b>
                          </td>
                          <td className="m">{r.male}</td>
                          <td className="f">{r.female}</td>
                          <td>
                            <b>{r.total}</b>
                          </td>
                          <td>{r.checkedOut}</td>
                          <td>
                            {r.dMale === null ? (
                              <span className="an-d flat">—</span>
                            ) : (
                              <Delta value={r.dMale} />
                            )}
                          </td>
                          <td>
                            {r.dFemale === null ? (
                              <span className="an-d flat">—</span>
                            ) : (
                              <Delta value={r.dFemale} />
                            )}
                          </td>
                          <td>
                            {r.dTotal === null ? (
                              <span className="an-d flat">—</span>
                            ) : (
                              <Delta value={r.dTotal} pct={r.pct ?? 0} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total ({a.n} dates)</td>
                        <td>{a.male}</td>
                        <td>{a.female}</td>
                        <td>{a.totalAtt}</td>
                        <td>{a.checkedOut}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

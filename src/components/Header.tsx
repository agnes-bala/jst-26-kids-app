// import { useState, useRef, useEffect } from "react";
// import type { CSSProperties, ReactNode } from "react";
// import { Link, useLocation, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// // ─── Types ──────────────────────────────────────────────────────────────
// interface NavChild {
//   href: string;
//   label: string;
// }
// interface NavItem {
//   label: string;
//   href?: string;
//   icon: ReactNode;
//   children?: NavChild[];
// }

// // ─── Icons ──────────────────────────────────────────────────────────────
// const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
//   <svg
//     width="14"
//     height="14"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2.5"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     style={{
//       transition: "transform 0.2s ease",
//       transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
//       marginLeft: "4px",
//     }}
//   >
//     <path d="m6 9 6 6 6-6" />
//   </svg>
// );
// const HomeIcon = () => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
//     <polyline points="9 22 9 12 15 12 15 22" />
//   </svg>
// );
// const AnalyticsIcon = () => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <line x1="18" y1="20" x2="18" y2="10" />
//     <line x1="12" y1="20" x2="12" y2="4" />
//     <line x1="6" y1="20" x2="6" y2="14" />
//   </svg>
// );
// const ReportIcon = () => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
//     <polyline points="14 2 14 8 20 8" />
//     <line x1="16" y1="13" x2="8" y2="13" />
//     <line x1="16" y1="17" x2="8" y2="17" />
//     <polyline points="10 9 9 9 8 9" />
//   </svg>
// );
// const UsersIcon = () => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//     <circle cx="9" cy="7" r="4" />
//     <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//     <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//   </svg>
// );
// const LogoutIcon = () => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//     <polyline points="16 17 21 12 16 7" />
//     <line x1="21" y1="12" x2="9" y2="12" />
//   </svg>
// );
// const AccountIcon = () => (
//   <svg
//     width="20"
//     height="20"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
//     <circle cx="12" cy="7" r="4" />
//   </svg>
// );
// const ShieldIcon = () => (
//   <svg
//     width="16"
//     height="16"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
//   </svg>
// );
// const MenuIcon = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <line x1="3" y1="6" x2="21" y2="6" />
//     <line x1="3" y1="12" x2="21" y2="12" />
//     <line x1="3" y1="18" x2="21" y2="18" />
//   </svg>
// );
// const CloseIcon = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <line x1="18" y1="6" x2="6" y2="18" />
//     <line x1="6" y1="6" x2="18" y2="18" />
//   </svg>
// );

// export default function Header() {
//   const location = useLocation();
//   const pathname = location.pathname;
//   const navigate = useNavigate();
//   const { logout } = useAuth();
//   const username = localStorage.getItem("username");
//   const role = localStorage.getItem("role");

//   const [accountOpen, setAccountOpen] = useState(false);
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

//   // Which desktop dropdown is open (by group label) + which mobile group is expanded
//   const [openMenu, setOpenMenu] = useState<string | null>(null);
//   const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
//   const [previousPathname, setPreviousPathname] = useState(pathname);

//   // Reset route-specific UI state during rendering when the route changes.
//   if (previousPathname !== pathname) {
//     setPreviousPathname(pathname);
//     setOpenMenu(null);
//     setAccountOpen(false);
//   }

//   const accountRef = useRef<HTMLDivElement | null>(null);
//   const navRef = useRef<HTMLElement | null>(null);

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       const target = e.target as Node;
//       if (accountRef.current && !accountRef.current.contains(target)) {
//         setAccountOpen(false);
//       }
//       if (navRef.current && !navRef.current.contains(target)) {
//         setOpenMenu(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const navLinks: NavItem[] = [
//     { href: "/home", label: "Home", icon: <HomeIcon /> },
//     { href: "/analytics", label: "Analytics", icon: <AnalyticsIcon /> },

//     {
//       label: "Content Management",
//       icon: <ReportIcon />,
//       children: [
//         { href: "/contentmanagement", label: "Slider Updates" },
//         { href: "/dailyverse", label: "Daily Verse" },
//         { href: "/walkwithjesus", label: "Walk with Jesus" },
//         { href: "/liveupdates", label: "Live Updates" },
//         { href: "/supabaseupload", label: "Video Content" },
//         { href: "/eventupdates", label: "Event Updates" },
//         { href: "/magazines", label: "Magazines" },
//         { href: "/wrpc", label: "WRPC" },
//         { href: "/revivalchurches", label: "Revival Churches" },
//         { href: "/revivaltours", label: "Revival Tours" },
//       ],
//     },

//     // Children section – separate from Content Management
//     {
//       label: "Children",
//       icon: <UsersIcon />,
//       children: [
//         { href: "/attendance", label: "Attendance" },
//         { href: "/addChild", label: "Add Child" },
//         { href: "/childReport", label: "Child Report" },
//         { href: "/childAnalytics", label: "Child Analytics" },
//       ],
//     },

//     ...(role === "admin"
//       ? [{ href: "/report", label: "Report", icon: <ReportIcon /> } as NavItem]
//       : []),
//   ];

//   const isActive = (href: string) => pathname?.startsWith(href);
//   const isChildActive = (children: NavChild[]) =>
//     children.some((child) => pathname === child.href);

//   const handleLogout = () => {
//     if (window.confirm("Are you sure you want to logout?")) {
//       logout();
//       navigate("/");
//     }
//   };

//   const s: { [key: string]: CSSProperties } = {
//     header: {
//       backgroundColor: "#ffffff",
//       borderBottom: "1px solid #E9E4FF",
//       position: "sticky",
//       top: 0,
//       zIndex: 100,
//       boxShadow: "0 1px 8px rgba(124,58,237,0.06)",
//     },
//     inner: {
//       maxWidth: "1400px",
//       margin: "0 auto",
//       padding: "0 24px",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "space-between",
//       height: "72px",
//     },
//     nav: { display: "flex", alignItems: "center", gap: "4px" },
//     navLink: {
//       display: "flex",
//       alignItems: "center",
//       gap: "6px",
//       padding: "8px 16px",
//       borderRadius: "8px",
//       textDecoration: "none",
//       fontSize: "14px",
//       fontWeight: 500,
//       color: "#6B7280",
//       transition: "all 0.15s ease",
//       position: "relative",
//       cursor: "pointer",
//       border: "none",
//       background: "none",
//     },
//     navLinkActive: { color: "#7C3AED", backgroundColor: "#F5F3FF" },

//     submenuDropdown: {
//       position: "absolute",
//       top: "calc(100% + 8px)",
//       left: 0,
//       width: "210px",
//       backgroundColor: "#ffffff",
//       border: "1px solid #E9E4FF",
//       borderRadius: "12px",
//       boxShadow: "0 8px 24px rgba(124,58,237,0.1)",
//       padding: "8px",
//       display: "flex",
//       flexDirection: "column",
//       gap: "4px",
//       zIndex: 200,
//     },
//     submenuItem: {
//       padding: "10px 12px",
//       borderRadius: "6px",
//       fontSize: "13.5px",
//       textDecoration: "none",
//       color: "#4B5563",
//       transition: "all 0.15s",
//     },
//     submenuItemActive: {
//       backgroundColor: "#F5F3FF",
//       color: "#7C3AED",
//       fontWeight: 600,
//     },

//     mobileSubmenuContainer: {
//       display: "flex",
//       flexDirection: "column",
//       gap: "4px",
//       paddingLeft: "32px",
//       marginTop: "4px",
//       borderLeft: "2px solid #F3F4F6",
//       marginLeft: "24px",
//     },

//     brand: {
//       display: "flex",
//       alignItems: "center",
//       gap: "12px",
//       textDecoration: "none",
//     },
//     logoBox: {
//       width: "44px",
//       height: "44px",
//       borderRadius: "12px",
//       background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//     },
//     brandTitle: {
//       fontSize: "17px",
//       fontWeight: 700,
//       color: "#7C3AED",
//       margin: 0,
//     },
//     brandSub: { fontSize: "12px", color: "#9CA3AF", margin: 0 },
//     rightSection: { display: "flex", alignItems: "center", gap: "20px" },
//     accountBtn: {
//       width: "40px",
//       height: "40px",
//       borderRadius: "50%",
//       background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
//       border: "none",
//       cursor: "pointer",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       color: "#ffffff",
//       boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
//     },
//     dropdown: {
//       position: "absolute",
//       top: "calc(100% + 12px)",
//       right: 0,
//       width: "260px",
//       backgroundColor: "#ffffff",
//       border: "1px solid #E9E4FF",
//       borderRadius: "14px",
//       boxShadow: "0 8px 32px rgba(124,58,237,0.12)",
//       overflow: "hidden",
//       zIndex: 200,
//     },
//     dropHeader: {
//       padding: "16px 18px",
//       background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
//       borderBottom: "1px solid #E9E4FF",
//     },
//     dropUsername: {
//       fontSize: "15px",
//       fontWeight: 700,
//       color: "#1F2937",
//       margin: 0,
//     },
//     dropBody: { padding: "12px 18px" },
//     dropLogout: {
//       display: "flex",
//       alignItems: "center",
//       gap: "8px",
//       padding: "10px 14px",
//       borderRadius: "10px",
//       fontSize: "13px",
//       fontWeight: 600,
//       color: "#EF4444",
//       border: "none",
//       cursor: "pointer",
//       width: "100%",
//       background: "none",
//     },
//     mobileNav: {
//       backgroundColor: "#ffffff",
//       borderTop: "1px solid #E9E4FF",
//       padding: "16px 24px",
//       display: "flex",
//       flexDirection: "column",
//       gap: "8px",
//       maxHeight: "calc(100vh - 72px)",
//       overflowY: "auto",
//     },
//     mobileNavLink: {
//       display: "flex",
//       alignItems: "center",
//       gap: "10px",
//       padding: "12px 16px",
//       borderRadius: "10px",
//       textDecoration: "none",
//       fontSize: "15px",
//       fontWeight: 500,
//       color: "#6B7280",
//     },
//     mobileNavLinkActive: { color: "#7C3AED", backgroundColor: "#F5F3FF" },
//     mobileMenuBtn: {
//       display: "none",
//       background: "none",
//       border: "none",
//       cursor: "pointer",
//       color: "#374151",
//     },
//   };

//   return (
//     <>
//       <style>{`
//         .submenu-item:hover { background-color: #F9FAFB; color: #7C3AED; }
//         .header-nav-desktop { display: flex !important; }
//         .header-mobile-btn { display: none !important; }
//         @media (max-width: 1024px) {
//           .header-nav-desktop { display: none !important; }
//           .header-mobile-btn { display: flex !important; }
//         }
//       `}</style>

//       <header style={s.header}>
//         <div style={s.inner}>
//           <Link to="/" style={s.brand}>
//             <div style={s.logoBox}>
//               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//                 <circle cx="8" cy="8" r="3" stroke="white" strokeWidth="1.8" />
//                 <path
//                   d="M2 20c0-3.314 2.686-5 6-5h4c3.314 0 6 1.686 6 5"
//                   stroke="white"
//                   strokeWidth="1.8"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column" }}>
//               <p style={s.brandTitle}>JR App Management</p>
//               <p style={s.brandSub}>User Details System</p>
//             </div>
//           </Link>

//           <div style={s.rightSection}>
//             <nav style={s.nav} className="header-nav-desktop" ref={navRef}>
//               {navLinks.map((link) => {
//                 const children = link.children;

//                 if (children) {
//                   const active = isChildActive(children);
//                   const open = openMenu === link.label;
//                   return (
//                     <div key={link.label} style={{ position: "relative" }}>
//                       <button
//                         type="button"
//                         style={{
//                           ...s.navLink,
//                           ...(active ? s.navLinkActive : {}),
//                         }}
//                         onClick={() => setOpenMenu(open ? null : link.label)}
//                         aria-haspopup="menu"
//                         aria-expanded={open}
//                       >
//                         {link.icon}
//                         {link.label}
//                         <ChevronDownIcon isOpen={open} />
//                       </button>
//                       {open && (
//                         <div style={s.submenuDropdown} role="menu">
//                           {children.map((sub) => (
//                             <Link
//                               key={sub.href}
//                               to={sub.href}
//                               role="menuitem"
//                               style={{
//                                 ...s.submenuItem,
//                                 ...(pathname === sub.href
//                                   ? s.submenuItemActive
//                                   : {}),
//                               }}
//                               className="submenu-item"
//                               onClick={() => setOpenMenu(null)}
//                             >
//                               {sub.label}
//                             </Link>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 }

//                 const active = isActive(link.href!);
//                 return (
//                   <Link
//                     key={link.href}
//                     to={link.href!}
//                     style={{ ...s.navLink, ...(active ? s.navLinkActive : {}) }}
//                   >
//                     {link.icon}
//                     {link.label}
//                   </Link>
//                 );
//               })}
//             </nav>

//             <div ref={accountRef} style={{ position: "relative" }}>
//               <button
//                 type="button"
//                 style={s.accountBtn}
//                 onClick={() => setAccountOpen(!accountOpen)}
//                 aria-label="Account menu"
//               >
//                 <AccountIcon />
//               </button>

//               {accountOpen && (
//                 <div style={s.dropdown}>
//                   <div style={s.dropHeader}>
//                     <p style={s.dropUsername}>{username || "Guest"}</p>
//                     <p
//                       style={{ margin: 0, fontSize: "12px", color: "#7C3AED" }}
//                     >
//                       {role?.toUpperCase()}
//                     </p>
//                   </div>
//                   <div style={s.dropBody}>
//                     {role === "admin" && (
//                       <Link
//                         to="/admin"
//                         style={{
//                           textDecoration: "none",
//                           color: "#7C3AED",
//                           display: "flex",
//                           alignItems: "center",
//                           gap: "8px",
//                           padding: "10px",
//                           backgroundColor: "#F5F3FF",
//                           borderRadius: "8px",
//                           fontSize: "13px",
//                           marginBottom: "8px",
//                         }}
//                         onClick={() => setAccountOpen(false)}
//                       >
//                         <ShieldIcon /> Manage Users
//                       </Link>
//                     )}
//                     <button
//                       type="button"
//                       style={s.dropLogout}
//                       onClick={handleLogout}
//                     >
//                       <LogoutIcon /> Logout
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <button
//               type="button"
//               className="header-mobile-btn"
//               style={s.mobileMenuBtn}
//               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//               aria-label="Toggle menu"
//             >
//               {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
//             </button>
//           </div>
//         </div>

//         {/* ─── Mobile Menu ─── */}
//         {mobileMenuOpen && (
//           <div style={s.mobileNav}>
//             {navLinks.map((link) => {
//               const children = link.children;

//               if (children) {
//                 const active = isChildActive(children);
//                 const open = mobileOpenGroup === link.label;
//                 return (
//                   <div key={link.label}>
//                     <button
//                       type="button"
//                       style={{
//                         ...s.mobileNavLink,
//                         ...(active ? s.mobileNavLinkActive : {}),
//                         width: "100%",
//                         background: active ? "#F5F3FF" : "none",
//                         border: "none",
//                         cursor: "pointer",
//                       }}
//                       onClick={() =>
//                         setMobileOpenGroup(open ? null : link.label)
//                       }
//                     >
//                       {link.icon}
//                       {link.label}
//                       <div style={{ marginLeft: "auto" }}>
//                         <ChevronDownIcon isOpen={open} />
//                       </div>
//                     </button>
//                     {open && (
//                       <div style={s.mobileSubmenuContainer}>
//                         {children.map((sub) => (
//                           <Link
//                             key={sub.href}
//                             to={sub.href}
//                             style={{
//                               ...s.mobileNavLink,
//                               ...(pathname === sub.href
//                                 ? s.mobileNavLinkActive
//                                 : {}),
//                               fontSize: "14px",
//                             }}
//                             onClick={() => setMobileMenuOpen(false)}
//                           >
//                             {sub.label}
//                           </Link>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 );
//               }

//               const active = isActive(link.href!);
//               return (
//                 <Link
//                   key={link.href}
//                   to={link.href!}
//                   style={{
//                     ...s.mobileNavLink,
//                     ...(active ? s.mobileNavLinkActive : {}),
//                   }}
//                   onClick={() => setMobileMenuOpen(false)}
//                 >
//                   {link.icon}
//                   {link.label}
//                 </Link>
//               );
//             })}
//           </div>
//         )}
//       </header>
//     </>
//   );
// }

import { useState, useRef, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── Types ──────────────────────────────────────────────────────────────
interface NavChild {
  href: string;
  label: string;
}
interface NavItem {
  label: string;
  href?: string;
  icon: ReactNode;
  children?: NavChild[];
}

// ─── Icons ──────────────────────────────────────────────────────────────
const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: "transform 0.2s ease",
      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
      marginLeft: "4px",
    }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const HomeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const ReportIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const UsersIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LogoutIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const AccountIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const MenuIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Header() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Which desktop dropdown is open (by group label) + which mobile group is expanded
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);

  // Track the last pathname we rendered with so we can reset route-specific
  // UI state during render (not in an effect).
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Reset route-specific UI state during rendering when the route changes.
  // This is React's recommended "adjusting state when a prop changes" pattern
  // and avoids the cascading render caused by setState inside useEffect.
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setOpenMenu(null);
    setAccountOpen(false);
    setMobileMenuOpen(false);
    setMobileOpenGroup(null);
  }

  const accountRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
      if (navRef.current && !navRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks: NavItem[] = [
    { href: "/home", label: "Home", icon: <HomeIcon /> },
    { href: "/analytics", label: "Analytics", icon: <AnalyticsIcon /> },

    {
      label: "Content Management",
      icon: <ReportIcon />,
      children: [
        { href: "/contentmanagement", label: "Slider Updates" },
        { href: "/dailyverse", label: "Daily Verse" },
        { href: "/walkwithjesus", label: "Walk with Jesus" },
        { href: "/liveupdates", label: "Live Updates" },
        { href: "/supabaseupload", label: "Video Content" },
        { href: "/eventupdates", label: "Event Updates" },
        { href: "/magazines", label: "Magazines" },
        { href: "/wrpc", label: "WRPC" },
        { href: "/revivalchurches", label: "Revival Churches" },
        { href: "/revivaltours", label: "Revival Tours" },
      ],
    },

    // Children section – separate from Content Management
    {
      label: "Children",
      icon: <UsersIcon />,
      children: [
        { href: "/attendance", label: "Attendance" },
        { href: "/addChild", label: "Add Child" },
        { href: "/childReport", label: "Child Report" },
        { href: "/childAnalytics", label: "Child Analytics" },
        { href: "/followUp", label: "Follow-up" },
      ],
    },

    ...(role === "admin"
      ? [{ href: "/report", label: "Report", icon: <ReportIcon /> } as NavItem]
      : []),
  ];

  const isActive = (href: string) => pathname?.startsWith(href);
  const isChildActive = (children: NavChild[]) =>
    children.some((child) => pathname === child.href);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/");
    }
  };

  const s: { [key: string]: CSSProperties } = {
    header: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #E9E4FF",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 8px rgba(124,58,237,0.06)",
    },
    inner: {
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "72px",
    },
    nav: { display: "flex", alignItems: "center", gap: "4px" },
    navLink: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "8px",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: 500,
      color: "#6B7280",
      transition: "all 0.15s ease",
      position: "relative",
      cursor: "pointer",
      border: "none",
      background: "none",
    },
    navLinkActive: { color: "#7C3AED", backgroundColor: "#F5F3FF" },

    submenuDropdown: {
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      width: "210px",
      backgroundColor: "#ffffff",
      border: "1px solid #E9E4FF",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(124,58,237,0.1)",
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      zIndex: 200,
    },
    submenuItem: {
      padding: "10px 12px",
      borderRadius: "6px",
      fontSize: "13.5px",
      textDecoration: "none",
      color: "#4B5563",
      transition: "all 0.15s",
    },
    submenuItemActive: {
      backgroundColor: "#F5F3FF",
      color: "#7C3AED",
      fontWeight: 600,
    },

    mobileSubmenuContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      paddingLeft: "32px",
      marginTop: "4px",
      borderLeft: "2px solid #F3F4F6",
      marginLeft: "24px",
    },

    brand: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      textDecoration: "none",
    },
    logoBox: {
      width: "44px",
      height: "44px",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    brandTitle: {
      fontSize: "17px",
      fontWeight: 700,
      color: "#7C3AED",
      margin: 0,
    },
    brandSub: { fontSize: "12px", color: "#9CA3AF", margin: 0 },
    rightSection: { display: "flex", alignItems: "center", gap: "20px" },
    accountBtn: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ffffff",
      boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 12px)",
      right: 0,
      width: "260px",
      backgroundColor: "#ffffff",
      border: "1px solid #E9E4FF",
      borderRadius: "14px",
      boxShadow: "0 8px 32px rgba(124,58,237,0.12)",
      overflow: "hidden",
      zIndex: 200,
    },
    dropHeader: {
      padding: "16px 18px",
      background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
      borderBottom: "1px solid #E9E4FF",
    },
    dropUsername: {
      fontSize: "15px",
      fontWeight: 700,
      color: "#1F2937",
      margin: 0,
    },
    dropBody: { padding: "12px 18px" },
    dropLogout: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 14px",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: 600,
      color: "#EF4444",
      border: "none",
      cursor: "pointer",
      width: "100%",
      background: "none",
    },
    mobileNav: {
      backgroundColor: "#ffffff",
      borderTop: "1px solid #E9E4FF",
      padding: "16px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxHeight: "calc(100vh - 72px)",
      overflowY: "auto",
    },
    mobileNavLink: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 16px",
      borderRadius: "10px",
      textDecoration: "none",
      fontSize: "15px",
      fontWeight: 500,
      color: "#6B7280",
    },
    mobileNavLinkActive: { color: "#7C3AED", backgroundColor: "#F5F3FF" },
    mobileMenuBtn: {
      display: "none",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#374151",
    },
  };

  return (
    <>
      <style>{`
        .submenu-item:hover { background-color: #F9FAFB; color: #7C3AED; }
        .header-nav-desktop { display: flex !important; }
        .header-mobile-btn { display: none !important; }
        @media (max-width: 1024px) {
          .header-nav-desktop { display: none !important; }
          .header-mobile-btn { display: flex !important; }
        }
      `}</style>

      <header style={s.header}>
        <div style={s.inner}>
          <Link to="/" style={s.brand}>
            <div style={s.logoBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="8" r="3" stroke="white" strokeWidth="1.8" />
                <path
                  d="M2 20c0-3.314 2.686-5 6-5h4c3.314 0 6 1.686 6 5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <p style={s.brandTitle}>JR App Management</p>
              <p style={s.brandSub}>User Details System</p>
            </div>
          </Link>

          <div style={s.rightSection}>
            <nav style={s.nav} className="header-nav-desktop" ref={navRef}>
              {navLinks.map((link) => {
                const children = link.children;

                if (children) {
                  const active = isChildActive(children);
                  const open = openMenu === link.label;
                  return (
                    <div key={link.label} style={{ position: "relative" }}>
                      <button
                        type="button"
                        style={{
                          ...s.navLink,
                          ...(active ? s.navLinkActive : {}),
                        }}
                        onClick={() => setOpenMenu(open ? null : link.label)}
                        aria-haspopup="menu"
                        aria-expanded={open}
                      >
                        {link.icon}
                        {link.label}
                        <ChevronDownIcon isOpen={open} />
                      </button>
                      {open && (
                        <div style={s.submenuDropdown} role="menu">
                          {children.map((sub) => (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              role="menuitem"
                              style={{
                                ...s.submenuItem,
                                ...(pathname === sub.href
                                  ? s.submenuItemActive
                                  : {}),
                              }}
                              className="submenu-item"
                              onClick={() => setOpenMenu(null)}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(link.href!);
                return (
                  <Link
                    key={link.href}
                    to={link.href!}
                    style={{ ...s.navLink, ...(active ? s.navLinkActive : {}) }}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div ref={accountRef} style={{ position: "relative" }}>
              <button
                type="button"
                style={s.accountBtn}
                onClick={() => setAccountOpen(!accountOpen)}
                aria-label="Account menu"
              >
                <AccountIcon />
              </button>

              {accountOpen && (
                <div style={s.dropdown}>
                  <div style={s.dropHeader}>
                    <p style={s.dropUsername}>{username || "Guest"}</p>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#7C3AED" }}
                    >
                      {role?.toUpperCase()}
                    </p>
                  </div>
                  <div style={s.dropBody}>
                    {role === "admin" && (
                      <Link
                        to="/admin"
                        style={{
                          textDecoration: "none",
                          color: "#7C3AED",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px",
                          backgroundColor: "#F5F3FF",
                          borderRadius: "8px",
                          fontSize: "13px",
                          marginBottom: "8px",
                        }}
                        onClick={() => setAccountOpen(false)}
                      >
                        <ShieldIcon /> Manage Users
                      </Link>
                    )}
                    <button
                      type="button"
                      style={s.dropLogout}
                      onClick={handleLogout}
                    >
                      <LogoutIcon /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="header-mobile-btn"
              style={s.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Menu ─── */}
        {mobileMenuOpen && (
          <div style={s.mobileNav}>
            {navLinks.map((link) => {
              const children = link.children;

              if (children) {
                const active = isChildActive(children);
                const open = mobileOpenGroup === link.label;
                return (
                  <div key={link.label}>
                    <button
                      type="button"
                      style={{
                        ...s.mobileNavLink,
                        ...(active ? s.mobileNavLinkActive : {}),
                        width: "100%",
                        background: active ? "#F5F3FF" : "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setMobileOpenGroup(open ? null : link.label)
                      }
                    >
                      {link.icon}
                      {link.label}
                      <div style={{ marginLeft: "auto" }}>
                        <ChevronDownIcon isOpen={open} />
                      </div>
                    </button>
                    {open && (
                      <div style={s.mobileSubmenuContainer}>
                        {children.map((sub) => (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            style={{
                              ...s.mobileNavLink,
                              ...(pathname === sub.href
                                ? s.mobileNavLinkActive
                                : {}),
                              fontSize: "14px",
                            }}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(link.href!);
              return (
                <Link
                  key={link.href}
                  to={link.href!}
                  style={{
                    ...s.mobileNavLink,
                    ...(active ? s.mobileNavLinkActive : {}),
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}

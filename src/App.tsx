
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Lazy-load pages so they are downloaded when needed
const Login = lazy(() => import("./pages/Login"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AddChild = lazy(() => import("./pages/AddChild"));
const ChildReports = lazy(() => import("./pages/ChildReports"));
const ChildAnalytics = lazy(() => import("./pages/ChildAnalytics"));
const Followup = lazy(() => import("./pages/Followup"));
const Staff = lazy(() => import("./pages/Staff"));

function App() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            fontSize: "16px",
          }}
        >
          Loading page...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/addChild" element={<AddChild />} />
        <Route path="/childReport" element={<ChildReports />} />
        <Route path="/childAnalytics" element={<ChildAnalytics />} />
        <Route path="/followup" element={<Followup />} />
        <Route path="/staff" element={<Staff />} />
      </Routes>
    </Suspense>
  );
}

export default App;

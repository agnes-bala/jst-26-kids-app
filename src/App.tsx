import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Analytics from "./pages/Analytics";
// import UserReports from "./pages/UserReports";
import Report from "./pages/Report";
import Admin from "./pages/Admin";
import ReportHistory from "./pages/ReportHistory";
import UploadSlider from "./pages/Contentmanagement";
import DailyVerse from "./pages/Dailyverse";
import WalkwithJesus from "./pages/Walkwithjesusupload";
import MagazineManagement from "./pages/Magazineupdates";
import EventsUpdate from "./pages/Eventupdates";
import BranchAddressUpdate from "./pages/WRPC";
import UploadPage from "./pages/supabaseupload";
import RevivalChurches from "./pages/Revivalchurches";
import Attendance from "./pages/Attendance";
import AddChild from "./pages/AddChild";
import ChildReports from "./pages/ChildReports";
import ChildAnalytics from "./pages/ChildAnalytics";
import Followup from "./pages/Followup";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/contentmanagement" element={<UploadSlider />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/dailyverse" element={<DailyVerse />} />
      <Route path="/walkwithjesus" element={<WalkwithJesus />} />
      <Route path="/magazines" element={<MagazineManagement />} />
      <Route path="/report" element={<Report />} />
      <Route path="/wrpc" element={<BranchAddressUpdate />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/supabaseupload" element={<UploadPage />} />
      <Route path="/eventupdates" element={<EventsUpdate />} />
      <Route path="/report-history" element={<ReportHistory />} />
      <Route path="/revivalchurches" element={<RevivalChurches />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/addChild" element={<AddChild />} />
      <Route path="/childReport" element={<ChildReports />} />
      <Route path="/childAnalytics" element={<ChildAnalytics />} />
      <Route path="/followup" element={<Followup />} />
    </Routes>
  );
}

export default App;

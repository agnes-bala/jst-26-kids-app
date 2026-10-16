import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Attendance from "./pages/Attendance";
import AddChild from "./pages/AddChild";
import ChildReports from "./pages/ChildReports";
import ChildAnalytics from "./pages/ChildAnalytics";
import Followup from "./pages/Followup";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/addChild" element={<AddChild />} />
      <Route path="/childReport" element={<ChildReports />} />
      <Route path="/childAnalytics" element={<ChildAnalytics />} />
      <Route path="/followup" element={<Followup />} />
    </Routes>
  );
}

export default App;

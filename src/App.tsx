import { BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import MyClubsPage from "./pages/Dashboard/MyClubsPage";
import ClubDetailPage from "./pages/Dashboard/ClubDetailPage";
import { AdminPanel } from "./pages/Dashboard/AdminPanel";
import { TeacherPanel } from "./pages/Dashboard/TeacherPanel";
import { ParentPanel } from "./pages/Dashboard/ParentPanel";
import StudentPanel from "./pages/Dashboard/StudentPanel";
import OdevlerPage from "./pages/Dashboard/OdevlerPage";
import { LoginPage } from "./pages/LoginPage";
import DersProgramiPage from "./pages/Dashboard/DersProgramiPage";
import DuyurularPage from "./pages/Dashboard/DuyurularPage";
import NotlarPage from "./pages/Dashboard/NotlarPage";
import AdminNotEklePage from "./pages/Dashboard/AdminNotEklePage";
import JoinClubPage from "./pages/JoinClubPage";
import ClubRequestsPage from "./pages/Dashboard/ClubRequestsPage";
import ClubMembersPage from "./pages/Dashboard/ClubMembersPage";
import AdminClubsPage from "./pages/Dashboard/AdminClubsPage";
import { AnimatePresence } from 'framer-motion';

function App() {
  
  return (
    <Router>
      <Routes>
        {/* Giriş yönlendirmeleri */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/teacher" element={<TeacherPanel />} />
        <Route path="/dashboard/teacher" element={<Navigate to="/teacher" replace />} />
        <Route path="/parent" element={<ParentPanel />} />
        <Route path="/dashboard/parent" element={<Navigate to="/parent" replace />} />
        <Route path="/student" element={<StudentPanel />} />
        <Route path="/dashboard/student" element={<Navigate to="/student" replace />} />

        {/* Ödevler */}
        <Route path="/admin/odevler" element={<OdevlerPage />} />
        <Route path="/teacher/odevler" element={<OdevlerPage />} />
        <Route path="/parent/odevler" element={<OdevlerPage />} />
        <Route path="/student/odevler" element={<OdevlerPage />} />

        {/* Ders Programı */}
        <Route path="/teacher/ders-programi" element={<DersProgramiPage />} />
        <Route path="/parent/ders-programi" element={<DersProgramiPage />} />
        <Route path="/student/ders-programi" element={<DersProgramiPage />} />

        {/* Duyurular */}
        <Route path="/admin/duyurular" element={<DuyurularPage />} />
        <Route path="/teacher/duyurular" element={<DuyurularPage />} />
        <Route path="/parent/duyurular" element={<DuyurularPage />} />
        <Route path="/student/duyurular" element={<DuyurularPage />} />

        {/* Notlar */}
        <Route path="/student/notlar" element={<NotlarPage />} />
        <Route path="/parent/notlar" element={<NotlarPage />} />
        <Route path="/admin/not-ekle" element={<AdminNotEklePage />} />
        <Route path="/teacher/not-ekle" element={<AdminNotEklePage />} />

        {/* Kulüp Katılım */}
        <Route path="/katil/:clubId" element={<JoinClubPage />} />

        {/* Kulüp İstekleri ve Üyeler */}
        <Route path="/teacher/kulup-istekleri" element={<ClubRequestsPage />} />
        <Route path="/teacher/kulup/:clubId/uyeler" element={<ClubMembersPage />} />

        {/* Kulüpler (Liste) */}
        <Route path="/student/kulupler" element={<MyClubsPage />} />
        <Route path="/teacher/kulupler" element={<MyClubsPage />} />
        <Route path="/admin/kulupler" element={<AdminClubsPage />} />

        {/* Kulüpler (Detay) */}
        <Route path="/student/kulupler/:clubId" element={<ClubDetailPage />} />
        <Route path="/teacher/kulupler/:clubId" element={<ClubDetailPage />} />
        <Route path="/admin/kulupler/:clubId" element={<ClubDetailPage />} />

      </Routes>
    </Router>
  );
}

export default App;

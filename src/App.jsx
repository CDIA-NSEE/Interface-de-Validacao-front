import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage.jsx";
import ExamReviewPage from "./pages/ExamReviewPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/exams/:id" element={<ExamReviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


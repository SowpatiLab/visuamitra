import { Routes, Route } from "react-router-dom";
import VCFInputPanel from "./components/VCFInputPanel";
import Viewer from "./components/Viewer";
import LandingPage from "./components/LandingPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<VCFInputPanel />} />
        <Route path="/viewer" element={<Viewer />} />
      </Routes>
    </>
  );
}
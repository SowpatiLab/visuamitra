import { Routes, Route } from "react-router-dom";
import VCFInputPanel from "./components/VCFInputPanel";
import VisuaMiTRaViewer from "./components/VisuaMiTRaViewer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VCFInputPanel />} />
      <Route path="/viewer" element={<VisuaMiTRaViewer />} />
    </Routes>
  );
}

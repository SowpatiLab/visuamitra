import { Routes, Route } from "react-router-dom";
import VCFInputPanel from "./components/VCFInputPanel";
import VisuaMiTRaViewer from "./components/VisuaMiTRaViewer";
import Viewer from "./components/Viewer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VCFInputPanel />} />
      <Route path="/viewer" element={<Viewer />} />
    </Routes>
  );
}

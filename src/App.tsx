import { Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import SendMoney from "./pages/SendMoney";
import SendAmountPage from "./pages/SendAmountPage";
import QRCodePage from "./pages/QRCodePage";
import History from "./pages/History";
import ScanPage from "./pages/ScanPage";
import Profile from "./pages/Profile";

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Home />} />
      <Route path="/send" element={<SendMoney />} />
      <Route path="/send-amount" element={<SendAmountPage />} />
      <Route path="/qrcode" element={<QRCodePage />} />
      <Route path="/history" element={<History />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
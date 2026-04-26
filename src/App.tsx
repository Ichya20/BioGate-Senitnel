import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScannerUI from './components/ScannerUI';
import SecretVault from './components/SecretVault';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman pertama yang muncul (Scanner) */}
        <Route path="/" element={<ScannerUI />} />
        
        {/* Halaman rahasia setelah berhasil masuk */}
        <Route path="/secret-vault" element={<SecretVault />} />
      </Routes>
    </BrowserRouter>
  );
}
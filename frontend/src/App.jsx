import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Houses from './pages/Houses';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import RoomForm from './pages/RoomForm';
import Tenants from './pages/Tenants';
import TenantForm from './pages/TenantForm';
import TenantDetail from './pages/TenantDetail';
import Finance from './pages/Finance';
import BillDetail from './pages/BillDetail';
import PaymentForm from './pages/PaymentForm';
import More from './pages/More';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Password from './pages/Password';
import HouseSettings from './pages/HouseSettings';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            {/* Auth & House Selection */}
            <Route path="/login" element={<Login />} />
            <Route path="/pilih-rumah" element={<Houses />} />

            {/* Main App */}
            <Route path="/" element={<Home />} />

            {/* Kamar */}
            <Route path="/kamar" element={<Rooms />} />
            <Route path="/kamar/tambah" element={<RoomForm />} />
            <Route path="/kamar/:roomNum" element={<RoomDetail />} />
            <Route path="/kamar/:roomNum/edit" element={<RoomForm />} />

            {/* Penghuni */}
            <Route path="/penghuni" element={<Tenants />} />
            <Route path="/penghuni/tambah" element={<TenantForm />} />
            <Route path="/penghuni/:id" element={<TenantDetail />} />

            {/* Keuangan */}
            <Route path="/keuangan" element={<Finance />} />
            <Route path="/keuangan/tagihan/:id" element={<BillDetail />} />
            <Route path="/keuangan/tagihan/:id/bayar" element={<PaymentForm />} />

            {/* Lainnya */}
            <Route path="/lainnya" element={<More />} />
            <Route path="/laporan" element={<Report />} />
            <Route path="/pengaturan" element={<Settings />} />
            <Route path="/pengaturan/profil" element={<Profile />} />
            <Route path="/pengaturan/password" element={<Password />} />
            <Route path="/pengaturan/rumah/:index" element={<HouseSettings />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import { SkeletonLoader } from './components/StateComponents';

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

// Layar tunggu selama token tersimpan sedang diverifikasi ke backend.
function AuthSplash() {
  return (
    <div className="px-[18px] pt-[28px]">
      <SkeletonLoader />
    </div>
  );
}

// Route yang wajib login. Tanpa token valid → diarahkan ke /login.
function RequireAuth({ children }) {
  const { isLoggedIn, authReady } = useApp();
  const location = useLocation();

  if (!authReady) return <AuthSplash />;
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return children;
}

// /login hanya untuk yang belum login.
function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn, authReady } = useApp();

  if (!authReady) return <AuthSplash />;
  if (isLoggedIn) return <Navigate to="/pilih-rumah" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            {/* Auth & House Selection */}
            <Route
              path="/login"
              element={
                <RedirectIfLoggedIn>
                  <Login />
                </RedirectIfLoggedIn>
              }
            />
            <Route
              path="/pilih-rumah"
              element={
                <RequireAuth>
                  <Houses />
                </RequireAuth>
              }
            />

            {/* Main App */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />

            {/* Kamar */}
            <Route
              path="/kamar"
              element={
                <RequireAuth>
                  <Rooms />
                </RequireAuth>
              }
            />
            <Route
              path="/kamar/tambah"
              element={
                <RequireAuth>
                  <RoomForm />
                </RequireAuth>
              }
            />
            <Route
              path="/kamar/:roomNum"
              element={
                <RequireAuth>
                  <RoomDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/kamar/:roomNum/edit"
              element={
                <RequireAuth>
                  <RoomForm />
                </RequireAuth>
              }
            />

            {/* Penghuni */}
            <Route
              path="/penghuni"
              element={
                <RequireAuth>
                  <Tenants />
                </RequireAuth>
              }
            />
            <Route
              path="/penghuni/tambah"
              element={
                <RequireAuth>
                  <TenantForm />
                </RequireAuth>
              }
            />
            <Route
              path="/penghuni/:id"
              element={
                <RequireAuth>
                  <TenantDetail />
                </RequireAuth>
              }
            />

            {/* Keuangan */}
            <Route
              path="/keuangan"
              element={
                <RequireAuth>
                  <Finance />
                </RequireAuth>
              }
            />
            <Route
              path="/keuangan/tagihan/:id"
              element={
                <RequireAuth>
                  <BillDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/keuangan/tagihan/:id/bayar"
              element={
                <RequireAuth>
                  <PaymentForm />
                </RequireAuth>
              }
            />

            {/* Lainnya */}
            <Route
              path="/lainnya"
              element={
                <RequireAuth>
                  <More />
                </RequireAuth>
              }
            />
            <Route
              path="/laporan"
              element={
                <RequireAuth>
                  <Report />
                </RequireAuth>
              }
            />
            <Route
              path="/pengaturan"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/pengaturan/profil"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/pengaturan/password"
              element={
                <RequireAuth>
                  <Password />
                </RequireAuth>
              }
            />
            <Route
              path="/pengaturan/rumah/:index"
              element={
                <RequireAuth>
                  <HouseSettings />
                </RequireAuth>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}

import React from 'react';
import { useApp } from '../context/AppContext';
import BottomNavigation from '../components/BottomNavigation';
import PrototypeBar from '../components/PrototypeBar';
import { SheetOverlay, Toast } from '../components/StateComponents';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { sheetContent, closeSheet, toastMsg, toastVisible, isLoggedIn } = useApp();
  const location = useLocation();

  const noNavRoutes = ['/login', '/pilih-rumah'];
  const showNav = isLoggedIn && !noNavRoutes.includes(location.pathname);

  return (
    <div className="bg-bg text-ink font-sans min-h-screen">
      <div
        id="app"
        className={`max-w-[480px] mx-auto min-h-screen pb-[96px] md:max-w-none ${showNav ? 'md:pl-[230px]' : ''} md:pb-[40px]`}
      >
        <PrototypeBar />
        <div className="max-w-full md:max-w-[640px] md:mx-auto">
          {children}
        </div>
      </div>

      {showNav && <BottomNavigation />}
      <SheetOverlay onClose={closeSheet}>{sheetContent}</SheetOverlay>
      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}

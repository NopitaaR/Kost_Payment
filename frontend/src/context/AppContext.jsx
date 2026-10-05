import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import { getToken, setOnSessionExpired } from '../api/client';
import * as billsApi from '../api/bills';

const AppContext = createContext();

const INITIAL_HOUSES = [
  { n: 'Rumah 1' },
  { n: 'Rumah 2', k: 8, t: 6 },
  { n: 'Rumah 3', k: 12, t: 10 },
];

const INITIAL_ROOMS = [
  { n: '01', p: 800000, note: '' },
  { n: '02', p: 700000, note: '' },
  { n: '03', p: 1000000, note: 'Ada kamar mandi dalam' },
  { n: '04', p: 700000, note: '' },
  { n: '05', p: 750000, note: '' },
];

const INITIAL_TENANTS = [
  { id: 1, name: 'Andi', room: '01', hp: '0812-3456-7801', addr: 'Binjai', job: 'Karyawan', in: '2026-01-20', st: 'Aktif', ktp: 'ktp-andi.jpg' },
  { id: 2, name: 'Budi Santoso', room: '01', hp: '0813-9988-2210', addr: 'Medan', job: 'Mahasiswa', in: '2026-01-20', st: 'Aktif', ktp: 'ktp-budi.jpg' },
  { id: 3, name: 'Sari', room: '03', hp: '0821-7000-1122', addr: 'Pematangsiantar', job: 'Perawat', in: '2026-08-25', st: 'Aktif', ktp: 'ktp-sari.jpg' },
  { id: 4, name: 'Dewi', room: '04', hp: '0857-1200-3344', addr: 'Tebing Tinggi', job: 'Guru', in: '2026-09-28', st: 'Aktif', ktp: 'ktp-dewi.jpg' },
  { id: 5, name: 'Rina', room: '05', hp: '0852-6677-8899', addr: 'Kisaran', job: 'Mahasiswa', in: '2026-05-01', st: 'Aktif', ktp: 'ktp-rina.jpg' },
  { id: 6, name: 'Joko', room: '02', hp: '0811-2233-4455', addr: 'Lubuk Pakam', job: 'Karyawan', in: '2026-01-20', st: 'Keluar', out: '2026-06-30', ktp: 'ktp-joko.jpg' },
];

export const TODAY = new Date('2026-10-04');

export const rp = (n) => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');

export const fd = (i) => {
  if (!i) return '';
  return new Date(i).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const paid = (b) => {
  if (b.totalPaid !== undefined) return b.totalPaid;
  return (b.pay || []).reduce((a, p) => a + (p.amt || 0), 0);
};

export const left = (b) => {
  if (b.remaining !== undefined) return b.remaining;
  return (b.amt || 0) - paid(b);
};

export const st = (b) => {
  if (b.status !== undefined) return b.status;
  if (paid(b) >= (b.amt || 0)) return 'LUNAS';
  if (new Date((b.due || 0)) < TODAY) return 'TERLAMBAT';
  if (paid(b) > 0) return 'SEBAGIAN';
  return 'BELUM_BAYAR';
};

export const LB = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum bayar', TERLAMBAT: 'Terlambat' };
export const CL = { LUNAS: 'ok', SEBAGIAN: 'warn', BELUM_BAYAR: 'gray', TERLAMBAT: 'bad' };

// Format period from two date strings (YYYY-MM-DD) to "DD MMM YYYY – DD MMM YYYY"
// Example: "2026-09-20" and "2026-10-20" => "20 Sep 2026 – 20 Oct 2026"
export const formatPeriod = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('id-ID', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };
  return `${formatDate(start)} – ${formatDate(end)}`;
};

export function AppProvider({ children }) {
  // ===== AUTHENTICATION (Phase 3A) =====
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activePropertyId, _setActivePropertyId] = useState(
    () => localStorage.getItem('kost.activePropertyId') || null
  );
  const setActivePropertyId = (id) => {
    _setActivePropertyId(id);
    if (id) {
      localStorage.setItem('kost.activePropertyId', id);
    } else {
      localStorage.removeItem('kost.activePropertyId');
    }
  };
  const isLoggedIn = !!user;

  // Sesi hangus (401/403 dari API) → bersihkan state user.
  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    return () => setOnSessionExpired(null);
  }, []);

  // Bootstrap: validasi token tersimpan saat aplikasi dibuka / browser di-refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        const me = await authApi.getMe();
        if (!cancelled) {
          setUser(me);
          if (me) setOwner({ name: me.name, email: me.email, hp: me.phone || '' });
        }
      } catch (err) {
        // Token invalid/expired. Sesi token sudah dibersihkan oleh API client.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== END AUTHENTICATION =====

  const [selectedHouse, setSelectedHouse] = useState('Rumah 1');
  const [houses, setHouses] = useState(INITIAL_HOUSES);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [bills, setBills] = useState([]);
  const [owner, setOwner] = useState(INITIAL_OWNER);

  const login = async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await authApi.login(email, password);
      setUser(result.user);
      if (result.user) {
        setOwner({
          name: result.user.name,
          email: result.user.email,
          hp: result.user.phone || '',
        });
      }
      return true;
    } catch (err) {
      setAuthError(err.message || 'Login gagal.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setSelectedHouse(null);
    setActivePropertyId(null);
  };

  // Prototype UI Testing State: 'normal', 'empty', 'loading', 'error'
  const [mode, setMode] = useState('normal');

  // Overlay / Modal / Sheet state
  const [sheetContent, setSheetContent] = useState(null);

  // Toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2400);
  };

  const closeSheet = () => {
    setSheetContent(null);
  };

  const openSheet = (content) => {
    setSheetContent(content);
  };

  const confirmDialog = (title, body, okText, onConfirm, cls = 'bad') => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">{title}</h3>
        <p className="text-mute text-sm mb-4" dangerouslySetInnerHTML={{ __html: body }}></p>
        <div className="flex gap-[10px] mt-[14px]">
          <button
            className="flex-1 border border-line bg-card rounded-[14px] p-[14px] font-bold text-ink"
            onClick={closeSheet}
          >
            Batal
          </button>
          <button
            className={`flex-1 border-0 rounded-[14px] p-[14px] font-bold text-white ${
              cls === 'bad' ? 'bg-bad' : 'bg-brand text-on-brand'
            }`}
            onClick={() => {
              closeSheet();
              onConfirm();
            }}
          >
            {okText}
          </button>
        </div>
      </div>
    );
  };

  // Helper selectors
  const getActiveTenantsByRoom = (roomNum) => {
    return tenants.filter((t) => t.room === roomNum && t.st === 'Aktif');
  };

  const getTenantNameByRoom = (roomNum) => {
    const active = getActiveTenantsByRoom(roomNum);
    return active.map((t) => t.name.split(' ')[0]).join(' & ') || '—';
  };

  const getUnpaidBills = () => {
    return bills.filter((b) => st(b) !== 'LUNAS');
  };

  const saveRoom = (oldNum, roomData) => {
    const { n, p, note } = roomData;
    if (oldNum) {
      setRooms((prev) =>
        prev.map((r) => (r.n === oldNum ? { ...r, n, p, note } : r))
      );
      if (n !== oldNum) {
        setTenants((prev) =>
          prev.map((t) => (t.room === oldNum ? { ...t, room: n } : t))
        );
        setBills((prev) =>
          prev.map((b) => (b.room === oldNum ? { ...b, room: n } : b))
        );
      }
    } else {
      setRooms((prev) => [...prev, { n, p, note }]);
    }
    showToast('Kamar disimpan');
  };

  const deleteRoom = (roomNum) => {
    const hasTenant = tenants.some((t) => t.room === roomNum);
    const hasBill = bills.some((b) => b.room === roomNum);
    if (hasTenant || hasBill) {
      showToast('Kamar punya riwayat, tidak bisa dihapus');
      return false;
    }
    confirmDialog(
      `Hapus Kamar ${roomNum}?`,
      'Kamar ini belum punya penghuni atau tagihan.',
      'Ya, hapus',
      () => {
        setRooms((prev) => prev.filter((r) => r.n !== roomNum));
        showToast('Kamar dihapus');
      }
    );
    return true;
  };

  const addTenant = (tenantData) => {
    const newId = tenants.length ? Math.max(...tenants.map((t) => t.id)) + 1 : 1;
    setTenants((prev) => [...prev, { id: newId, ...tenantData, st: 'Aktif' }]);
    showToast('Penghuni disimpan');
  };

  const moveTenant = (id, newRoom) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, room: newRoom } : t))
    );
    showToast('Penghuni dipindahkan');
  };

  const exitTenant = (id, exitDate) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, st: 'Keluar', out: exitDate } : t))
    );
    showToast('Penghuni ditandai keluar');
  };

  const savePayment = (billId, paymentData) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === billId) {
          const newPay = [...b.pay, paymentData];
          const updatedBill = { ...b, pay: newPay };
          if (left(updatedBill) <= 0) {
            showToast('Pembayaran disimpan · Lunas');
          } else {
            showToast('Pembayaran disimpan');
          }
          return updatedBill;
        }
        return b;
      })
    );
  };

  const deletePayment = (billId, payIndex) => {
    const b = bills.find((x) => x.id === billId);
    if (!b) return;
    const p = b.pay[payIndex];
    confirmDialog(
      'Hapus pembayaran?',
      `Pembayaran ${rp(p.amt)} (${p.m}, ${fd(p.d)}) untuk Kamar ${b.room} akan dihapus. Sisa tagihan akan bertambah dan status tagihan bisa berubah.`,
      'Ya, hapus',
      () => {
        setBills((prev) =>
          prev.map((item) => {
            if (item.id === billId) {
              const newPay = [...item.pay];
              newPay.splice(payIndex, 1);
              return { ...item, pay: newPay };
            }
            return item;
          })
        );
        showToast('Pembayaran dihapus');
      }
    );
  };

  const updateOwner = (newOwner) => {
    setOwner(newOwner);
    showToast('Profil disimpan');
  };

  const updateHouseName = (index, newName) => {
    setHouses((prev) =>
      prev.map((h, i) => (i === index ? { ...h, n: newName } : h))
    );
    if (selectedHouse === houses[index].n) {
      setSelectedHouse(newName);
    }
    showToast('Nama rumah disimpan');
  };

  // Fetch bills dari API berdasarkan activePropertyId
  const fetchBills = async () => {
    if (!activePropertyId) {
      setBills([]);
      return;
    }
    try {
      setMode('loading');
      const data = await billsApi.getBills(activePropertyId);
      // Backend returns { success: true, data: [...] }
      if (data && data.success) {
        // Transform API bill objects to match expected shape for UI components
        const transformed = data.data.map((bill) => ({
          ...bill,
          // UI expects room as string (room number)
          room: bill.room ? bill.room.roomNumber : null,
          // UI expects amt as number
          amt: bill.amount,
          // UI expects due as date string (YYYY-MM-DD)
          due: bill.dueDate,
          // UI expects perio as formatted string like "20 Sep – 20 Okt 2026"
          per: bill.periodStart && bill.periodEnd
            ? formatPeriod(bill.periodStart, bill.periodEnd)
            : null,
          // Keep totalPaid, remaining, status for helper functions
          // Note: pay array is not included in list; we leave it empty.
          // Helper functions will use totalPaid and remaining if present.
          pay: [],
        }));
        setBills(transformed);
        setMode('normal');
      } else {
        setBills([]);
        setMode('error');
      }
    } catch (err) {
      console.error('Gagal mengambil tagihan:', err);
      setBills([]);
      setMode('error');
    }
  };
   const fetchBillDetail = async (propertyId, billId) => {
     if (!propertyId || !billId) return;
     try {
       const data = await billsApi.getBill(propertyId, billId);
       if (data && data.success) {
         setBills(prev => prev.map(b => b.id === billId ? data.data : b));
       }
     } catch (err) {
       console.error('Gagal mengambil detail tagihan:', err);
     }
   };


  // Fetch bills ketika activePropertyId berubah atau user login
  useEffect(() => {
    if (isLoggedIn) {
      fetchBills();
    }
  }, [activePropertyId, isLoggedIn]);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        user,
        authReady,
        authLoading,
        authError,
        login,
        logout,
        activePropertyId,
        setActivePropertyId,
        selectedHouse,
        setSelectedHouse,
        houses,
        setHouses,
        rooms,
        setRooms,
        tenants,
        setTenants,
        bills,
        setBills,
        owner,
        setOwner,
        mode,
        setMode,
        sheetContent,
        setSheetContent,
        openSheet,
        closeSheet,
        toastMsg,
        toastVisible,
        showToast,
        confirmDialog,
        getActiveTenantsByRoom,
        getTenantNameByRoom,
        getUnpaidBills,
        saveRoom,
        deleteRoom,
        addTenant,
        moveTenant,
        exitTenant,
        savePayment,
        deletePayment,
        updateOwner,
        updateHouseName,
         fetchBillDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

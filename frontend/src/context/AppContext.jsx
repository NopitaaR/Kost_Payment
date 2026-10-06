import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { getToken, setOnSessionExpired } from '../api/client';
import * as billsApi from '../api/bills';
import * as propertiesApi from '../api/properties';
import * as roomsApi from '../api/rooms';
import * as tenantsApi from '../api/tenants';

const AppContext = createContext();

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

  // Login function
  const login = async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await authApi.login(email, password);
      setUser(result.user || result);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Login gagal. Periksa email dan password.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authApi.logout();
    setUser(null);
    setActivePropertyId(null);
  };

  // ===== END AUTHENTICATION =====

  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [bills, setBills] = useState([]);
  const [owner, setOwner] = useState({ name: '', email: '', hp: '' });

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

  const updateHouseName = (propertyId, newName) => {
    setHouses((prev) =>
      prev.map((h) => (h._id === propertyId ? { ...h, n: newName } : h))
    );
    showToast('Nama rumah disimpan');
  };

  // Fetch bills dari API berdasarkan activePropertyId
  const fetchBills = async () => {
    if (!activePropertyId) {
      setBills([]);
      return;
    }
    const propertyId = activePropertyId;
    try {
      const data = await billsApi.getBills(propertyId);
      // api/bills.js#getBills sudah mengembalikan { success, data } dalam bentuk UI
      // (room = nomor kamar string, amt, due, per, pay). Jangan transform ulang di sini.
      if (data && data.success) {
        if (propertyId === activePropertyId) {
          setBills(data.data);
        }
      } else {
        if (propertyId === activePropertyId) {
          setBills([]);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil tagihan:', err);
      if (activePropertyId === propertyId) {
        setBills([]);
      }
    }
  };

  // fetchBillDetail distabilkan dengan useCallback agar identitasnya tidak berubah
  // setiap render; kalau tidak, effect di BillDetail akan memicu fetch tanpa henti.
  const fetchBillDetail = useCallback(async (propertyId, billId) => {
    if (!propertyId || !billId) return;
    try {
      const data = await billsApi.getBill(propertyId, billId);
      if (data && data.success) {
        // data.data sudah berbentuk UI (room string, amt, due, per, pay),
        // jadi aman menggantikan entri hasil fetchBills.
        setBills((prev) => {
          const key = String(billId);
          const exists = prev.some((b) => String(b.id) === key);
          if (!exists) {
            // Membuka /keuangan/tagihan/:id langsung (refresh / deep link):
            // tambahkan detail ke daftar agar halaman tetap punya data.
            return [...prev, data.data];
          }
          return prev.map((b) => (String(b.id) === key ? data.data : b));
        });
      }
    } catch (err) {
      console.error('Gagal mengambil detail tagihan:', err);
    }
  }, []);

  // Fetch houses (properties) dari API
  const fetchHouses = async () => {
    try {
      const data = await propertiesApi.getProperties();
      // propertiesApi.getProperties() sudah mengembalikan array data (payload.data).
      if (Array.isArray(data)) {
        // Transform API property objects to match expected shape for houses state
        // API: [{ id, name, totalRooms, filledRooms, emptyRooms, activeTenants }]
        // State expects: [{ n: name, k: totalRooms, t: activeTenants }]
        const transformed = data.map((property) => ({
          n: property.name,
          k: property.totalRooms,
          t: property.activeTenants,
          // Store additional properties for dashboard use
          _id: property.id,
          _totalRooms: property.totalRooms,
          _filledRooms: property.filledRooms,
          _emptyRooms: property.emptyRooms,
          _activeTenants: property.activeTenants,
        }));
        setHouses(transformed);
      } else {
        setHouses([]);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar rumah:', err);
      setHouses([]);
    }
  };

  // Fetch rooms dari API berdasarkan activePropertyId
  const fetchRooms = async () => {
    if (!activePropertyId) {
      setRooms([]);
      return;
    }
    const propertyId = activePropertyId;
    try {
      const data = await roomsApi.getRooms(propertyId);
      if (data && data.success !== false) { // API returns array directly or {success, data}
        // API returns array of rooms: [{ id, roomNumber, price, notes, tenant }]
        // Transform to match expected shape for rooms state: [{ n: roomNumber, p: price, note: notes }]
        const transformed = data.map((room) => ({
          n: room.roomNumber,
          p: room.price,
          note: room.notes || '',
          // Store additional data for reference
          _id: room.id,
          _tenant: room.tenant, // Active tenant if any
        }));
        if (propertyId === activePropertyId) {
          setRooms(transformed);
        }
      } else {
        if (propertyId === activePropertyId) {
          setRooms([]);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar kamar:', err);
      if (activePropertyId === propertyId) {
        setRooms([]);
      }
    }
  };

  // Fetch tenants dari API berdasarkan activePropertyId
  const fetchTenants = async () => {
    if (!activePropertyId) {
      setTenants([]);
      return;
    }
    const propertyId = activePropertyId;
    try {
      const data = await tenantsApi.getTenants(propertyId);
      if (data && data.success !== false) { // API returns array directly or {success, data}
        // API returns array of tenants: [{ id, name, phone, originAddress, occupation, moveInDate, room, ktpPhoto, notes, status }]
        // Transform to match expected shape for tenants state: [{ id, name, room, hp, addr, job, in, st, ktp }]
        const transformed = data.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          room: tenant.currentRoom ? tenant.currentRoom.roomNumber : null,
          roomId: tenant.currentRoom ? tenant.currentRoom.id : null,
          hp: tenant.phone,
          addr: tenant.originAddress,
          job: tenant.occupation,
          in: tenant.moveInDate,
          st: tenant.status === 'KELUAR' ? 'Keluar' : 'Aktif',
          status: tenant.status,
          ktp: tenant.ktpPhoto || null,
        }));
        if (propertyId === activePropertyId) {
          setTenants(transformed);
        }
      } else {
        if (propertyId === activePropertyId) {
          setTenants([]);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar penghuni:', err);
      if (activePropertyId === propertyId) {
        setTenants([]);
      }
    }
  };

  // Fetch bills, houses, rooms, dan tenants ketika activePropertyId berubah atau user login
  useEffect(() => {
    if (!isLoggedIn) return;
    setMode('loading');
    // Reset state
    setHouses([]);
    setRooms([]);
    setTenants([]);
    setBills([]);

    // We'll collect promises for the fetches we want to wait for
    const promises = [];

    // Always fetch houses
    promises.push(fetchHouses());

    // If we have an activePropertyId, fetch rooms, tenants, and bills
    if (activePropertyId) {
      promises.push(fetchRooms());
      promises.push(fetchTenants());
      promises.push(fetchBills());
    }

    // Wait for all fetches to complete
    Promise.allSettled(promises)
      .then((results) => {
        // If any of the promises rejected, set mode to error
        const hasError = results.some((result) => result.status === 'rejected');
        if (hasError) {
          setMode('error');
        } else {
          setMode('normal');
        }
      })
      .catch(() => {
        // This should not happen because allSettled doesn't reject, but just in case
        setMode('error');
      });
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
        // selectedHouse is computed from houses and activePropertyId
        selectedHouse: houses.find((h) => h._id === activePropertyId)?.n || '',
        setSelectedHouse: (id) => setActivePropertyId(id), // For compatibility, we map to setActivePropertyId
        houses,
        setHouses,
        rooms,
        setRooms,
        tenants,
        setTenants,
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
        bills,
        fetchBills,
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
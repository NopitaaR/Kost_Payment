import React, { createContext, useContext, useState } from 'react';

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

const INITIAL_BILLS = [
  { id: 1, room: '01', amt: 800000, per: '20 Sep – 20 Okt 2026', due: '2026-10-20', pay: [] },
  { id: 2, room: '03', amt: 1000000, per: '25 Sep – 25 Okt 2026', due: '2026-10-25', pay: [{ d: '2026-10-02', amt: 600000, m: 'Transfer' }] },
  { id: 3, room: '04', amt: 700000, per: '28 Agu – 28 Sep 2026', due: '2026-09-28', pay: [] },
  { id: 4, room: '05', amt: 750000, per: '1 Sep – 1 Okt 2026', due: '2026-10-01', pay: [{ d: '2026-09-30', amt: 750000, m: 'Cash' }] },
  { id: 5, room: '01', amt: 800000, per: '20 Agu – 20 Sep 2026', due: '2026-09-20', pay: [{ d: '2026-09-18', amt: 800000, m: 'Cash' }] },
  { id: 6, room: '03', amt: 1000000, per: '25 Agu – 25 Sep 2026', due: '2026-09-25', pay: [{ d: '2026-09-24', amt: 400000, m: 'Transfer' }, { d: '2026-09-25', amt: 600000, m: 'Transfer' }] },
];

const INITIAL_OWNER = {
  name: 'Pemilik Kost',
  email: 'pemilik@kost.id',
  hp: '0812-0000-1234',
};

export const TODAY = new Date('2026-10-04');

export const rp = (n) => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');

export const fd = (i) => {
  if (!i) return '';
  return new Date(i).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const paid = (b) => (b.pay || []).reduce((a, p) => a + p.amt, 0);
export const left = (b) => b.amt - paid(b);
export const st = (b) => {
  if (paid(b) >= b.amt) return 'LUNAS';
  if (new Date(b.due) < TODAY) return 'TERLAMBAT';
  if (paid(b) > 0) return 'SEBAGIAN';
  return 'BELUM_BAYAR';
};

export const LB = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum bayar', TERLAMBAT: 'Terlambat' };
export const CL = { LUNAS: 'ok', SEBAGIAN: 'warn', BELUM_BAYAR: 'gray', TERLAMBAT: 'bad' };

export function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState('Rumah 1');
  const [houses, setHouses] = useState(INITIAL_HOUSES);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [owner, setOwner] = useState(INITIAL_OWNER);

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

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        selectedHouse,
        setSelectedHouse,
        houses,
        setHouses,
        rooms,
        tenants,
        bills,
        owner,
        mode,
        setMode,
        sheetContent,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

import { api } from './client.js';

/**
 * Format period from two date strings (YYYY-MM-DD) to "DD MMM YYYY – DD MMM YYYY"
// Example: "2026-09-20" and "2026-10-20" => "20 Sep 2026 – 20 Oct 2026"
 */
const formatPeriod = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return null;
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

export const getBills = (propertyId) => {
  return api.get(`/properties/${propertyId}/bills`).then((response) => {
    if (response && response.success) {
      // Transform API bill objects to match expected shape for UI components
      const transformed = response.data.map((bill) => ({
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
      return { success: true, data: transformed };
    }
    return response;
  });
};

export const getBill = (propertyId, billId) => {
  return api.get(`/properties/${propertyId}/bills/${billId}`).then((response) => {
    if (response && response.success) {
      // Transform API bill object to match expected shape for UI components
      const bill = response.data;
      // Transform payments: API returns payments array with amount, paymentDate, method, notes
      // UI expects pay array with objects having amt and m? Actually the UI uses p.amt and p.m.
      // In the BillDetail.jsx, they use p.amt and p.m (method).
      // We need to map payment.amount to p.amt, and payment.method to p.m.
      const transformedPayments = (bill.payments || []).map((p) => ({
        ...p,
        amt: p.amount,
        m: p.method,
        // Keep original fields if needed
      }));
      return {
        success: true,
        data: {
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
          // Payments array transformed
          pay: transformedPayments,
          // Keep totalPaid, remaining, status for helper functions
        },
      };
    }
    return response;
  });
};

export const createBill = (propertyId, billData) => {
  // Support both API-shaped data (roomId, periodStart, periodEnd, dueDate, notes)
  // and UI-shaped data (with legacy amt/due fields).
  // Backend uses room price snapshot, so amount from UI is ignored by backend.
  const apiData = { ...billData };
  // If UI legacy fields are present, map them
  if (billData.due && !billData.dueDate) apiData.dueDate = billData.due;
  // Remove UI-specific fields that backend doesn't understand
  delete apiData.amt;
  delete apiData.due;
  delete apiData.per;
  return api.post(`/properties/${propertyId}/bills`, apiData);
};

export const generateBills = (propertyId) => {
  return api.post(`/properties/${propertyId}/bills/generate`);
};
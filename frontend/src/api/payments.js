import { api } from './client.js';

export const createPayment = (propertyId, billId, paymentData) => {
  // Transform UI paymentData to API shape
  const apiData = {
    amount: paymentData.amt,
    method: paymentData.m.toUpperCase(),
    paymentDate: paymentData.d,
    notes: paymentData.note,
  };
  return api.post(`/properties/${propertyId}/bills/${billId}/payments`, apiData);
};

// Optional: get payments for a specific bill (if needed elsewhere)
export const getPayments = (propertyId, billId) => {
  return api.get(`/properties/${propertyId}/bills/${billId}/payments`).then((response) => {
    if (response && response.success) {
      // Transform API payment objects to match expected shape for UI components
      // The API returns payments array with amount, paymentDate, method, notes
      // UI expects pay array with objects having amt and m (method)
      const transformed = (response.data.payments || []).map((p) => ({
        ...p,
        amt: p.amount,
        m: p.method,
        // Keep original fields if needed
      }));
      return { success: true, data: transformed };
    }
    return response;
  });
};
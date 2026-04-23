export const getDisplayOrderNumber = (order) => {
  const orderId = order?.orderId || order?.orderNumber;
  if (orderId !== undefined && orderId !== null && String(orderId).trim() !== '') {
    return String(orderId);
  }

  const id = order?._id || order?.id;
  if (typeof id === 'string' && id.length > 0) {
    return id;
  }

  return '—';
};

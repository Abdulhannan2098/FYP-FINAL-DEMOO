export const getDisplayOrderNumber = (order) => {
  const orderNumber = order?.orderNumber;
  if (orderNumber !== undefined && orderNumber !== null && String(orderNumber).trim() !== '') {
    return String(orderNumber);
  }

  const id = order?._id || order?.id;
  if (typeof id === 'string' && id.length > 0) {
    return id.slice(-12).toUpperCase();
  }

  return '—';
};

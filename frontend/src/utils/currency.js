export const formatPKR = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 'PKR 0.00';
  }

  return `PKR ${numberValue.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

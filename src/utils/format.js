export const brl = (v) =>
  'R$' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const brl2 = (v) =>
  'R$' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (v, digits = 1) => Number(v).toFixed(digits) + '%';

export const num = (v) => Number(v).toLocaleString('pt-BR');

export const k = (v) =>
  v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'K' : num(v);

export const mult = (v) => v.toFixed(1).replace('.', ',') + '×';

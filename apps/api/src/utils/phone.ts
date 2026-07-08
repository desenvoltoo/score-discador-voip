export function normalizeBrazilPhone(input: string) { let d=(input||'').replace(/\D/g,''); if(d.startsWith('55')&&d.length>11)d=d.slice(2); return d; }
export function isValidBrazilPhone(phone: string) { return /^\d{10,11}$/.test(phone) && /^[1-9]{2}/.test(phone); }

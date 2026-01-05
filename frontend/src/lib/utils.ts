export const formatarCPF = (cpf: string): string => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

export const formatarTelefone = (tel: string): string => tel.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');

export const formatarCEP = (cep: string): string => cep.replace(/(\d{5})(\d{3})/, '$1-$2');

export const validarCPF = (cpf: string): boolean => {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(numeros.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(numeros.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(numeros.substring(10, 11));
};
"""
Validadores centralizados para o sistema NR12 ERP
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def normalize_cpf(cpf):
    """Remove pontuação e espaços do CPF"""
    if not cpf:
        return ''
    return re.sub(r'[^\d]', '', str(cpf))


def validate_cpf(value):
    """
    Valida CPF brasileiro (11 dígitos com verificadores)
    """
    cpf = normalize_cpf(value)
    
    if not cpf:
        raise ValidationError(_('CPF é obrigatório'))
    
    if len(cpf) != 11:
        raise ValidationError(_('CPF deve conter 11 dígitos'))
    
    if not cpf.isdigit():
        raise ValidationError(_('CPF deve conter apenas números'))
    
    # Rejeita CPFs conhecidos como inválidos (todos os dígitos iguais)
    if cpf == cpf[0] * 11:
        raise ValidationError(_('CPF inválido'))
    
    # Validação dos dígitos verificadores
    def calc_digit(cpf_partial, weight):
        total = sum(int(cpf_partial[i]) * weight[i] for i in range(len(cpf_partial)))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    # Primeiro dígito
    weight1 = list(range(10, 1, -1))
    digit1 = calc_digit(cpf[:9], weight1)
    
    if int(cpf[9]) != digit1:
        raise ValidationError(_('CPF inválido (dígito verificador incorreto)'))
    
    # Segundo dígito
    weight2 = list(range(11, 1, -1))
    digit2 = calc_digit(cpf[:10], weight2)
    
    if int(cpf[10]) != digit2:
        raise ValidationError(_('CPF inválido (dígito verificador incorreto)'))
    
    return cpf


def normalize_cnpj(cnpj):
    """Remove pontuação e espaços do CNPJ"""
    if not cnpj:
        return ''
    return re.sub(r'[^\d]', '', str(cnpj))


def validate_cnpj(value):
    """
    Valida CNPJ brasileiro (14 dígitos com verificadores)
    """
    cnpj = normalize_cnpj(value)
    
    if not cnpj:
        raise ValidationError(_('CNPJ é obrigatório'))
    
    if len(cnpj) != 14:
        raise ValidationError(_('CNPJ deve conter 14 dígitos'))
    
    if not cnpj.isdigit():
        raise ValidationError(_('CNPJ deve conter apenas números'))
    
    # Rejeita CNPJs conhecidos como inválidos
    if cnpj == cnpj[0] * 14:
        raise ValidationError(_('CNPJ inválido'))
    
    # Validação dos dígitos verificadores
    def calc_digit(cnpj_partial, weights):
        total = sum(int(cnpj_partial[i]) * weights[i] for i in range(len(cnpj_partial)))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    # Primeiro dígito
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    digit1 = calc_digit(cnpj[:12], weights1)
    
    if int(cnpj[12]) != digit1:
        raise ValidationError(_('CNPJ inválido (dígito verificador incorreto)'))
    
    # Segundo dígito
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    digit2 = calc_digit(cnpj[:13], weights2)
    
    if int(cnpj[13]) != digit2:
        raise ValidationError(_('CNPJ inválido (dígito verificador incorreto)'))
    
    return cnpj


def validate_documento(value, tipo_pessoa='PF'):
    """
    Valida CPF ou CNPJ baseado no tipo de pessoa
    """
    if tipo_pessoa == 'PF':
        return validate_cpf(value)
    elif tipo_pessoa == 'PJ':
        return validate_cnpj(value)
    else:
        raise ValidationError(_('Tipo de pessoa inválido'))

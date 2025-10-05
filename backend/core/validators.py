# backend/core/validators.py
import re
from django.core.exceptions import ValidationError

def validate_cpf(value):
    """Valida CPF brasileiro"""
    cpf = re.sub(r'[^0-9]', '', value)
    
    if len(cpf) != 11:
        raise ValidationError('CPF deve ter 11 dígitos')
    
    # Validação de dígitos repetidos
    if cpf == cpf[0] * 11:
        raise ValidationError('CPF inválido')
    
    # Validação dos dígitos verificadores
    def calc_digit(cpf_part, weights):
        total = sum(int(digit) * weight for digit, weight in zip(cpf_part, weights))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    weights_first = range(10, 1, -1)
    weights_second = range(11, 1, -1)
    
    first_digit = calc_digit(cpf[:9], weights_first)
    second_digit = calc_digit(cpf[:10], weights_second)
    
    if cpf[-2:] != f'{first_digit}{second_digit}':
        raise ValidationError('CPF inválido')

def validate_cnpj(value):
    """Valida CNPJ brasileiro"""
    cnpj = re.sub(r'[^0-9]', '', value)
    
    if len(cnpj) != 14:
        raise ValidationError('CNPJ deve ter 14 dígitos')
    
    if cnpj == cnpj[0] * 14:
        raise ValidationError('CNPJ inválido')
    
    def calc_digit(cnpj_part, weights):
        total = sum(int(digit) * weight for digit, weight in zip(cnpj_part, weights))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    weights_first = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights_second = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    
    first_digit = calc_digit(cnpj[:12], weights_first)
    second_digit = calc_digit(cnpj[:13], weights_second)
    
    if cnpj[-2:] != f'{first_digit}{second_digit}':
        raise ValidationError('CNPJ inválido')

def validate_documento(tipo_pessoa, documento):
    """Valida documento baseado no tipo de pessoa"""
    if not documento:
        return  # Documento é opcional
    
    if tipo_pessoa == 'PF':
        validate_cpf(documento)
    elif tipo_pessoa == 'PJ':
        validate_cnpj(documento)


# backend/cadastro/serializers.py (ATUALIZADO)
from rest_framework import serializers
from .models import Cliente, Empreendimento
from core.validators import validate_documento

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = "__all__"
    
    def validate(self, data):
        # Valida documento baseado no tipo de pessoa
        tipo_pessoa = data.get('tipo_pessoa') or getattr(self.instance, 'tipo_pessoa', None)
        documento = data.get('documento')
        
        if documento and tipo_pessoa:
            try:
                validate_documento(tipo_pessoa, documento)
            except Exception as e:
                raise serializers.ValidationError({'documento': str(e)})
        
        return data


# backend/cadastro/models.py (ADICIONAR)
from django.db import models
from core.validators import validate_documento

class Cliente(models.Model):
    # ... campos existentes ...
    
    def clean(self):
        """Validação no nível do modelo"""
        super().clean()
        if self.documento:
            validate_documento(self.tipo_pessoa, self.documento)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
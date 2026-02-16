# backend/core/geolocation.py
"""
Serviço de geolocalização para o Mandacaru NR12.
Inclui geocodificação reversa e validação de geofence.
"""

import math
import logging
import requests
from django.conf import settings
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)


def calcular_distancia_haversine(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """
    Calcula a distância em metros entre dois pontos usando a fórmula de Haversine.

    Args:
        lat1, lon1: Coordenadas do primeiro ponto
        lat2, lon2: Coordenadas do segundo ponto

    Returns:
        Distância em metros
    """
    R = 6371000  # Raio da Terra em metros

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def validar_geofence(
    lat_checklist: float,
    lon_checklist: float,
    lat_empreendimento: float,
    lon_empreendimento: float,
    raio_metros: int = 500
) -> Tuple[bool, float]:
    """
    Valida se o checklist foi realizado dentro do raio de geofence do empreendimento.

    Args:
        lat_checklist: Latitude onde o checklist foi realizado
        lon_checklist: Longitude onde o checklist foi realizado
        lat_empreendimento: Latitude do empreendimento
        lon_empreendimento: Longitude do empreendimento
        raio_metros: Raio de tolerância em metros

    Returns:
        Tuple (dentro_do_raio: bool, distancia_metros: float)
    """
    distancia = calcular_distancia_haversine(
        lat_checklist, lon_checklist,
        lat_empreendimento, lon_empreendimento
    )

    dentro_do_raio = distancia <= raio_metros
    return dentro_do_raio, distancia


def geocodificar_reverso(
    latitude: float,
    longitude: float,
    token: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Converte coordenadas GPS em endereço usando LocationIQ.

    Args:
        latitude: Latitude do ponto
        longitude: Longitude do ponto
        token: Token da API LocationIQ (opcional, usa settings se não fornecido)

    Returns:
        Dicionário com dados do endereço ou None se falhar
    """
    api_token = token or getattr(settings, 'LOCATIONIQ_TOKEN', None)

    if not api_token:
        logger.warning("Token do LocationIQ não configurado. Configure LOCATIONIQ_TOKEN nas settings.")
        return None

    try:
        url = "https://us1.locationiq.com/v1/reverse"
        params = {
            "key": api_token,
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "accept-language": "pt-BR"
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Extrair dados do endereço
        address = data.get("address", {})

        return {
            "endereco_completo": data.get("display_name", ""),
            "logradouro": address.get("road", ""),
            "numero": address.get("house_number", ""),
            "bairro": address.get("suburb", "") or address.get("neighbourhood", ""),
            "cidade": address.get("city", "") or address.get("town", "") or address.get("village", ""),
            "estado": address.get("state", ""),
            "uf": _extrair_uf(address.get("state", "")),
            "cep": address.get("postcode", ""),
            "pais": address.get("country", ""),
            "latitude": latitude,
            "longitude": longitude,
        }

    except requests.exceptions.Timeout:
        logger.error("Timeout ao consultar LocationIQ")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao consultar LocationIQ: {e}")
        return None
    except Exception as e:
        logger.error(f"Erro inesperado na geocodificação: {e}")
        return None


def _extrair_uf(estado: str) -> str:
    """Extrai a sigla UF do nome do estado."""
    uf_map = {
        "acre": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM",
        "bahia": "BA", "ceará": "CE", "distrito federal": "DF",
        "espírito santo": "ES", "goiás": "GO", "maranhão": "MA",
        "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
        "pará": "PA", "paraíba": "PB", "paraná": "PR", "pernambuco": "PE",
        "piauí": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
        "rio grande do sul": "RS", "rondônia": "RO", "roraima": "RR",
        "santa catarina": "SC", "são paulo": "SP", "sergipe": "SE",
        "tocantins": "TO"
    }

    estado_lower = estado.lower().strip()
    return uf_map.get(estado_lower, "")


def formatar_coordenadas(latitude: float, longitude: float) -> str:
    """Formata coordenadas para exibição legível."""
    lat_dir = "N" if latitude >= 0 else "S"
    lon_dir = "E" if longitude >= 0 else "W"

    return f"{abs(latitude):.6f}° {lat_dir}, {abs(longitude):.6f}° {lon_dir}"


def gerar_link_google_maps(latitude: float, longitude: float) -> str:
    """Gera um link do Google Maps para as coordenadas."""
    return f"https://www.google.com/maps?q={latitude},{longitude}"

# backend/core/qr_utils.py
import io
import os
import qrcode
from PIL import Image, ImageDraw, ImageFont
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.conf import settings


def generate_qr_code(data: str, box_size: int = 10, border: int = 4):
    """
    Gera um QR code e retorna a imagem PIL.
    """
    qr = qrcode.QRCode(version=None, box_size=box_size, border=border)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    return img


def add_text_to_qr(qr_img, top_text: str = "MANDACARU S M", bottom_text: str = ""):
    """
    Adiciona texto na parte superior e inferior do QR code.

    Args:
        qr_img: Imagem PIL do QR code
        top_text: Texto para o topo (padrão: "MANDACARU S M")
        bottom_text: Texto para a parte inferior (ex: nome do cliente)

    Returns:
        Nova imagem PIL com texto adicionado
    """
    # Converter QR code para RGB se necessário
    if qr_img.mode != 'RGB':
        qr_img = qr_img.convert('RGB')

    # Dimensões do QR code original
    qr_width, qr_height = qr_img.size

    # Altura adicional para o texto (topo e inferior)
    text_height_top = 60
    text_height_bottom = 50 if bottom_text else 0
    margin = 20

    # Criar nova imagem com espaço para texto
    total_height = text_height_top + qr_height + text_height_bottom
    new_img = Image.new('RGB', (qr_width, total_height), 'white')

    # Colar QR code na posição correta
    new_img.paste(qr_img, (0, text_height_top))

    # Preparar para desenhar texto
    draw = ImageDraw.Draw(new_img)

    # Tentar carregar fonte (usar fonte padrão se não encontrar)
    try:
        # Fonte para o texto superior (maior e negrito)
        font_top = ImageFont.truetype("arialbd.ttf", 28)
    except:
        try:
            font_top = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        except:
            font_top = ImageFont.load_default()

    try:
        # Fonte para o texto inferior (menor)
        font_bottom = ImageFont.truetype("arial.ttf", 20)
    except:
        try:
            font_bottom = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            font_bottom = ImageFont.load_default()

    # Desenhar texto superior (MANDACARU S M)
    # Calcular posição centralizada
    try:
        bbox_top = draw.textbbox((0, 0), top_text, font=font_top)
        text_width_top = bbox_top[2] - bbox_top[0]
    except:
        text_width_top = len(top_text) * 15

    x_top = (qr_width - text_width_top) // 2
    y_top = margin
    draw.text((x_top, y_top), top_text, fill='black', font=font_top)

    # Desenhar texto inferior (nome do cliente/equipamento)
    if bottom_text:
        # Truncar texto se for muito longo
        max_chars = 30
        if len(bottom_text) > max_chars:
            bottom_text = bottom_text[:max_chars-3] + "..."

        try:
            bbox_bottom = draw.textbbox((0, 0), bottom_text, font=font_bottom)
            text_width_bottom = bbox_bottom[2] - bbox_bottom[0]
        except:
            text_width_bottom = len(bottom_text) * 10

        x_bottom = (qr_width - text_width_bottom) // 2
        y_bottom = text_height_top + qr_height + 10
        draw.text((x_bottom, y_bottom), bottom_text, fill='black', font=font_bottom)

    return new_img


def qr_png_response(data: str, box_size: int = 10, border: int = 4) -> HttpResponse:
    """
    Gera QR code e retorna como HttpResponse PNG.
    Usado para servir QR codes via HTTP sem salvar.
    """
    img = generate_qr_code(data, box_size, border)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")


def save_qr_code_to_file(
    data: str,
    filename: str,
    top_text: str = "MANDACARU S M",
    bottom_text: str = "",
    box_size: int = 10,
    border: int = 4
) -> ContentFile:
    """
    Gera QR code com texto e retorna como ContentFile para salvar no Django FileField.

    Args:
        data: Dados a serem codificados no QR code
        filename: Nome do arquivo (ex: "cliente_123.png")
        top_text: Texto para o topo (padrão: "MANDACARU S M")
        bottom_text: Texto para a parte inferior (ex: nome do cliente)
        box_size: Tamanho de cada "caixa" do QR code
        border: Tamanho da borda

    Returns:
        ContentFile contendo a imagem PNG do QR code com texto
    """
    # Gerar QR code
    qr_img = generate_qr_code(data, box_size, border)

    # Adicionar texto
    final_img = add_text_to_qr(qr_img, top_text, bottom_text)

    # Salvar em buffer
    buf = io.BytesIO()
    final_img.save(buf, format="PNG")
    buf.seek(0)
    return ContentFile(buf.read(), name=filename)

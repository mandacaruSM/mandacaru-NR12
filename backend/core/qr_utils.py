# backend/core/qr_utils.py
import io
import qrcode
from django.http import HttpResponse

def qr_png_response(data: str, box_size: int = 10, border: int = 4) -> HttpResponse:
    qr = qrcode.QRCode(version=None, box_size=box_size, border=border)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")

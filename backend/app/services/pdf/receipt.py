from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as pdf_canvas

from app.services.pdf.styles import (
    BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_MAIN, TEXT_MUTED,
    CARD_BG, BORDER_COLOR, SUCCESS_BG, SUCCESS_TEXT
)


def generate_receipt_pdf(payment, bill, current_user, society) -> BytesIO:
    society_name = society.name if society else "Society Hub"
    society_address = society.address if society and society.address else "Address missing from profile"
    receipt_no = f"SH-{payment.id[:8].upper()}"

    buffer = BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Top Header Banner
    c.setFillColor(BRAND_PRIMARY)
    c.roundRect(36, height - 120, width - 72, 85, 10, fill=True, stroke=False)
    c.setFillColor(BRAND_ACCENT)
    c.roundRect(36, height - 120, 6, 85, 3, fill=True, stroke=False)

    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 17)
    c.drawString(55, height - 60, society_name.upper()[:32])
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor("#A5B4FC"))
    c.drawString(55, height - 74, "SOCIETY MANAGEMENT SYSTEM")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor("#CBD5E1"))
    c.drawString(55, height - 90, society_address[:55] if society_address else "")

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawRightString(width - 55, height - 58, "PAYMENT RECEIPT")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor("#C7D2FE"))
    c.drawRightString(width - 55, height - 74, f"Receipt No: {receipt_no}")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor("#E2E8F0"))
    c.drawRightString(width - 55, height - 90, f"Issued: {payment.paid_at.strftime('%d %b %Y, %I:%M %p')}")

    # Payment Verified Badge
    y = height - 150
    c.setFillColor(SUCCESS_BG)
    c.setStrokeColor(HexColor("#86EFAC"))
    c.setLineWidth(1)
    c.roundRect(36, y - 5, 175, 24, 6, fill=True, stroke=True)
    c.setFillColor(SUCCESS_TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y + 2, "✔ PAYMENT VERIFIED & PAID")

    # Two-Column Metadata Cards
    card_top, card_h = y - 40, 100
    c.setFillColor(CARD_BG)
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(1)
    c.roundRect(36, card_top - card_h, 250, card_h, 8, fill=True, stroke=True)

    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(50, card_top - 18, "BILLED TO / RESIDENT DETAILS")
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(50, card_top - 23, 270, card_top - 23)

    flat_str = f"Block {current_user.flat.block} - Flat {current_user.flat.flat_number}" if current_user.flat else "Standalone Unit"
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(TEXT_MAIN)
    c.drawString(50, card_top - 38, current_user.name[:30])
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(50, card_top - 54, f"Unit: {flat_str}")
    c.drawString(50, card_top - 68, f"Email: {current_user.email[:30]}")
    if hasattr(current_user, 'phone') and current_user.phone:
        c.drawString(50, card_top - 82, f"Phone: {current_user.phone}")

    c.setFillColor(CARD_BG)
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(1)
    c.roundRect(300, card_top - card_h, width - 336, card_h, 8, fill=True, stroke=True)
    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(314, card_top - 18, "TRANSACTION INFORMATION")
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(314, card_top - 23, width - 50, card_top - 23)

    method_str = (payment.payment_method or "Online Settlement").replace("_", " ").title()
    ref_str = payment.transaction_ref or "Bank Transfer Ref"
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(314, card_top - 38, "Transaction Ref:")
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(TEXT_MAIN)
    c.drawString(395, card_top - 38, ref_str[:22])
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(314, card_top - 54, "Payment Method:")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MAIN)
    c.drawString(395, card_top - 54, method_str)
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(314, card_top - 68, "Payment Date:")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MAIN)
    c.drawString(395, card_top - 68, payment.paid_at.strftime('%d %b %Y, %I:%M %p'))

    # Itemized Table
    table_top = card_top - card_h - 30
    c.setFillColor(TEXT_MAIN)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, table_top, "Itemized Charge Details")
    y = table_top - 20
    c.setFillColor(HexColor("#F1F5F9"))
    c.roundRect(36, y - 5, width - 72, 22, 4, fill=True, stroke=False)
    c.setFillColor(HexColor("#334155"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(50, y + 2, "BILL TITLE & DESCRIPTION")
    c.drawString(314, y + 2, "BILL TYPE")
    c.drawRightString(width - 50, y + 2, "AMOUNT (Rs.)")

    y -= 25
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(TEXT_MAIN)
    c.drawString(50, y, bill.title[:38])
    b_type = (bill.bill_type.value if bill.bill_type else "Maintenance").replace("_", " ").title()
    c.setFont("Helvetica", 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(314, y, b_type)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(TEXT_MAIN)
    c.drawRightString(width - 50, y, f"Rs. {payment.amount:,.2f}")

    if bill.description:
        y -= 14
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(TEXT_MUTED)
        c.drawString(50, y, bill.description[:70])

    y -= 15
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(1)
    c.line(36, y, width - 36, y)

    # Total Box
    y -= 60
    c.setFillColor(BRAND_LIGHT)
    c.setStrokeColor(HexColor("#C7D2FE"))
    c.setLineWidth(1.5)
    c.roundRect(36, y, width - 72, 48, 8, fill=True, stroke=True)
    c.setFillColor(HexColor("#3730A3"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(52, y + 26, "TOTAL AMOUNT PAID")
    c.setFont("Helvetica", 8)
    c.setFillColor(BRAND_ACCENT)
    c.drawString(52, y + 12, "Payment settled electronically in full")
    c.setFillColor(BRAND_PRIMARY)
    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(width - 52, y + 16, f"Rs. {payment.amount:,.2f}")

    # Footer
    c.setFillColor(CARD_BG)
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(1)
    c.roundRect(36, 70, width - 72, 38, 6, fill=True, stroke=True)
    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, 94, "AUTHENTIC & DIGITALLY VERIFIED RECEIPT")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(TEXT_MUTED)
    c.drawCentredString(width / 2, 81, "This document is computer-generated under the Information Technology Act. No physical signature is required.")
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.line(36, 50, width - 36, 50)
    c.setFillColor(BRAND_ACCENT)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(width / 2, 36, "Thank you for being a valued resident! • SocietyHub System")

    c.save()
    buffer.seek(0)
    return buffer

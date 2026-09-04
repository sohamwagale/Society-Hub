from reportlab.lib.colors import HexColor

# Primary brand colors
BRAND_PRIMARY = HexColor("#1E1B4B")
BRAND_ACCENT = HexColor("#4F46E5")
BRAND_LIGHT = HexColor("#EEF2FF")

# Report colors
PRIMARY_REPORT = HexColor("#311B92")
WHITE = HexColor("#FFFFFF")
TEXT_MAIN = HexColor("#0F172A")
TEXT_DARK = HexColor("#1A1A2E")
TEXT_MUTED = HexColor("#64748B")
TEXT_LIGHT = HexColor("#555555")
CARD_BG = HexColor("#F8FAFC")
BORDER_COLOR = HexColor("#E2E8F0")
BORDER_LIGHT = HexColor("#CCCCCC")
SUCCESS_BG = HexColor("#DCFCE7")
SUCCESS_TEXT = HexColor("#166534")
GREEN = HexColor("#2E7D32")
RED = HexColor("#C62828")
GREY_BG = HexColor("#F5F5F5")
ORANGE = HexColor("#E65100")


def draw_report_header(canvas, society_name: str, active_bills_count: int, page_num: int, W: float, H: float, generated_time: str):
    canvas.setFillColor(PRIMARY_REPORT)
    canvas.rect(0, H - 70, W, 70, fill=True, stroke=False)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawString(30, H - 40, f"{society_name} — Comprehensive Billing Report")
    canvas.setFont("Helvetica", 10)
    canvas.drawString(30, H - 56, f"Generated: {generated_time}")
    canvas.drawRightString(W - 30, H - 40, f"Monitored Bills: {active_bills_count}")
    canvas.drawRightString(W - 30, H - 56, f"Page {page_num}")


def draw_report_footer(canvas, W: float):
    canvas.setFillColor(TEXT_LIGHT)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(W / 2, 15, "Automated system report. All amounts in Indian Rupees (Rs.).")

from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.colors import HexColor

from app.services.pdf.styles import (
    PRIMARY_REPORT, WHITE, TEXT_DARK, TEXT_LIGHT, GREEN, RED, GREY_BG,
    BORDER_LIGHT, ORANGE, draw_report_header, draw_report_footer
)
from app.services.pdf.bill_report_data import prepare_billing_report_data


def generate_bill_report_pdf(active_bills, flats, society_name: str, db) -> BytesIO:
    flat_rows = prepare_billing_report_data(active_bills, flats, db)
    buffer = BytesIO()
    page_size = landscape(A4)
    c = pdf_canvas.Canvas(buffer, pagesize=page_size)
    W, H = page_size
    gen_time = datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC")

    # Section 1: Billing Summary
    page_num = 1
    draw_report_header(c, society_name, len(active_bills), page_num, W, H, gen_time)
    y = H - 100

    c.setFillColor(TEXT_DARK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Active Billing Cycles")
    y -= 25

    col_x = [30, 230, 370, 480, 600]
    headers = ["Bill Title", "Category / Type", "Base Amount", "Due Date", "Settlement Ratio"]
    c.setFillColor(PRIMARY_REPORT)
    c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 22

    for idx, bill in enumerate(active_bills):
        if y < 50:
            draw_report_footer(c, W)
            c.showPage()
            page_num += 1
            draw_report_header(c, society_name, len(active_bills), page_num, W, H, gen_time)
            y = H - 100

        if idx % 2 == 0:
            c.setFillColor(GREY_BG)
            c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

        paid_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] == "paid")
        total_count = sum(1 for fr in flat_rows if bill.id in fr["bills"] and fr["bills"][bill.id]["status"] != "excluded")

        c.setFillColor(TEXT_DARK)
        c.setFont("Helvetica", 9)
        title_disp = bill.title[:30] + "..." if len(bill.title) > 30 else bill.title
        c.drawString(col_x[0], y, title_disp)
        c.drawString(col_x[1], y, (bill.bill_type.value if bill.bill_type else "-").title())
        c.drawString(col_x[2], y, f"{bill.amount:,.0f}")
        c.drawString(col_x[3], y, bill.due_date.strftime("%d %b %Y") if bill.due_date else "-")

        c.setFillColor(GREEN if paid_count == total_count and total_count > 0 else (RED if paid_count == 0 else ORANGE))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_x[4], y, f"{paid_count} / {total_count}")
        y -= 20

    # Section 2: Matrix Ledger
    draw_report_footer(c, W)
    c.showPage()
    page_num += 1
    draw_report_header(c, society_name, len(active_bills), page_num, W, H, gen_time)
    y = H - 100

    c.setFillColor(TEXT_DARK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "Unit-wise Payment Ledger")
    y -= 25

    max_bills = 6
    chunks = [active_bills[i:i + max_bills] for i in range(0, len(active_bills), max_bills)] or [[]]

    for chunk_idx, bill_chunk in enumerate(chunks):
        if chunk_idx > 0:
            draw_report_footer(c, W)
            c.showPage()
            page_num += 1
            draw_report_header(c, society_name, len(active_bills), page_num, W, H, gen_time)
            y = H - 100

        num_cols = len(bill_chunk) + 2
        flat_col_w = (W - 60) * 2 / (num_cols + 1)
        other_w = (W - 60 - flat_col_w) / (num_cols - 1)
        col_starts = [30] + [30 + flat_col_w + i * other_w for i in range(num_cols - 1)]

        c.setFillColor(PRIMARY_REPORT)
        c.rect(25, y - 5, W - 50, 20, fill=True, stroke=False)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(col_starts[0], y, "Flat Information")
        for bi, b in enumerate(bill_chunk):
            lbl = b.title[:12] + ".." if len(b.title) > 12 else b.title
            c.drawString(col_starts[bi + 1], y, lbl)
        c.drawString(col_starts[-1], y, "Balance (Rs.)")
        y -= 20

        for ridx, fr in enumerate(flat_rows):
            if y < 50:
                draw_report_footer(c, W)
                c.showPage()
                page_num += 1
                draw_report_header(c, society_name, len(active_bills), page_num, W, H, gen_time)
                y = H - 100

            if ridx % 2 == 0:
                c.setFillColor(GREY_BG)
                c.rect(25, y - 5, W - 50, 18, fill=True, stroke=False)

            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(TEXT_DARK)
            c.drawString(col_starts[0], y, f"{fr['flat']} ({fr['owner'][:15]})" if fr['owner'] else fr['flat'])

            c.setFont("Helvetica", 8)
            for bi, b in enumerate(bill_chunk):
                info = fr["bills"].get(b.id)
                if not info or info["status"] == "excluded":
                    c.setFillColor(TEXT_LIGHT)
                    c.drawString(col_starts[bi + 1], y, "—")
                elif info["status"] == "paid":
                    c.setFillColor(GREEN)
                    c.drawString(col_starts[bi + 1], y, f"✓ {info['amount']:,.0f}")
                else:
                    c.setFillColor(RED)
                    c.drawString(col_starts[bi + 1], y, f"✗ {info['amount']:,.0f}")

            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(RED if fr["total_due"] > 0 else GREEN)
            c.drawString(col_starts[-1], y, f"{fr['total_due']:,.0f}")
            y -= 18

    # Grand Totals
    grand_due = sum(fr["total_due"] for fr in flat_rows)
    grand_paid = sum(info["amount"] for fr in flat_rows for info in fr["bills"].values() if info["status"] == "paid")

    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(1)
    c.line(30, y + 5, W - 30, y + 5)
    y -= 15

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(TEXT_DARK)
    c.drawString(30, y, "Total Revenue Collected: ")
    c.setFillColor(GREEN)
    c.drawString(165, y, f"Rs.{grand_paid:,.2f}")
    c.setFillColor(TEXT_DARK)
    c.drawString(340, y, "Total Outstanding Dues: ")
    c.setFillColor(RED)
    c.drawString(485, y, f"Rs.{grand_due:,.2f}")

    draw_report_footer(c, W)
    c.save()
    buffer.seek(0)
    return buffer

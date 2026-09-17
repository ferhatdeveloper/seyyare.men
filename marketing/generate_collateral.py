#!/usr/bin/env python3
"""Seyyare pazar giriş tanıtım materyalleri — broşür + sosyal reklam PDF/PNG."""

from __future__ import annotations

import os
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image as PILImage
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
REPO = ROOT.parent
ASSETS = Path("/Users/ferhatnas/.cursor/projects/Users-ferhatnas-App-seyyare-men/assets")

LOGO = REPO / "apps/web/public/brand/seyyare-mark-light.png"
LOGO_DARK = REPO / "apps/web/public/brand/seyyare-mark-dark.png"
LOCKUP = REPO / "apps/web/public/brand/lockup-latin.png"
BG_DARK = ASSETS / "seyyare-ad-bg-dark.png"
BG_SQUARE = ASSETS / "seyyare-social-square-bg.png"
BG_STORY = ASSETS / "seyyare-social-story-bg.png"
BG_BROCHURE = ASSETS / "seyyare-brochure-hero.png"

FLAME = HexColor("#FF6A00")
FLAME_DEEP = HexColor("#E24A00")
INK = HexColor("#0B0B0C")
PAPER = HexColor("#F4F4F6")
MUTED = HexColor("#8B8B93")
SOFT = HexColor("#1A1A1D")
LINE = HexColor("#E8E8EC")

# A5 portrait
A5_W, A5_H = 148 * mm, 210 * mm


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("SFArabic", "/System/Library/Fonts/SFArabic.ttf"))
    pdfmetrics.registerFont(
        TTFont("ArialUnicode", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
    )
    # Latin display fallback
    for name, path in [
        ("HelveticaNeue", "/System/Library/Fonts/HelveticaNeue.ttc"),
    ]:
        try:
            pdfmetrics.registerFont(TTFont(name, path, subfontIndex=0))
        except Exception:
            pass


def is_rtl(lang: str) -> bool:
    return lang in ("ar", "ku")


def font_for(lang: str) -> str:
    return "SFArabic" if lang in ("ar", "ku") else "ArialUnicode"


def T(text: str, lang: str) -> str:
    """Reshape RTL runs; keep Latin tokens (URLs, emails) intact."""
    if not is_rtl(lang):
        return text
    import re

    parts = re.split(r"([A-Za-z0-9@._/-]+)", text)
    out = []
    for part in parts:
        if not part:
            continue
        if re.fullmatch(r"[A-Za-z0-9@._/-]+", part):
            out.append(part)
        else:
            out.append(get_display(arabic_reshaper.reshape(part)))
    # For mixed LTR/RTL, bidi on the whole joined string is more reliable
    # when there is no Latin; when Latin exists, join Arabic-reshaped + Latin.
    if len(parts) == 1:
        return get_display(arabic_reshaper.reshape(text))
    return "".join(out)


COPY = {
    "tr": {
        "brand": "Seyyare",
        "domain": "seyyare.men",
        "tagline": "Irak’ın araç pazarı",
        "b2c_kicker": "Bireysel müşteriler",
        "b2c_headline": "Al · Kirala · Yolculuk",
        "b2c_lead": "Tek uygulamada ikinci el araç, kiralama ve taksi. Erbil, Bağdat ve ötesinde güvenli mobilite.",
        "b2c_cta": "Hemen indir · seyyare.men",
        "b2c_features": [
            ("Satın al / sat", "Doğrulanmış satıcılar, AI fiyat & hasar ipuçları"),
            ("Kiralama", "Günlük ve uzun dönem — net fiyat"),
            ("Taksi & transfer", "Şehir içi ve havalimanı yolculukları"),
            ("Cüzdan", "İlan yayınlama ve güvenli ödeme"),
        ],
        "b2c_social_h": "Hayalindeki aracı bul",
        "b2c_social_s": "Al · kirala · taksi — tek uygulama",
        "b2b_kicker": "Kurumsal & bayiler",
        "b2b_headline": "Galerinizi dijitalleştirin",
        "b2b_lead": "Bayi paneli, stok yönetimi, öne çıkarma ve kurumsal filo kiralama. Hızlı pazar girişi için hazır paket.",
        "b2b_cta": "Partner ol · seyyare.men",
        "b2b_features": [
            ("Bayi mağazası", "Markalı sayfa, stok ve WhatsApp yönlendirme"),
            ("Öne çıkarma", "Boost & cüzdan ile daha çok görüntülenme"),
            ("Filo / kurumsal", "Toplu kiralama ve transfer anlaşmaları"),
            ("AI asistan", "İlan metni, fiyat ve müşteri yanıtları"),
        ],
        "b2b_social_h": "Bayiler için Seyyare",
        "b2b_social_s": "Stok · boost · filo — tek platform",
        "why": "Neden Seyyare?",
        "why_items": [
            "Yerel dil: Arapça, Kürtçe, Türkçe",
            "Irak odaklı fiyat (IQD) ve şehirler",
            "Mobil + web — hızlı canlıya alma",
        ],
        "footer": "© Seyyare · Erbil / Bağdat · seyyare.men",
        "audience_b2c": "BİREYSEL",
        "audience_b2b": "KURUMSAL",
        "qr_hint": "Uygulamayı aç",
    },
    "ar": {
        "brand": "سيّارة",
        "domain": "seyyare.men",
        "tagline": "سوق السيارات في العراق",
        "b2c_kicker": "للأفراد",
        "b2c_headline": "اشترِ · استأجر · تنقّل",
        "b2c_lead": "تطبيق واحد لبيع وشراء السيارات والتأجير والتاكسي. أربيل وبغداد وما بعدهما.",
        "b2c_cta": "حمّل الآن · seyyare.men",
        "b2c_features": [
            ("شراء / بيع", "بائعون موثوقون ونصائح ذكاء اصطناعي للسعر والأضرار"),
            ("تأجير", "يومي وطويل الأمد — أسعار واضحة"),
            ("تاكسي ونقل", "داخل المدينة والمطار"),
            ("المحفظة", "نشر الإعلانات ودفع آمن"),
        ],
        "b2c_social_h": "اعثر على سيارتك المثالية",
        "b2c_social_s": "شراء · تأجير · تاكسي — تطبيق واحد",
        "b2b_kicker": "للشركات والمعارض",
        "b2b_headline": "رقمن معرضك",
        "b2b_lead": "لوحة تاجر، إدارة المخزون، الترويج، وتأجير الأساطيل. حزمة جاهزة لدخول السوق بسرعة.",
        "b2b_cta": "كن شريكاً · seyyare.men",
        "b2b_features": [
            ("متجر المعرض", "صفحة بعلامتك وإدارة المخزون"),
            ("الترويج", "تعزيز وظهور أكبر عبر المحفظة"),
            ("الأسطول / الشركات", "تأجير جماعي واتفاقيات نقل"),
            ("مساعد ذكي", "نصوص الإعلان والسعر وردود العملاء"),
        ],
        "b2b_social_h": "سيّارة للمعارض",
        "b2b_social_s": "مخزون · تعزيز · أسطول — منصة واحدة",
        "why": "لماذا سيّارة؟",
        "why_items": [
            "لغات محلية: العربية والكردية والتركية",
            "أسعار عراقية (دينار) ومدن محلية",
            "موبايل وويب — إطلاق سريع",
        ],
        "footer": "© سيّارة · أربيل / بغداد · seyyare.men",
        "audience_b2c": "أفراد",
        "audience_b2b": "شركات",
        "qr_hint": "افتح التطبيق",
    },
    "ku": {
        "brand": "سیارە",
        "domain": "seyyare.men",
        "tagline": "بازاڕی ئۆتۆمبێل لە عێراق",
        "b2c_kicker": "بۆ کەسی تاک",
        "b2c_headline": "بکڕە · کرێ بکە · گەشت بکە",
        "b2c_lead": "لە یەک ئەپدا فرۆشتن و کڕین، کرێ و تاکسی. هەولێر، بەغدا و زیاتر.",
        "b2c_cta": "ئێستا دابەزێنە · seyyare.men",
        "b2c_features": [
            ("کڕین / فرۆشتن", "فرۆشیاری پشتڕاستکراو و یارمەتی AI بۆ نرخ و زیان"),
            ("کرێ", "ڕۆژانە و درێژخایەن — نرخی ڕوون"),
            ("تاکسی و گواستنەوە", "ناو شار و فڕۆکەخانە"),
            ("جزدان", "بڵاوکردنەوەی ئاگاداری و پارەدانی سەلامەت"),
        ],
        "b2c_social_h": "ئۆتۆمبێلی خەونەکانت بدۆزەوە",
        "b2c_social_s": "کڕین · کرێ · تاکسی — یەک ئەپ",
        "b2b_kicker": "بۆ کۆمپانیا و گەلەری",
        "b2b_headline": "گەلەرییەکەت دیجیتاڵ بکە",
        "b2b_lead": "پانێڵی فرۆشیار، بەڕێوەبردنی کۆگا، بەرزکردنەوە و کرێی فلیۆت. پاکێجی ئامادە بۆ چوونە ناو بازاڕ.",
        "b2b_cta": "هاوبەش بە · seyyare.men",
        "b2b_features": [
            ("فرۆشگای گەلەری", "پەڕەی براند و بەڕێوەبردنی کۆگا"),
            ("بەرزکردنەوە", "بووست و بینینی زیاتر بە جزدان"),
            ("فلیۆت / کۆمپانیا", "کرێی کۆ و ڕێککەوتنی گواستنەوە"),
            ("یاریدەدەری زیرەک", "دەقی ئاگاداری، نرخ و وەڵامی کڕیار"),
        ],
        "b2b_social_h": "سیارە بۆ گەلەرییەکان",
        "b2b_social_s": "کۆگا · بووست · فلیۆت — یەک پلاتفۆرم",
        "why": "بۆچی سیارە؟",
        "why_items": [
            "زمانی ناوخۆیی: عەرەبی، کوردی، تورکی",
            "نرخی عێراقی (دینار) و شارەکان",
            "مۆبایل + وێب — خێرا دەستپێکردن",
        ],
        "footer": "© سیارە · هەولێر / بەغدا · seyyare.men",
        "audience_b2c": "تاک",
        "audience_b2b": "کۆمپانیا",
        "qr_hint": "ئەپەکە بکەرەوە",
    },
}


def draw_rounded_rect(c: canvas.Canvas, x, y, w, h, r, fill=None, stroke=None, sw=0.5):
    c.saveState()
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(sw)
    p = c.beginPath()
    p.moveTo(x + r, y)
    p.lineTo(x + w - r, y)
    p.arcTo(x + w - 2 * r, y, x + w, y + 2 * r, -90, 90)
    p.lineTo(x + w, y + h - r)
    p.arcTo(x + w - 2 * r, y + h - 2 * r, x + w, y + h, 0, 90)
    p.lineTo(x + r, y + h)
    p.arcTo(x, y + h - 2 * r, x + 2 * r, y + h, 90, 90)
    p.lineTo(x, y + r)
    p.arcTo(x, y, x + 2 * r, y + 2 * r, 180, 90)
    p.close()
    if fill and stroke:
        c.drawPath(p, fill=1, stroke=1)
    elif fill:
        c.drawPath(p, fill=1, stroke=0)
    else:
        c.drawPath(p, fill=0, stroke=1)
    c.restoreState()


def text_block(c, text, x, y, font, size, color, align="left", max_width=None, leading=None):
    leading = leading or size * 1.28
    c.setFont(font, size)
    c.setFillColor(color)
    if max_width:
        words = text.split(" ")
        lines, cur = [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if c.stringWidth(trial, font, size) <= max_width:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
    else:
        lines = [text]
    yy = y
    for line in lines:
        if align == "right":
            c.drawRightString(x, yy, line)
        elif align == "center":
            c.drawCentredString(x, yy, line)
        else:
            c.drawString(x, yy, line)
        yy -= leading
    return yy


def draw_logo(c, x, y, size=22, dark=False):
    path = LOGO_DARK if dark else LOGO
    if path.exists():
        c.drawImage(str(path), x, y, width=size, height=size, mask="auto", preserveAspectRatio=True)


def brochure(lang: str, audience: str) -> Path:
    """A5 two-page flyer (front + back)."""
    cpy = COPY[lang]
    rtl = is_rtl(lang)
    font = font_for(lang)
    align = "right" if rtl else "left"
    out = OUT / f"seyyare-brosur-{audience}-{lang}.pdf"
    c = canvas.Canvas(str(out), pagesize=(A5_W, A5_H))

    # —— Front ——
    c.setFillColor(INK)
    c.rect(0, 0, A5_W, A5_H, fill=1, stroke=0)

    # Hero image
    if BG_BROCHURE.exists():
        c.drawImage(str(BG_BROCHURE), 0, A5_H * 0.38, width=A5_W, height=A5_H * 0.62, preserveAspectRatio=True, anchor="c")
    # Dark veil
    c.setFillColor(Color(0.04, 0.04, 0.05, alpha=0.55))
    c.rect(0, A5_H * 0.38, A5_W, A5_H * 0.62, fill=1, stroke=0)
    # Flame bar
    c.setFillColor(FLAME)
    c.rect(0, A5_H * 0.38 - 4, A5_W, 4, fill=1, stroke=0)

    margin = 14 * mm
    ax = A5_W - margin if rtl else margin

    draw_logo(c, margin if not rtl else A5_W - margin - 22, A5_H - 22 * mm, 20)
    brand = T(cpy["brand"], lang)
    c.setFont(font, 16)
    c.setFillColor(white)
    if rtl:
        c.drawRightString(A5_W - margin - 26, A5_H - 17 * mm, brand)
    else:
        c.drawString(margin + 26, A5_H - 17 * mm, brand)

    badge = T(cpy["b2c_kicker"] if audience == "bireysel" else cpy["b2b_kicker"], lang)
    c.setFillColor(FLAME)
    c.setFont(font, 9)
    if rtl:
        c.drawRightString(ax, A5_H - 36 * mm, badge)
    else:
        c.drawString(ax, A5_H - 36 * mm, badge)

    headline = T(cpy["b2c_headline"] if audience == "bireysel" else cpy["b2b_headline"], lang)
    text_block(
        c,
        headline,
        ax,
        A5_H - 48 * mm,
        font,
        22 if lang == "tr" else 18,
        white,
        align=align,
        max_width=A5_W - 2 * margin,
        leading=26,
    )

    # Lower paper panel
    c.setFillColor(PAPER)
    c.rect(0, 0, A5_W, A5_H * 0.38 - 4, fill=1, stroke=0)

    lead = T(cpy["b2c_lead"] if audience == "bireysel" else cpy["b2b_lead"], lang)
    text_block(
        c,
        lead,
        ax,
        A5_H * 0.38 - 16 * mm,
        font,
        9.5,
        INK,
        align=align,
        max_width=A5_W - 2 * margin,
        leading=13,
    )

    cta = T(cpy["b2c_cta"] if audience == "bireysel" else cpy["b2b_cta"], lang)
    btn_w, btn_h = A5_W - 2 * margin, 11 * mm
    draw_rounded_rect(c, margin, 12 * mm, btn_w, btn_h, 5, fill=FLAME)
    c.setFillColor(white)
    c.setFont(font, 10)
    c.drawCentredString(A5_W / 2, 12 * mm + 3.8 * mm, cta)

    c.setFillColor(MUTED)
    c.setFont(font, 7.5)
    c.drawCentredString(A5_W / 2, 6 * mm, T(cpy["tagline"], lang))

    c.showPage()

    # —— Back ——
    c.setFillColor(PAPER)
    c.rect(0, 0, A5_W, A5_H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(0, A5_H - 28 * mm, A5_W, 28 * mm, fill=1, stroke=0)
    draw_logo(c, margin if not rtl else A5_W - margin - 18, A5_H - 20 * mm, 16)
    c.setFillColor(white)
    c.setFont(font, 12)
    why = T(cpy["why"], lang)
    if rtl:
        c.drawRightString(A5_W - margin - 22, A5_H - 15 * mm, why)
    else:
        c.drawString(margin + 22, A5_H - 15 * mm, why)

    features = cpy["b2c_features"] if audience == "bireysel" else cpy["b2b_features"]
    y = A5_H - 42 * mm
    for title, desc in features:
        draw_rounded_rect(c, margin, y - 2 * mm, A5_W - 2 * margin, 22 * mm, 4, fill=white, stroke=LINE)
        c.setFillColor(FLAME)
        c.circle(margin + 7 * mm if not rtl else A5_W - margin - 7 * mm, y + 9 * mm, 2.2 * mm, fill=1, stroke=0)
        tx = margin + 14 * mm if not rtl else A5_W - margin - 14 * mm
        text_block(c, T(title, lang), tx, y + 12 * mm, font, 10, INK, align=align, max_width=A5_W - 2 * margin - 20 * mm)
        text_block(c, T(desc, lang), tx, y + 5 * mm, font, 8, MUTED, align=align, max_width=A5_W - 2 * margin - 20 * mm)
        y -= 26 * mm

    y -= 2 * mm
    c.setFillColor(INK)
    c.setFont(font, 9)
    for item in cpy["why_items"]:
        bullet = "●  " + T(item, lang) if not rtl else T(item, lang) + "  ●"
        if rtl:
            c.drawRightString(A5_W - margin, y, bullet)
        else:
            c.drawString(margin, y, bullet)
        y -= 5.5 * mm

    # Footer strip
    c.setFillColor(INK)
    c.rect(0, 0, A5_W, 16 * mm, fill=1, stroke=0)
    c.setFillColor(FLAME)
    c.rect(0, 16 * mm, A5_W, 2.5, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(font, 7.5)
    c.drawCentredString(A5_W / 2, 6.5 * mm, T(cpy["footer"], lang))

    c.save()
    return out


def social_pack(lang: str) -> Path:
    """Feed (1:1) + Story (9:16) for B2C and B2B — 4 pages PDF + PNG exports."""
    cpy = COPY[lang]
    rtl = is_rtl(lang)
    font = font_for(lang)
    align = "right" if rtl else "left"
    out = OUT / f"seyyare-sosyal-{lang}.pdf"
    c = canvas.Canvas(str(out))

    specs = [
        ("b2c", "feed", 1080, 1080, BG_SQUARE),
        ("b2c", "story", 1080, 1920, BG_STORY),
        ("b2b", "feed", 1080, 1080, BG_DARK),
        ("b2b", "story", 1080, 1920, BG_STORY),
    ]

    for audience, fmt, w, h, bg in specs:
        c.setPageSize((w, h))
        if bg.exists():
            c.drawImage(str(bg), 0, 0, width=w, height=h, preserveAspectRatio=True, anchor="c")
        else:
            c.setFillColor(INK)
            c.rect(0, 0, w, h, fill=1, stroke=0)

        # overlay gradient-ish dark panels
        c.setFillColor(Color(0.04, 0.04, 0.05, alpha=0.45))
        c.rect(0, 0, w, h, fill=1, stroke=0)

        pad = 72
        ax = w - pad if rtl else pad

        # top badge
        aud = T(cpy["audience_b2c"] if audience == "b2c" else cpy["audience_b2b"], lang)
        draw_rounded_rect(c, pad if not rtl else w - pad - 220, h - 110, 220, 44, 10, fill=FLAME)
        c.setFillColor(white)
        c.setFont(font, 18)
        c.drawCentredString((pad + 110) if not rtl else (w - pad - 110), h - 95, aud)

        draw_logo(c, pad if not rtl else w - pad - 56, h - 190, 56)
        c.setFillColor(white)
        c.setFont(font, 28)
        brand = T(cpy["brand"], lang)
        if rtl:
            c.drawRightString(w - pad - 70, h - 165, brand)
        else:
            c.drawString(pad + 70, h - 165, brand)

        headline = T(cpy["b2c_social_h"] if audience == "b2c" else cpy["b2b_social_h"], lang)
        sub = T(cpy["b2c_social_s"] if audience == "b2c" else cpy["b2b_social_s"], lang)

        hy = h * 0.52 if fmt == "story" else h * 0.42
        text_block(c, headline, ax, hy, font, 46 if lang == "tr" else 38, white, align=align, max_width=w - 2 * pad, leading=52)
        text_block(c, sub, ax, hy - 130, font, 24 if lang == "tr" else 20, HexColor("#FFB380"), align=align, max_width=w - 2 * pad, leading=30)

        # CTA bar
        cta = T(cpy["b2c_cta"] if audience == "b2c" else cpy["b2b_cta"], lang)
        bar_h = 88
        c.setFillColor(FLAME)
        c.rect(0, 0, w, bar_h + 40, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(font, 22)
        c.drawCentredString(w / 2, 48, cta)
        c.setFont(font, 16)
        c.setFillColor(SOFT)
        # domain strip above CTA
        c.setFillColor(Color(0, 0, 0, alpha=0.35))
        c.rect(0, bar_h + 40, w, 48, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont(font, 18)
        c.drawCentredString(w / 2, bar_h + 55, cpy["domain"])

        # Export PNG page via temp render: save page then rasterize with PIL from PDF later
        c.showPage()

        # Also write standalone PNG for social upload
        png_path = OUT / f"seyyare-sosyal-{audience}-{fmt}-{lang}.png"
        _render_social_png(png_path, lang, audience, fmt, w, h, bg)

    c.save()
    return out


def _render_social_png(path: Path, lang: str, audience: str, fmt: str, w: int, h: int, bg: Path):
    """Compose social creative as PNG (upload-ready)."""
    cpy = COPY[lang]
    rtl = is_rtl(lang)
    from PIL import ImageDraw, ImageFont

    if bg.exists():
        im = PILImage.open(bg).convert("RGBA").resize((w, h), PILImage.Resampling.LANCZOS)
    else:
        im = PILImage.new("RGBA", (w, h), (11, 11, 12, 255))

    overlay = PILImage.new("RGBA", (w, h), (11, 11, 12, 110))
    im = PILImage.alpha_composite(im, overlay)
    draw = ImageDraw.Draw(im)

    # Fonts
    try:
        if lang in ("ar", "ku"):
            f_brand = ImageFont.truetype("/System/Library/Fonts/SFArabic.ttf", 56)
            f_h = ImageFont.truetype("/System/Library/Fonts/SFArabic.ttf", 72 if fmt == "story" else 64)
            f_s = ImageFont.truetype("/System/Library/Fonts/SFArabic.ttf", 36)
            f_cta = ImageFont.truetype("/System/Library/Fonts/SFArabic.ttf", 34)
            f_badge = ImageFont.truetype("/System/Library/Fonts/SFArabic.ttf", 28)
        else:
            f_brand = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 56)
            f_h = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 72 if fmt == "story" else 64)
            f_s = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 36)
            f_cta = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 34)
            f_badge = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
    except OSError:
        f_brand = f_h = f_s = f_cta = f_badge = ImageFont.load_default()

    pad = 72
    aud = T(cpy["audience_b2c"] if audience == "b2c" else cpy["audience_b2b"], lang)
    badge_w = 240
    bx0 = pad if not rtl else w - pad - badge_w
    draw.rounded_rectangle([bx0, 60, bx0 + badge_w, 118], radius=14, fill=(255, 106, 0, 255))
    # center badge text
    bbox = draw.textbbox((0, 0), aud, font=f_badge)
    tw = bbox[2] - bbox[0]
    draw.text((bx0 + (badge_w - tw) / 2, 72), aud, font=f_badge, fill="white")

    # logo
    if LOGO.exists():
        logo = PILImage.open(LOGO).convert("RGBA").resize((64, 64), PILImage.Resampling.LANCZOS)
        lx = pad if not rtl else w - pad - 64
        im.paste(logo, (lx, 150), logo)

    brand = T(cpy["brand"], lang)
    by = 160
    if rtl:
        bbox = draw.textbbox((0, 0), brand, font=f_brand)
        draw.text((w - pad - 80 - (bbox[2] - bbox[0]), by), brand, font=f_brand, fill="white")
    else:
        draw.text((pad + 80, by), brand, font=f_brand, fill="white")

    headline = T(cpy["b2c_social_h"] if audience == "b2c" else cpy["b2b_social_h"], lang)
    sub = T(cpy["b2c_social_s"] if audience == "b2c" else cpy["b2b_social_s"], lang)
    hy = int(h * 0.48) if fmt == "story" else int(h * 0.40)

    def draw_wrapped(text, y, font, fill, max_w):
        words = text.split(" ")
        lines, cur = [], ""
        for word in words:
            trial = (cur + " " + word).strip()
            bb = draw.textbbox((0, 0), trial, font=font)
            if bb[2] - bb[0] <= max_w:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        yy = y
        for line in lines:
            bb = draw.textbbox((0, 0), line, font=font)
            lw = bb[2] - bb[0]
            x = (w - pad - lw) if rtl else pad
            draw.text((x, yy), line, font=font, fill=fill)
            yy += int((bb[3] - bb[1]) * 1.25)
        return yy

    ny = draw_wrapped(headline, hy, f_h, "white", w - 2 * pad)
    draw_wrapped(sub, ny + 20, f_s, (255, 179, 128), w - 2 * pad)

    # CTA at bottom (PIL y=0 is top)
    draw.rectangle([0, h - 140, w, h], fill=(255, 106, 0, 255))
    draw.rectangle([0, h - 190, w, h - 140], fill=(0, 0, 0, 160))
    cta = T(cpy["b2c_cta"] if audience == "b2c" else cpy["b2b_cta"], lang)
    bb = draw.textbbox((0, 0), cta, font=f_cta)
    draw.text(((w - (bb[2] - bb[0])) / 2, h - 100), cta, font=f_cta, fill=(11, 11, 12))
    bb2 = draw.textbbox((0, 0), cpy["domain"], font=f_s)
    draw.text(((w - (bb2[2] - bb2[0])) / 2, h - 178), cpy["domain"], font=f_s, fill="white")

    im.convert("RGB").save(path, "PNG", quality=95)


def trilingual_one_pager() -> Path:
    """Single A4 sheet with TR | AR | KU columns — quick market handout."""
    out = OUT / "seyyare-brosur-uc-dil-ozet.pdf"
    W, H = 210 * mm, 297 * mm
    c = canvas.Canvas(str(out), pagesize=(W, H))
    c.setFillColor(INK)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    if BG_DARK.exists():
        c.drawImage(str(BG_DARK), 0, H * 0.55, width=W, height=H * 0.45, preserveAspectRatio=True, anchor="c")
        c.setFillColor(Color(0.04, 0.04, 0.05, alpha=0.65))
        c.rect(0, H * 0.55, W, H * 0.45, fill=1, stroke=0)

    draw_logo(c, 18 * mm, H - 28 * mm, 24)
    c.setFillColor(white)
    c.setFont("ArialUnicode", 22)
    c.drawString(18 * mm + 30, H - 22 * mm, "Seyyare")
    c.setFillColor(FLAME)
    c.setFont("ArialUnicode", 11)
    c.drawString(18 * mm + 30, H - 28 * mm, "seyyare.men")

    c.setFillColor(white)
    c.setFont("ArialUnicode", 26)
    c.drawString(18 * mm, H - 55 * mm, "Al · Kirala · Yolculuk")
    c.setFont("SFArabic", 18)
    c.drawRightString(W - 18 * mm, H - 55 * mm, T("اشترِ · استأجر · تنقّل", "ar"))
    c.setFont("SFArabic", 16)
    c.drawCentredString(W / 2, H - 68 * mm, T("بکڕە · کرێ بکە · گەشت بکە", "ku"))

    # three columns on paper
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H * 0.55, fill=1, stroke=0)
    c.setFillColor(FLAME)
    c.rect(0, H * 0.55 - 3, W, 3, fill=1, stroke=0)

    cols = [
        ("tr", "Türkçe", 12 * mm),
        ("ar", "العربية", 75 * mm),
        ("ku", "کوردی", 138 * mm),
    ]
    col_w = 58 * mm
    for lang, label, x0 in cols:
        cpy = COPY[lang]
        font = font_for(lang)
        rtl = is_rtl(lang)
        ax = x0 + col_w - 2 * mm if rtl else x0 + 2 * mm
        align = "right" if rtl else "left"

        c.setFillColor(FLAME)
        c.setFont(font, 10)
        if rtl:
            c.drawRightString(x0 + col_w - 2 * mm, H * 0.55 - 12 * mm, T(label, lang) if lang != "tr" else label)
        else:
            c.drawString(x0 + 2 * mm, H * 0.55 - 12 * mm, label)

        y = H * 0.55 - 22 * mm
        text_block(c, T(cpy["b2c_headline"], lang), ax, y, font, 11, INK, align=align, max_width=col_w - 4 * mm, leading=14)
        y = H * 0.55 - 42 * mm
        text_block(c, T(cpy["b2c_lead"], lang), ax, y, font, 7.5, MUTED, align=align, max_width=col_w - 4 * mm, leading=10)
        y = H * 0.55 - 78 * mm
        c.setFillColor(INK)
        c.setFont(font, 8)
        for title, _ in cpy["b2c_features"]:
            line = "• " + T(title, lang) if not rtl else T(title, lang) + " •"
            if rtl:
                c.drawRightString(x0 + col_w - 2 * mm, y, line)
            else:
                c.drawString(x0 + 2 * mm, y, line)
            y -= 5 * mm

        y = 28 * mm
        c.setFillColor(FLAME)
        draw_rounded_rect(c, x0 + 1 * mm, y, col_w - 2 * mm, 9 * mm, 3, fill=FLAME)
        c.setFillColor(white)
        c.setFont(font, 7)
        c.drawCentredString(x0 + col_w / 2, y + 3 * mm, T(cpy["domain"], lang) if lang != "tr" else cpy["domain"])

        # divider
        if x0 > 12 * mm:
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.line(x0 - 2 * mm, 18 * mm, x0 - 2 * mm, H * 0.55 - 10 * mm)

    c.setFillColor(MUTED)
    c.setFont("ArialUnicode", 7)
    c.drawCentredString(W / 2, 8 * mm, "Bireysel & Kurumsal · Individual & Business · أفراد وشركات · تاک و کۆمپانیا")

    c.save()
    return out


def master_index() -> Path:
    """Cover sheet listing all deliverables."""
    out = OUT / "00-seyyare-tanitim-paketi.pdf"
    W, H = 210 * mm, 297 * mm
    c = canvas.Canvas(str(out), pagesize=(W, H))
    c.setFillColor(INK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_logo(c, 24 * mm, H - 40 * mm, 36)
    c.setFillColor(white)
    c.setFont("ArialUnicode", 28)
    c.drawString(24 * mm + 44, H - 30 * mm, "Seyyare")
    c.setFillColor(FLAME)
    c.setFont("ArialUnicode", 12)
    c.drawString(24 * mm + 44, H - 38 * mm, "Pazar giriş tanıtım paketi")

    c.setFillColor(PAPER)
    c.rect(0, 0, W, H * 0.72, fill=1, stroke=0)
    c.setFillColor(FLAME)
    c.rect(0, H * 0.72, W, 4, fill=1, stroke=0)

    items = [
        "Broşür bireysel — TR / AR / KU (A5, 2 sayfa)",
        "Broşür kurumsal — TR / AR / KU (A5, 2 sayfa)",
        "Üç dilli özet el ilanı — A4",
        "Sosyal reklam PDF — TR / AR / KU (feed + story, B2C + B2B)",
        "Sosyal PNG — yüklemeye hazır kare ve story",
    ]
    y = H * 0.72 - 20 * mm
    c.setFillColor(INK)
    c.setFont("ArialUnicode", 12)
    for it in items:
        c.setFillColor(FLAME)
        c.circle(28 * mm, y + 2, 2.5, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(34 * mm, y, it)
        y -= 12 * mm

    c.setFont("ArialUnicode", 9)
    c.setFillColor(MUTED)
    c.drawString(24 * mm, 30 * mm, "İletişim: partner@seyyare.men  ·  Web: seyyare.men")
    c.drawString(24 * mm, 22 * mm, "Renkler: Flame #FF6A00 · Ink #0B0B0C · Paper #F4F4F6")
    c.save()
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    register_fonts()
    produced = []

    produced.append(master_index())
    produced.append(trilingual_one_pager())

    for lang in ("tr", "ar", "ku"):
        produced.append(brochure(lang, "bireysel"))
        produced.append(brochure(lang, "kurumsal"))
        produced.append(social_pack(lang))

    print("Üretilen dosyalar:")
    for p in sorted(OUT.glob("*")):
        print(f"  {p.name}  ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

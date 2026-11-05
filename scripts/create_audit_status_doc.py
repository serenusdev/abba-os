from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


WORKSPACE = Path("/Users/vhaenzz-/Documents/Working/Operating System")
AUDIT = Path("/Users/vhaenzz-/Downloads/ABBA_OS_IDAROH_Full_Source_Audit_2026-11-02.md")
OUTPUT = WORKSPACE / "Laporan_Status_Implementasi_Audit_IDAROH_2026-11-03.docx"


def parse_findings() -> list[tuple[str, str]]:
    findings: list[tuple[str, str]] = []
    for line in AUDIT.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^###\s+([A-Z]+-\d+)\s+—\s+(.*)$", line)
        if match:
            findings.append((match.group(1), match.group(2).strip()))
    return findings


PARTIAL = {
    "IAM-06",
    "IAM-13",
    "ADM-08",
    "ADM-12",
    "NOT-02",
    "PLAT-01",
    "PLAT-03",
    "QUAL-01",
    "QUAL-02",
    "QUAL-03",
    "UI-01",
    "UI-04",
    "UI-07",
    "PPL-08",
    "SCH-02",
    "QUAL-07",
}

OPEN = {
    "QUAL-04",
    "QUAL-05",
}


EVIDENCE = {
    "SEC-01": "Pengecualian cron dan validasi CRON_SECRET dipisahkan dari middleware.",
    "SEC-02": "Grant penulisan laporan langsung dicabut; jalur tulis diarahkan ke RPC/action terotorisasi.",
    "SEC-03": "Review report dibatasi oleh role, assignment, dan aturan self-review.",
    "SEC-04": "Akses checklist memakai scope task, bukan akses umum authenticated.",
    "SEC-05": "Akses task turunannya dipusatkan pada pemeriksaan akses task dan scope tim.",
    "SEC-06": "Audience agenda dan pengumuman sudah dipakai dalam query aplikasi dan policy terkait.",
    "SEC-07": "Calendar feed diselaraskan dengan audience dan status event.",
    "SEC-08": "Resource Library memfilter status/visibility dan memiliki operasi admin lifecycle.",
    "SEC-09": "Scope koordinator diambil dari membership aktif dan diterapkan pada query/RPC utama.",
    "SEC-10": "Role permission seed dan role canonical diperbaiki melalui migration hardening.",
    "SEC-11": "Rate limiter dan pembatasan request publik sudah masuk ke jalur server yang relevan.",
    "SEC-12": "Mode test tidak lagi menjadi jalur identitas produksi; guard produksi ditambahkan.",
    "SEC-13": "Pembacaan profil service-role diberi scope dan status aktif.",
    "SEC-14": "Audience halaman aplikasi dan feed kalender memakai aturan yang sama.",
    "SEC-15": "Account request publik tidak lagi menjadi jalur mutasi bebas tanpa kontrol aplikasi.",
    "SEC-17": "RPC security-definer utama memeriksa anggota aktif sebelum melakukan mutasi.",
    "SEC-18": "Token calendar subscription disimpan sebagai hash dan update dibatasi ke pemilik.",
    "IAM-01": "Constraint keunikan aktif dan jalur upsert role diperbaiki.",
    "IAM-04": "Approval/rejection memeriksa hasil update dan kegagalan tidak disamarkan sebagai sukses.",
    "IAM-05": "Logout melakukan sign-out dan pembersihan device token sebelum kembali ke login.",
    "IAM-07": "Alur lupa dan pemulihan password tersedia.",
    "IAM-08": "Middleware memeriksa status profile aktif untuk route aplikasi.",
    "IAM-09": "Provisioning manual/approval dibuat lebih atomik dan error role dicatat.",
    "IAM-10": "Role utama dan role list digunakan konsisten antara session, UI, dan server action.",
    "IAM-11": "Kepemilikan email diwajibkan melalui verifikasi sebelum akun diaktifkan.",
    "ATT-01": "Koreksi presensi disimpan pada attendance_corrections dan diproses lewat workflow review.",
    "ATT-02": "Pengecualian presensi memiliki data tanggal dan jalur keputusan.",
    "ATT-03": "Validasi server untuk exception dan correction diperketat.",
    "ATT-04": "Klasifikasi presensi efektif memakai fungsi/migration tunggal berbasis data.",
    "ATT-05": "Effective attendance, snapshot, hari non-operasional, dan duty flag sudah dimodelkan.",
    "REP-01": "Kategori laporan menggunakan ID yang cocok dengan UUID database.",
    "REP-02": "Review queue menerapkan assignment dan team scope.",
    "REP-03": "Review report menggunakan jalur transaksi/guard yang mencegah write parsial.",
    "REP-04": "Report revisions diisi sebelum perubahan isi laporan.",
    "REP-05": "Tanggal laporan divalidasi terhadap tanggal operasional yang diizinkan.",
    "TSK-01": "Deadline disimpan pada model task dan ditampilkan dari data backend.",
    "TSK-02": "Assignee dibuat melalui relasi task_assignees.",
    "TSK-03": "Transisi task memakai state machine dan pemeriksaan role/scope.",
    "TSK-04": "Discussion, attachment, mention, dan history memeriksa akses task induk.",
    "TSK-05": "Pembuatan task dan assignee dibuat konsisten/atomik.",
    "TSK-06": "Perbandingan deadline disesuaikan dengan tanggal dan timezone operasional.",
    "TSK-07": "CRUD task/project dan lifecycle edit/archive sudah tersedia.",
    "TSK-08": "Status project tidak lagi menyamakan seluruh status non-active sebagai completed.",
    "TSK-09": "Task yang memerlukan review dibatasi ke reviewer yang berwenang.",
    "SCH-01": "Agenda dibatasi berdasarkan status published/active dan event yang tidak dibatalkan.",
    "SCH-03": "Audience form jadwal diteruskan ke persistence dan query.",
    "SCH-04": "Delete/archival memeriksa hasil database dan lifecycle tidak bergantung pada hard delete.",
    "SCH-05": "Validasi waktu dan identitas penyelenggara ditambahkan.",
    "SCH-06": "Audience feed dan halaman jadwal memakai filter yang konsisten.",
    "SCH-07": "Event mendukung recurrence, revision, cancel, dan notifikasi perubahan.",
    "SCH-08": "Announcement lifecycle draft/publish/archive/expiry mulai dimodelkan.",
    "PPL-01": "Presence heartbeat dan last_seen_at menggantikan status online hardcode.",
    "PPL-02": "Jumlah anggota hanya menghitung membership aktif.",
    "PPL-03": "Pemetaan people mempertahankan beberapa membership aktif per user.",
    "PPL-04": "Perubahan koordinator memakai RPC atomik.",
    "PPL-05": "RPC coordinator tidak mengaktifkan kembali riwayat membership secara sembarang.",
    "PPL-06": "Reviewer assignment memeriksa role, self-review, scope, dan menyimpan audit.",
    "PPL-07": "Constraint dan pemeriksaan duplicate active membership ditambahkan.",
    "LIB-01": "Favorite resource sudah disimpan di backend dan memiliki toggle action.",
    "LIB-02": "Search/filter Library dilakukan melalui query dan pagination yang lebih terarah.",
    "LIB-03": "Share URL menggunakan origin dan route resource yang tersedia.",
    "LIB-04": "Status sync/import tidak lagi hanya klaim UI; hasil action diperiksa.",
    "LIB-05": "Admin lifecycle dan halaman detail resource tersedia.",
    "LIB-06": "Tag resource disimpan dan disinkronkan pada import/edit.",
    "ADM-01": "Pemanggilan analytics disesuaikan dengan jalur autentikasi server.",
    "ADM-02": "Analytics koordinator menerima scope team yang berasal dari session.",
    "ADM-03": "Dashboard Yayasan dan role supervisor diselaraskan.",
    "ADM-04": "Metric query dan error handling dashboard diperbaiki.",
    "ADM-05": "Kategori export frontend/API dan download URL diselaraskan.",
    "ADM-06": "CSV export diberi perlindungan formula injection dan row count diperbarui.",
    "ADM-07": "Audit hash chain diverifikasi dari previous hash, bukan klaim tampilan saja.",
    "ADM-09": "Pergantian policy aktif dilakukan dalam transaksi dengan lock.",
    "ADM-10": "Policy aktif di-seed bila belum ada.",
    "ADM-11": "PDF export sudah wrapping, pagination, dan Unicode font.",
    "ADM-13": "Reset password dan upload avatar mengembalikan error yang dapat ditangani UI.",
    "NOT-01": "Notification inbox in-app dan unread count sudah tersedia.",
    "NOT-03": "Cron notifikasi dibuat idempotent dan memperhatikan status izin.",
    "PLAT-02": "google-services.json tersedia dan plugin Google Services terbaca pada release build.",
    "REP-06": "Review queue dasar dan assignment sudah tersedia, tetapi tab Unassigned masih perlu verifikasi UI khusus.",
}


def set_cell_shading(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), "D9D9D9")


def remove_paragraph_borders(style):
    p_pr = style._element.get_or_add_pPr()
    for border in list(p_pr.findall(qn("w:pBdr"))):
        p_pr.remove(border)


def repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    cant_split.set(qn("w:val"), "true")
    tr_pr.append(cant_split)


def add_bullet(doc, text: str, level: int = 0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.08
    p.add_run(text)
    return p


def add_status_paragraph(doc, finding_id: str, title: str, status: str, detail: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(f"{finding_id} — {status}. ")
    run.bold = True
    run.font.color.rgb = RGBColor(0, 91, 87)
    p.add_run(title + ". ")
    p.add_run(detail)


def configure_document(doc: Document):
    section = doc.sections[0]
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor(25, 35, 38)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.1
    for style_name, size in (("Title", 23), ("Heading 1", 16), ("Heading 2", 12.5), ("Heading 3", 11)):
        style = styles[style_name]
        remove_paragraph_borders(style)
        style.font.name = "Aptos Display" if style_name != "Heading 3" else "Aptos"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(12 if style_name != "Title" else 0)
        style.paragraph_format.space_after = Pt(5)
    styles["Title"].paragraph_format.space_after = Pt(6)


def add_footer(section):
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer.add_run("IDAROH · Status Implementasi Audit · 5 November 2026")
    footer_run.font.size = Pt(8)
    footer_run.font.color.rgb = RGBColor(105, 115, 118)


def main():
    findings = parse_findings()
    assert len(findings) == 109, len(findings)
    completed = [(fid, title) for fid, title in findings if fid not in PARTIAL and fid not in OPEN]
    partial = [(fid, title) for fid, title in findings if fid in PARTIAL]
    open_items = [(fid, title) for fid, title in findings if fid in OPEN]

    doc = Document()
    configure_document(doc)
    add_footer(doc.sections[0])

    title = doc.add_paragraph(style="Title")
    title.add_run("Laporan Status Implementasi Audit IDAROH")
    subtitle = doc.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(16)
    subtitle.add_run("Rekapitulasi pekerjaan selesai, pekerjaan tersisa, dan bukti verifikasi source code").italic = True

    meta = doc.add_table(rows=4, cols=2)
    meta.alignment = WD_TABLE_ALIGNMENT.LEFT
    meta.autofit = False
    meta.columns[0].width = Inches(1.65)
    meta.columns[1].width = Inches(5.85)
    set_table_borders(meta)
    rows = [
        ("Tanggal laporan", "5 November 2026"),
        ("Baseline audit", "ABBA_OS_IDAROH_Full_Source_Audit_2026-11-02.md — 109 temuan: 16 P0, 75 P1, 18 P2"),
        ("Commit terakhir", "aa6b6f3 — fix(ui): close audit follow-up gaps — setelah bf8106c auth/task hardening"),
        ("Status verifikasi", "Typecheck, lint, 48 unit test, dan build lokal lulus; browser E2E perlu dijalankan ulang setelah perbaikan login server-side"),
    ]
    for row, (key, value) in zip(meta.rows, rows):
        for cell in row.cells:
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(row.cells[0], "E6F2F1")
        row.cells[0].text = key
        row.cells[1].text = value
        row.cells[0].paragraphs[0].runs[0].bold = True
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(0, 91, 87)

    doc.add_heading("Ringkasan eksekutif", level=1)
    doc.add_paragraph(
        "Pekerjaan remediation telah menutup sebagian besar temuan keamanan dan correctness pada source code, termasuk RLS, scope koordinator, audience, lifecycle task/jadwal/resource, notifikasi durable, PDF export, migration verification, dan pipeline CI. Namun status proyek belum boleh disebut selesai total karena beberapa fitur masih terbuka atau baru terbukti pada source/disposable environment, bukan pada production dan perangkat nyata."
    )
    summary = doc.add_table(rows=1, cols=3)
    summary.alignment = WD_TABLE_ALIGNMENT.LEFT
    summary.autofit = False
    widths = [Inches(1.8), Inches(1.2), Inches(4.5)]
    for i, width in enumerate(widths):
        summary.columns[i].width = width
    set_table_borders(summary)
    headers = ["Kategori", "Jumlah", "Makna"]
    for i, value in enumerate(headers):
        cell = summary.rows[0].cells[i]
        cell.text = value
        set_cell_shading(cell, "005B57")
        set_cell_margins(cell)
        for run in cell.paragraphs[0].runs:
            run.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
    summary_rows = [
        ("Selesai di source", str(len(completed)), "Perbaikan implementasi sudah ditemukan pada source/migration dan didukung commit tertentu."),
        ("Sebagian / perlu verifikasi", str(len(partial)), "Ada implementasi, tetapi acceptance test, production behavior, atau cakupan fitur belum lengkap."),
        ("Belum selesai", str(len(open_items)), "Belum ada bukti implementasi lengkap pada source saat laporan ini dibuat."),
    ]
    for index, values in enumerate(summary_rows):
        cells = summary.add_row().cells
        for i, value in enumerate(values):
            cells[i].text = value
            set_cell_margins(cells[i])
            if index % 2 == 1:
                set_cell_shading(cells[i], "F5F8F8")
            if i == 1:
                cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_heading("Yang sudah dikerjakan", level=1)
    doc.add_paragraph(
        "Daftar berikut adalah pekerjaan yang sudah masuk ke source code atau migration. Status ini berarti perubahan telah dikerjakan di repository; status production tetap bergantung pada deployment dan pengujian yang disebut pada bagian verifikasi."
    )
    done_groups = [
        ("Security dan authorization", [
            "RLS dan grant untuk laporan, task, checklist, komentar, lampiran, mention, attendance, calendar subscription, serta notification inbox diperketat.",
            "Audience event/pengumuman dan scope koordinator diterapkan pada query server/RPC utama.",
            "RPC security-definer diberi pemeriksaan active member, role canonical, assignment, dan scope.",
            "Cron dikeluarkan dari redirect sesi middleware agar handler dapat memvalidasi CRON_SECRET sendiri.",
            "Mode test diberi guard agar mock multi-role tidak dapat menjadi identitas produksi.",
        ]),
        ("IAM dan workflow operasional", [
            "Approval/rejection akun, email verification, logout, device token revoke, role resolution, session status, dan password recovery diperbaiki.",
            "CSV import anggota memakai status processing/completed/failed dan tidak mengabaikan kegagalan pencatatan hasil akhir.",
            "Koreksi presensi, effective attendance, hari non-operasional, duty flag, review queue, dan validasi tanggal laporan ditambahkan.",
            "Tab Unassigned review menghitung laporan submitted tanpa reviewer dan memfilter hanya item yang benar-benar belum ditugaskan.",
            "Task/project memiliki deadline, assignee relation, checklist, attachment, discussion, mention, history, state transition, edit, archive, dan review guard.",
            "Jadwal/event dan pengumuman memiliki recurrence, revision, audience, lifecycle publish/archive/cancel, dan validasi waktu.",
            "People/team memakai membership aktif, heartbeat presence, RPC coordinator, dan reviewer assignment.",
        ]),
        ("Resource, notifikasi, dan admin", [
            "Resource Library memiliki filter published/visibility, favorite backend, search/tag, share URL, admin lifecycle, revision, archive, dan import resource.",
            "Importer resource mendukung legacy_record_id, deduplikasi slug/legacy ID, validasi batch, row-level error report, dan revision snapshot.",
            "Notification inbox durable, unread count, FCM device registration, idempotent cron, serta halaman uji push admin tersedia.",
            "Analytics, dashboard role, export mapping/download, CSV formula protection, audit hash verification, policy activation, dan policy seed diperbaiki.",
            "PDF export diubah menjadi Unicode-safe dan multi-page; migration `20261103000003_app_schema_grants.sql` diterapkan ke Supabase production.",
        ]),
        ("Branding, dependency, dan QA", [
            "Branding IDAROH, favicon, logo, app icon, Firebase Android configuration, dan release build configuration diperbarui.",
            "Login browser dipindahkan ke route server agar cookie sesi SSR ditulis langsung sebelum navigasi dashboard.",
            "Task visibility private/team/organization ditegakkan konsisten pada server action dan RPC akses task.",
            "Ekspor rekap akun memiliki feedback kegagalan; registrasi publik hanya menjanjikan role santri.",
            "PWA memaksa update service worker/cache version; query people dibatasi 500 baris; quick date jump kalender sudah terhubung ke date picker.",
            "Filter scope audit sudah diteruskan ke query server, CSP tidak lagi memakai unsafe-eval, dan HSTS sudah dikonfigurasi.",
            "Data kategori laporan produksi tidak lagi jatuh ke ID demo ketika query database kosong; fallback demo tetap dibatasi untuk Vitest.",
            "Dependency runtime high-severity audit bersih; lint, typecheck, unit test, Next build, dan Android release build sebelumnya lulus.",
            "CI sekarang menjalankan lint, typecheck, test, audit, build, migration dry-run, disposable Supabase reset, pgTAP RLS matrix, dan browser E2E.",
            "Seed E2E sudah menggunakan REST-only, memverifikasi profile active dan role santri, serta menyimpan log server saat E2E gagal.",
        ]),
    ]
    for heading, bullets in done_groups:
        doc.add_heading(heading, level=2)
        for bullet in bullets:
            add_bullet(doc, bullet)

    doc.add_heading("Commit penting yang sudah dipush", level=2)
    commit_lines = [
        "2afe95e — verifikasi seed user E2E dan diagnostik server log",
        "3a5b18a — perbaikan navigasi login browser dan pin Supabase CLI 2.122.0",
        "4b6c20e — seed user E2E melalui REST",
        "cc4b4ab / 1e3d9f5 — disposable Supabase dan perbaikan RLS matrix",
        "6e807fd — PDF export pagination dan Unicode",
        "de8a1ae — update dependency dan security audit",
        "194a9c5 / bdab7d9 / d426fed — report category, report writes, Resource Library import/lifecycle",
        "7401e78 / 594dc36 / b3bd6d5 / d838521 / 05f6987 — notification, IAM, task, schedule, dan device lifecycle",
    ]
    for line in commit_lines:
        add_bullet(doc, line)

    doc.add_heading("Yang belum selesai atau belum cukup terbukti", level=1)
    doc.add_paragraph(
        "Bagian ini adalah daftar pekerjaan yang masih perlu dikerjakan atau dibuktikan. Item partial tidak otomatis berarti kodenya salah; artinya bukti yang tersedia belum cukup untuk menyatakan acceptance selesai."
    )
    doc.add_heading("Belum selesai", level=2)
    open_details = {
        "IAM-02": "CSV import anggota belum menjadi provisioning Auth penuh sampai akun, profile, role, status, dan hasil per baris tercatat lengkap.",
        "IAM-03": "Status batch import harus baru menjadi completed setelah seluruh account request/provisioning berhasil; perlu transaksi dan test kegagalan parsial.",
        "IAM-12": "Label registrasi masih menjanjikan jalur pengurus sementara backend publik perlu dipastikan mendukung atau secara eksplisit membatasi role tersebut.",
        "TSK-10": "Model/query untuk task pribadi dan pembatasan team belum menjadi fitur yang lengkap dan teruji end-to-end.",
        "LIB-07": "Migrasi data Everything Library lama ke struktur resource baru belum memiliki proses migrasi data operasional yang dibuktikan.",
        "UI-02": "Quick date jump kalender belum memiliki handler/query yang dibuktikan berfungsi.",
        "UI-03": "Tombol Unduh Rekap Akun belum memiliki event/action lengkap.",
        "UI-05": "Filter scope pada audit UI belum dibuktikan benar-benar diterapkan ke query backend.",
        "UI-06": "Navigasi desktop/mobile untuk koordinator belum seluruhnya konsisten.",
        "PLAT-04": "PWA offline/service worker belum diputuskan dan diimplementasikan secara lengkap.",
        "QUAL-04": "Error query yang dipetakan menjadi array kosong/null masih perlu audit dan perbaikan menyeluruh.",
        "QUAL-05": "Validasi input server dan pengurangan tipe any belum selesai sebagai hardening menyeluruh.",
        "QUAL-06": "CSP masih perlu menghapus unsafe-eval bila memungkinkan dan menambahkan HSTS pada deployment yang tepat.",
        "QUAL-07": "Pagination dan batas data belum konsisten pada seluruh modul.",
        "QUAL-08": "Seed/placeholder belum seluruhnya dipisahkan dari data operasional production.",
        "REP-06": "Tab Unassigned masih perlu diperbaiki dan diuji agar menampilkan laporan tanpa reviewer secara akurat.",
    }
    for fid, title_text in open_items:
        add_status_paragraph(doc, fid, title_text, "BELUM SELESAI", open_details.get(fid, "Belum ada bukti implementasi lengkap pada source saat laporan ini dibuat."))

    doc.add_heading("Sebagian selesai atau perlu verifikasi", level=2)
    partial_details = {
        "IAM-06": "Session revoke dan device token sudah diperbaiki, tetapi reset seluruh sesi Auth yang benar-benar global masih perlu diuji terhadap API admin dan beberapa sesi aktif.",
        "IAM-13": "MFA lifecycle dan device token sudah ada, tetapi daftar perangkat/sesi nyata serta acceptance test MFA pada production belum lengkap.",
        "ADM-08": "Aplikasi mencatat backup manifest/row count dan cron backup; backup provider, restore drill, dan verifikasi recovery nyata belum dilakukan.",
        "ADM-12": "Audit log dan hash sudah diperkuat, tetapi filter scope dan pagination UI belum seluruhnya terbukti.",
        "NOT-02": "Lifecycle listener/token sudah diperbaiki di source, tetapi pergantian akun, permission denial, logout, dan device nyata belum diuji lengkap.",
        "PLAT-01": "Build Android release sudah lulus dan Capacitor diarahkan ke deployed web server, tetapi strategi remote web runtime versus bundled web asset belum acceptance-tested pada APK final.",
        "PLAT-03": "Branding IDAROH telah masuk source dan Firebase config tersedia, tetapi APK release terbaru perlu dibangun ulang dan diuji pada device.",
        "QUAL-01": "Test suite sudah bertambah dengan pgTAP RLS dan browser E2E, tetapi cakupan masih belum menggantikan seluruh integration/load/device test.",
        "QUAL-02": "CI sudah menjalankan lint, audit, migration, RLS, build, dan E2E; run terbaru gagal di browser login sehingga pipeline belum hijau penuh.",
        "QUAL-03": "Runtime route checks dan CI ada, tetapi browser production, role matrix production, load, dan device runtime belum selesai.",
        "UI-01": "Notification inbox dan unread count ada, tetapi seluruh tombol notifikasi desktop/mobile perlu audit interaksi satu per satu.",
        "UI-04": "Data MFA/device mulai berasal dari backend, tetapi sesi/perangkat nyata belum dapat dinyatakan lengkap.",
        "UI-07": "Status sync/online/migration sudah sebagian memakai data nyata, tetapi masih ada klaim statis yang perlu dihapus atau disambungkan.",
        "PPL-08": "CRUD dasar people/team dan riwayat sudah ada, tetapi struktur organisasi lengkap sesuai PRD belum seluruhnya tersedia.",
        "SCH-02": "Recurrence dan lifecycle jadwal sudah ada, tetapi kalender mingguan dan quick date jump belum terverifikasi sebagai pengalaman lengkap.",
    }
    for fid, title_text in partial:
        add_status_paragraph(doc, fid, title_text, "SEBAGIAN / PERLU VERIFIKASI", partial_details.get(fid, "Implementasi ada, tetapi bukti acceptance belum cukup."))

    doc.add_heading("Matriks lengkap seluruh 109 temuan", level=1)
    doc.add_paragraph(
        "Matriks berikut mempertahankan seluruh ID dan judul dari audit sumber. Status `SELESAI DI SOURCE` berarti perubahan terlihat pada repository; status itu tidak menggantikan uji production."
    )
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    table.columns[0].width = Inches(0.8)
    table.columns[1].width = Inches(1.45)
    table.columns[2].width = Inches(5.25)
    set_table_borders(table)
    for i, header in enumerate(("ID", "Status", "Temuan")):
        cell = table.rows[0].cells[i]
        cell.text = header
        set_cell_shading(cell, "005B57")
        set_cell_margins(cell, top=80, bottom=80)
        for run in cell.paragraphs[0].runs:
            run.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
    repeat_table_header(table.rows[0])
    prevent_row_split(table.rows[0])
    for index, (fid, title_text) in enumerate(findings):
        status = "BELUM SELESAI" if fid in OPEN else "SEBAGIAN / VERIFIKASI" if fid in PARTIAL else "SELESAI DI SOURCE"
        cells = table.add_row().cells
        cells[0].text = fid
        cells[1].text = status
        cells[2].text = title_text
        for cell in cells:
            set_cell_margins(cell, top=65, bottom=65, start=80, end=80)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        if index % 2 == 1:
            for cell in cells:
                set_cell_shading(cell, "F5F8F8")
        cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in cells[1].paragraphs[0].runs:
            run.bold = True
            run.font.size = Pt(8.5)
        for cell in cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(8.5)
        prevent_row_split(table.rows[-1])

    doc.add_heading("Bukti verifikasi terakhir", level=1)
    verification = [
        "Local source: typecheck lulus, lint lulus, 13 file test / 48 test lulus, Next build lulus, dan npm audit runtime high-severity menunjukkan 0 vulnerability.",
        "Android: assembleRelease sebelumnya lulus dengan JDK 17; artefak release yang sudah ada tidak dihapus atau ditimpa.",
        "Supabase: migration list production sebelumnya sinkron sampai migration app schema grants; CI disposable Supabase berhasil menjalankan seluruh migration dari nol dan 7 assertion RLS.",
        "CI run 41600038498: validate lulus, migration-check lulus, RLS matrix lulus, tetapi browser E2E gagal pada test user aktif yang seharusnya masuk dashboard; karenanya CI belum boleh disebut hijau penuh.",
        "Perubahan terakhir sudah dipush ke GitHub pada origin/main commit 2afe95e. Working tree hanya menyisakan artefak lokal android/app/release dan supabase/.temp yang dipertahankan.",
    ]
    for item in verification:
        add_bullet(doc, item)

    doc.add_heading("Pekerjaan prioritas berikutnya", level=1)
    priorities = [
        "P0: jalankan ulang browser E2E login user aktif setelah route login server-side; CI sebelumnya gagal pada login dan belum boleh disebut hijau sebelum run baru lulus.",
        "P0/P1: verifikasi CSV member provisioning pada environment nyata dari import → konfirmasi email → approval → login; status batch sudah diperbaiki di source.",
        "P1: selesaikan task pribadi/team, tab Unassigned, account export, audit scope filter, dan quick date jump.",
        "P1/P2: lakukan review menyeluruh error handling, validation, pagination, CSP/HSTS, dan pemisahan seed/placeholder.",
        "Production: jalankan backup/restore drill nyata, uji role matrix lintas akun di Supabase production, dan uji FCM pada APK release di perangkat Android nyata.",
        "Release: setelah source dan E2E stabil, rebuild signed APK dengan branding/config terbaru lalu buat GitHub Release baru dengan artefak yang benar.",
    ]
    for item in priorities:
        add_bullet(doc, item)

    doc.add_heading("Catatan batasan", level=1)
    doc.add_paragraph(
        "Dokumen ini membedakan perubahan yang sudah ada di repository dari bukti bahwa sistem telah berjalan benar di production. Supabase production, Vercel, Firebase delivery, backup provider, dan perangkat Android nyata tidak boleh dianggap tervalidasi hanya karena source code atau CI disposable environment lulus."
    )

    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()

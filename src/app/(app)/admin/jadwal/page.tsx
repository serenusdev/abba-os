"use client";

import * as React from "react";
import Link from "next/link";
import { getCurrentUserAction } from "@/modules/iam/actions";
import { UserProfile } from "@/lib/auth/types";
import { UnauthorizedState } from "@/components/ui/unauthorized-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Illustration } from "@/components/ui/illustration";
import {
  getEventsAction,
  getAnnouncementsAction,
  createEventAction,
  deleteEventAction,
  publishAnnouncementAction,
  deleteAnnouncementAction,
} from "@/modules/schedules/actions";
import type { ScheduleEventItem, AnnouncementItem, AudienceConfig } from "@/modules/schedules/types";

export default function AdminJadwalPage() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"agenda" | "pengumuman">("agenda");

  // Data states
  const [events, setEvents] = React.useState<ScheduleEventItem[]>([]);
  const [announcements, setAnnouncements] = React.useState<AnnouncementItem[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [feedbackNotice, setFeedbackNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Event form
  const [eventForm, setEventForm] = React.useState({
    title: "",
    category: "teknologi" as "teknologi" | "keagamaan" | "operasional" | "umum",
    startsAt: "",
    endsAt: "",
    location: "Lab Utama Pesantren",
    description: "",
    audienceScope: "all" as "all" | "santri" | "pengurus" | "koordinator",
  });

  // Announcement form
  const [announcementForm, setAnnouncementForm] = React.useState({
    title: "",
    bodyMarkdown: "",
    priority: "normal" as "normal" | "important",
    targetAudienceLabel: "Semua Santri & Tim",
    audienceScope: "all" as "all" | "santri" | "pengurus" | "koordinator",
  });

  const loadData = React.useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [evList, anList] = await Promise.all([
        getEventsAction(),
        getAnnouncementsAction(),
      ]);
      setEvents(evList || []);
      setAnnouncements(anList || []);
    } catch (err) {
      console.error("Gagal memuat agenda/pengumuman:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    getCurrentUserAction()
      .then((user) => {
        setCurrentUser(user);
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });

    loadData();
  }, [loadData]);

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <LoadingSpinner size="lg" />
        <p className="font-body-sm text-sm text-muted-foreground">Memverifikasi hak akses...</p>
      </div>
    );
  }

  const isAdminOrPengurus =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "yayasan" ||
    currentUser?.role === "pengurus";

  if (!isAdminOrPengurus) {
    return <UnauthorizedState requiredRole="Super Admin / Pengurus / Yayasan" />;
  }

  // Handle Event Submit
  const audienceFromScope = (scope: "all" | "santri" | "pengurus" | "koordinator"): AudienceConfig =>
    scope === "all" ? { scope: "all" } : { scope: "member_type", memberTypes: [scope] };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackNotice(null);

    const res = await createEventAction({
      title: eventForm.title,
      category: eventForm.category,
      startsAt: eventForm.startsAt,
      endsAt: eventForm.endsAt,
      location: eventForm.location,
      description: eventForm.description,
      audienceConfig: audienceFromScope(eventForm.audienceScope),
    });

    setIsSubmitting(false);
    if (res.success) {
      setFeedbackNotice({ type: "success", message: res.message });
      setIsEventModalOpen(false);
      setEventForm({
        title: "",
        category: "teknologi",
        startsAt: "",
        endsAt: "",
        location: "Lab Utama Pesantren",
        description: "",
        audienceScope: "all",
      });
      loadData();
    } else {
      setFeedbackNotice({ type: "error", message: res.message });
    }
  };

  // Handle Event Delete
  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Hapus agenda "${title}" dari jadwal?`)) return;
    const res = await deleteEventAction(id);
    if (res.success) {
      setFeedbackNotice({ type: "success", message: res.message });
      loadData();
    } else {
      setFeedbackNotice({ type: "error", message: res.message });
    }
  };

  // Handle Announcement Submit
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackNotice(null);

    const res = await publishAnnouncementAction({
      title: announcementForm.title,
      bodyMarkdown: announcementForm.bodyMarkdown,
      priority: announcementForm.priority,
      targetAudienceLabel: announcementForm.targetAudienceLabel,
      audienceConfig: audienceFromScope(announcementForm.audienceScope),
    });

    setIsSubmitting(false);
    if (res.success) {
      setFeedbackNotice({ type: "success", message: res.message });
      setIsAnnouncementModalOpen(false);
      setAnnouncementForm({
        title: "",
        bodyMarkdown: "",
        priority: "normal",
        targetAudienceLabel: "Semua Santri & Tim",
        audienceScope: "all",
      });
      loadData();
    } else {
      setFeedbackNotice({ type: "error", message: res.message });
    }
  };

  // Handle Announcement Delete
  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!confirm(`Hapus pengumuman "${title}"?`)) return;
    const res = await deleteAnnouncementAction(id);
    if (res.success) {
      setFeedbackNotice({ type: "success", message: res.message });
      loadData();
    } else {
      setFeedbackNotice({ type: "error", message: res.message });
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">
              Panel Kendali Administrator
            </span>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-label-sm text-[10px]">
              Full Akses
            </span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight mt-1">
            Kelola Jadwal Agenda &amp; Siaran Pengumuman
          </h1>
          <p className="font-body-sm text-body-sm text-muted-foreground mt-0.5">
            Tambah, perbarui, dan atur agenda kegiatan serta siaran pengumuman pondok secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "agenda" ? (
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Tambah Agenda Baru</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              <span>Siarkan Pengumuman</span>
            </button>
          )}
        </div>
      </section>

      {/* Toast Feedback */}
      {feedbackNotice && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium shadow-sm ${
            feedbackNotice.type === "success"
              ? "bg-success/15 text-success border border-success/30"
              : "bg-error/15 text-error border border-error/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {feedbackNotice.type === "success" ? "check_circle" : "error"}
            </span>
            <p>{feedbackNotice.message}</p>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab("agenda")}
          className={`pb-3 font-label-md text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "agenda"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>Agenda Kegiatan ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("pengumuman")}
          className={`pb-3 font-label-md text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "pengumuman"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          <span>Siaran Pengumuman ({announcements.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border">
          <LoadingSpinner size="md" />
          <p className="font-body-sm text-xs text-muted-foreground mt-2">Memuat data dari database...</p>
        </div>
      ) : activeTab === "agenda" ? (
        /* Agenda Table / Cards */
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 sm:p-10 text-center border border-dashed border-border flex flex-col items-center justify-center space-y-3">
              <Illustration
                src="/illustrations/undraw_done_erdp.svg"
                alt="Belum ada agenda kegiatan"
                width={130}
                height={90}
              />
              <div>
                <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                  Belum Ada Agenda Kegiatan
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                  Belum ada jadwal yang dimasukkan ke dalam database. Tambahkan agenda baru untuk santri dan pengurus.
                </p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Buat Agenda Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-card rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between space-y-3 hover:border-primary/50 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-label-sm text-[11px] uppercase tracking-wider font-semibold">
                        {evt.categoryLabel || evt.category}
                      </span>
                      <span className="font-mono text-xs text-primary font-bold">
                        {evt.timeRangeStr}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-base text-on-surface font-semibold">
                      {evt.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>{evt.location}</span>
                    </div>
                    {evt.subNote && (
                      <p className="text-xs text-muted-foreground bg-surface-container-low p-2 rounded-lg line-clamp-2">
                        {evt.subNote}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <Link
                      href="/jadwal"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-label-sm"
                    >
                      <span>Lihat Tampilan Publik</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(evt.id, evt.title)}
                      className="h-8 px-2.5 rounded-lg text-error hover:bg-error/10 font-label-sm text-xs flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Announcements Table / Cards */
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 sm:p-10 text-center border border-dashed border-border flex flex-col items-center justify-center space-y-3">
              <Illustration
                src="/illustrations/undraw_mail-sent_dagx.svg"
                alt="Belum ada siaran pengumuman"
                width={120}
                height={85}
              />
              <div>
                <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                  Belum Ada Siaran Pengumuman
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                  Kirim pengumuman penting untuk santri dan tim pondok. Pengumuman penting akan disematkan di beranda.
                </p>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Buat Pengumuman Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-xs flex flex-col space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-label-sm text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-[13px]">push_pin</span>
                            Disematkan
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-muted-foreground font-label-sm text-[11px]">
                          {ann.targetAudienceLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ann.publishedAtStr}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-base text-on-surface font-semibold">
                        {ann.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                      className="h-8 px-2.5 rounded-lg text-error hover:bg-error/10 font-label-sm text-xs flex items-center gap-1 shrink-0 transition-colors"
                      title="Hapus Pengumuman"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed bg-surface-container-low p-3 rounded-lg whitespace-pre-wrap">
                    {ann.bodyMarkdown}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tambah Agenda Baru */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">event</span>
                <h3 className="font-headline-sm text-lg text-on-surface font-semibold">
                  Tambah Agenda Kegiatan Baru
                </h3>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Judul Agenda <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Contoh: Kajian Kitab Kuning Pagi atau Workshop IT"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Kategori Agenda
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        category: e.target.value as "teknologi" | "keagamaan" | "operasional" | "umum",
                      })
                    }
                    className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="teknologi">Teknologi &amp; Koding</option>
                    <option value="keagamaan">Kajian &amp; Ibadah</option>
                    <option value="operasional">Operasional Pesantren</option>
                    <option value="umum">Umum</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Lokasi Kegiatan <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="Contoh: Lab Komputer / Masjid Jami"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Waktu Mulai <span className="text-error">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startsAt}
                    onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                    className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-xs sm:text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Waktu Selesai <span className="text-error">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endsAt}
                    onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                    className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-xs sm:text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Deskripsi / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Catatan materi, pemateri, atau persiapan peserta..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Sasaran Peserta (granular)
                </label>
                <select
                  value={eventForm.audienceScope}
                  onChange={(e) => setEventForm({ ...eventForm, audienceScope: e.target.value as typeof eventForm.audienceScope })}
                  className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">Semua anggota aktif</option>
                  <option value="santri">Santri saja</option>
                  <option value="pengurus">Pengurus saja</option>
                  <option value="koordinator">Koordinator saja</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted font-label-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs shadow-xs hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting && <LoadingSpinner size="sm" />}
                  <span>Simpan Agenda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Buat Pengumuman Baru */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">campaign</span>
                <h3 className="font-headline-sm text-lg text-on-surface font-semibold">
                  Siarkan Pengumuman Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Judul Pengumuman <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                  placeholder="Contoh: Pembaruan SOP Lab Komputer atau Pengumuman Libur"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Prioritas Siaran
                  </label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        priority: e.target.value as "normal" | "important",
                      })
                    }
                    className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Penting (Sematkan di Beranda)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-on-surface font-medium">
                    Target Audiens
                  </label>
                  <input
                    type="text"
                    value={announcementForm.targetAudienceLabel}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        targetAudienceLabel: e.target.value,
                      })
                    }
                    placeholder="Semua Santri & Tim"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Target Audiens Granular
                </label>
                <select
                  value={announcementForm.audienceScope}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, audienceScope: e.target.value as typeof announcementForm.audienceScope })}
                  className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">Semua anggota aktif</option>
                  <option value="santri">Santri saja</option>
                  <option value="pengurus">Pengurus saja</option>
                  <option value="koordinator">Koordinator saja</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-label-sm text-xs text-on-surface font-medium">
                  Isi Pesan Pengumuman <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={announcementForm.bodyMarkdown}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      bodyMarkdown: e.target.value,
                    })
                  }
                  placeholder="Tuliskan isi pengumuman lengkap secara jelas..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted font-label-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs shadow-xs hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting && <LoadingSpinner size="sm" />}
                  <span>Terbitkan Pengumuman</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

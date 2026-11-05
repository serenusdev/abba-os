'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-sand-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-forest-100 dark:bg-forest-950/50 text-forest-700 dark:text-forest-400 flex items-center justify-center mb-6 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-6.364m0 0a9 9 0 012.828-6.364m2.829 2.829a5 5 0 012.828 6.364M3 3l18 18"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Koneksi Internet Terputus
      </h1>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">
        Pondok OS tidak dapat terhubung ke server. Periksa jaringan internet Anda atau coba muat ulang halaman ini.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
      >
        Coba Muat Ulang
      </button>
    </div>
  );
}


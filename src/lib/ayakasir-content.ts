export type AyaKasirLocale = "en" | "id";

type PrivacySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  contactEmail?: string;
};

type AyaKasirCopy = {
  appName: string;
  nav: {
    home: string;
    privacyPolicy: string;
    deleteAccount: string;
    simulator: string;
    login: string;
  };
  hero: {
    eyebrow: string;
    titlePrefix: string;
    titleSuffix: string;
    typingWords: string[];
    subtitle: string;
    ctaPlayStore: string;
    ctaLogin: string;
  };
  features: {
    eyebrow: string;
    title: string;
    items: { title: string; description: string }[];
  };
  privacyPolicy: {
    title: string;
    intro: string;
    lastUpdated: string;
    sections: PrivacySection[];
  };
  deleteAccount: {
    eyebrow: string;
    title: string;
    subtitle: string;
    form: {
      emailLabel: string;
      emailPlaceholder: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      submit: string;
      success: string;
      error: string;
      deliveryError: string;
    };
    manualTitle: string;
    manualText: string;
    note: string;
  };
  simulator: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  footer: {
    note: string;
    privacyUrl: string;
    deleteUrl: string;
    privacy: string;
    deleteAccount: string;
  };
};

const ayakasirCopy: Record<AyaKasirLocale, AyaKasirCopy> = {
  en: {
    appName: "AyaKasir",
    nav: {
      home: "Home",
      privacyPolicy: "Privacy Policy",
      deleteAccount: "Delete Account",
      simulator: "Try Simulator",
      login: "Login"
    },
    hero: {
      eyebrow: "AyaKasir — Ultra-light ERP for Indonesian SMEs",
      titlePrefix: "Manage your ",
      titleSuffix: " in one app.",
      typingWords: ["purchases", "inventory", "menu", "customers", "cashier", "sales"],
      subtitle:
        "Running a small business is already hard enough. AyaKasir keeps things simple — one app for your FnB, retail, or service business. No complicated setup, no extra cost. Just what you need to run smoothly, every day.",
      ctaPlayStore: "Get it on Google Play",
      ctaLogin: "Open Dashboard"
    },
    features: {
      eyebrow: "One Flow, End to End",
      title: "From buying stock to closing sales — all connected.",
      items: [
        {
          title: "Purchasing",
          description:
            "Record goods received from vendors, track costs, and auto-update your stock. No more manual notebooks."
        },
        {
          title: "Inventory",
          description:
            "Always know what's left. Stock adjusts automatically after every sale or goods receiving — even down to raw ingredients with BOM tracking."
        },
        {
          title: "Menu & Products",
          description:
            "Set up your menu or product catalog once. Organize by category, add variants, and manage raw material components easily."
        },
        {
          title: "Customers & Debt",
          description:
            "Track customer credit (utang) and payment status. Know who owes what, and settle debts with a tap."
        },
        {
          title: "Cashier (POS)",
          description:
            "Fast, smooth transactions on Android. Support for cash, QRIS, and credit. Works offline too."
        },
        {
          title: "Dashboard & Reports",
          description:
            "See your sales, cash balance, and top products at a glance — on your phone or the web dashboard."
        }
      ]
    },
    simulator: {
      eyebrow: "Try It Now",
      title: "Experience AyaKasir in your browser.",
      subtitle:
        "No download needed. Try the full POS experience with sample data — manage products, make transactions, and explore the dashboard.",
      cta: "Open Simulator",
    },
    privacyPolicy: {
      title: "Privacy Policy",
      intro:
        "AyaKasir, developed by Petalytix, is committed to protecting the privacy and personal data of its users. This policy explains what data we collect, how we use it, and your rights as a user.",
      lastUpdated: "Last updated: March 2026",
      sections: [
        {
          title: "1. Information We Collect",
          paragraphs: [
            "When you use AyaKasir, we may collect the following types of data:"
          ],
          bullets: [
            "Account information: email address, display name, and password hash.",
            "Restaurant information: restaurant name, address, and Restaurant ID.",
            "Google account data (if you use Google Sign-In): your Google account ID and email address.",
            "Transaction data: sales records, product names, quantities, and payment methods.",
            "Inventory data: stock levels, product components, vendor records.",
            "Device information: device type and operating system, used for compatibility and support."
          ]
        },
        {
          title: "2. How We Use Your Data",
          paragraphs: ["Your data is used to:"],
          bullets: [
            "Provide and maintain the AyaKasir application and its features.",
            "Sync your data across devices via our Supabase backend.",
            "Send account-related emails such as email verification and password reset.",
            "Improve app performance and diagnose issues.",
            "Respond to account deletion and support requests."
          ]
        },
        {
          title: "3. Data Storage",
          paragraphs: [
            "Your data is stored on Supabase, a secure cloud platform hosted on AWS. A local copy is maintained on your device for offline access. We do not store your data on any other servers.",
            "We do not sell your data to third parties."
          ]
        },
        {
          title: "4. Google Sign-In",
          paragraphs: [
            "AyaKasir supports Google Sign-In via Google Credential Manager. When you sign in with Google, we receive your Google account ID and email address. We do not receive access to your Google Drive, Gmail, or other Google services."
          ]
        },
        {
          title: "5. Third-Party Services",
          paragraphs: [
            "AyaKasir uses the following third-party services:"
          ],
          bullets: [
            "Supabase (supabase.com) — database, authentication, and file storage.",
            "Google Sign-In — optional login method via Google accounts."
          ]
        },
        {
          title: "6. Data Retention",
          paragraphs: [
            "We retain your data as long as your account is active or as needed to provide services. If you request account deletion, your data will be permanently removed from our servers within 7 business days."
          ]
        },
        {
          title: "7. Your Rights",
          paragraphs: ["You have the right to:"],
          bullets: [
            "Access the personal data we hold about you.",
            "Request correction of inaccurate data.",
            "Request deletion of your account and all associated data.",
            "Withdraw consent for data processing."
          ]
        },
        {
          title: "8. Account Deletion",
          paragraphs: [
            "You can request deletion of your account and all associated data by submitting a request through the Delete Account page on this website, or by sending an email to:"
          ],
          contactEmail: "ayakasir@petalytix.id"
        },
        {
          title: "9. Children's Privacy",
          paragraphs: [
            "AyaKasir is intended for use by business owners and staff. We do not knowingly collect personal data from children under 13."
          ]
        },
        {
          title: "10. Changes to This Policy",
          paragraphs: [
            "We may update this privacy policy from time to time. Changes will be posted on this page with an updated date."
          ]
        },
        {
          title: "11. Contact",
          paragraphs: [
            "If you have questions about this privacy policy, please contact us at:"
          ],
          contactEmail: "ayakasir@petalytix.id"
        }
      ]
    },
    deleteAccount: {
      eyebrow: "Account management",
      title: "Request Account Deletion",
      subtitle:
        "Submit your request to permanently delete your AyaKasir account and all associated data. Your request will be processed within 7 business days.",
      form: {
        emailLabel: "Registered email address",
        emailPlaceholder: "email@example.com",
        reasonLabel: "Reason for deletion (optional)",
        reasonPlaceholder: "Let us know why you want to delete your account",
        submit: "Submit deletion request",
        success:
          "Your request has been received. We will process your account deletion within 7 business days.",
        error: "Please enter your email address.",
        deliveryError:
          "Your request could not be sent. Please email us directly at ayakasir@petalytix.id."
      },
      manualTitle: "Prefer to email us directly?",
      manualText:
        "Send a deletion request from your registered email address to:",
      note: "Note: Deleting your account will permanently remove all your restaurant data, transactions, products, and inventory. This action cannot be undone."
    },
    footer: {
      note: "AyaKa$ir by Petalytix | 2026",
      privacyUrl: "/en/privacy-policy",
      deleteUrl: "/en/delete-account-request",
      privacy: "Privacy Policy",
      deleteAccount: "Delete Account"
    }
  },
  id: {
    appName: "AyaKasir",
    nav: {
      home: "Beranda",
      privacyPolicy: "Kebijakan Privasi",
      deleteAccount: "Hapus Akun",
      simulator: "Coba Simulator",
      login: "Masuk"
    },
    hero: {
      eyebrow: "AyaKasir — ERP Ringan untuk UMKM Indonesia",
      titlePrefix: "Kelola ",
      titleSuffix: " dalam satu aplikasi.",
      typingWords: ["pembelian", "stok", "menu", "pelanggan", "kasir", "penjualan"],
      subtitle:
        "Bisnis kecil sudah cukup banyak tantangannya. AyaKasir bikin semuanya simpel — satu aplikasi untuk usaha FnB, retail, atau jasa kamu. Tanpa setup ribet, tanpa biaya tambahan. Cukup yang kamu butuhkan untuk jalan tiap hari.",
      ctaPlayStore: "Unduh di Google Play",
      ctaLogin: "Buka Dashboard"
    },
    features: {
      eyebrow: "Satu Alur, Dari Awal Sampai Akhir",
      title: "Dari beli stok sampai tutup kasir — semua terhubung.",
      items: [
        {
          title: "Pembelian",
          description:
            "Catat barang masuk dari vendor, pantau biaya, dan stok langsung terupdate otomatis. Gak perlu buku catatan lagi."
        },
        {
          title: "Inventaris",
          description:
            "Selalu tahu sisa stok kamu. Stok menyesuaikan otomatis setiap ada penjualan atau barang masuk — termasuk bahan baku lewat fitur BOM."
        },
        {
          title: "Menu & Produk",
          description:
            "Atur menu atau katalog produk sekali. Kelompokkan per kategori, tambah varian, dan atur komponen bahan baku dengan mudah."
        },
        {
          title: "Pelanggan & Hutang",
          description:
            "Pantau kredit pelanggan (utang) dan status pembayaran. Tahu siapa yang belum bayar, dan lunasi dengan satu ketukan."
        },
        {
          title: "Kasir (POS)",
          description:
            "Transaksi cepat dan lancar di Android. Mendukung tunai, QRIS, dan hutang. Bisa offline juga."
        },
        {
          title: "Dashboard & Laporan",
          description:
            "Lihat penjualan, saldo kas, dan produk terlaris sekilas — dari HP atau dashboard web kamu."
        }
      ]
    },
    simulator: {
      eyebrow: "Coba Sekarang",
      title: "Rasakan AyaKasir langsung di browser.",
      subtitle:
        "Tanpa perlu download. Coba pengalaman kasir lengkap dengan data contoh — kelola produk, buat transaksi, dan jelajahi dashboard.",
      cta: "Buka Simulator",
    },
    privacyPolicy: {
      title: "Kebijakan Privasi",
      intro:
        "AyaKasir, dikembangkan oleh Petalytix, berkomitmen untuk melindungi privasi dan data pribadi penggunanya. Kebijakan ini menjelaskan data apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak-hakmu sebagai pengguna.",
      lastUpdated: "Terakhir diperbarui: Maret 2026",
      sections: [
        {
          title: "1. Data yang Kami Kumpulkan",
          paragraphs: [
            "Saat kamu menggunakan AyaKasir, kami dapat mengumpulkan jenis data berikut:"
          ],
          bullets: [
            "Informasi akun: alamat email, nama tampilan, dan hash kata sandi.",
            "Informasi restoran: nama restoran, alamat, dan ID Restoran.",
            "Data akun Google (jika menggunakan Google Sign-In): ID akun Google dan alamat email.",
            "Data transaksi: catatan penjualan, nama produk, jumlah, dan metode pembayaran.",
            "Data inventaris: stok, komponen produk, dan catatan vendor.",
            "Informasi perangkat: jenis perangkat dan sistem operasi, digunakan untuk kompatibilitas dan dukungan."
          ]
        },
        {
          title: "2. Cara Kami Menggunakan Datamu",
          paragraphs: ["Datamu digunakan untuk:"],
          bullets: [
            "Menyediakan dan memelihara aplikasi AyaKasir beserta fitur-fiturnya.",
            "Menyinkronkan datamu ke berbagai perangkat melalui backend Supabase kami.",
            "Mengirim email terkait akun seperti verifikasi email dan reset kata sandi.",
            "Meningkatkan performa aplikasi dan mendiagnosis masalah.",
            "Merespons permintaan penghapusan akun dan dukungan."
          ]
        },
        {
          title: "3. Penyimpanan Data",
          paragraphs: [
            "Datamu disimpan di Supabase, platform cloud aman yang dihosting di AWS. Salinan lokal disimpan di perangkatmu untuk akses offline. Kami tidak menyimpan datamu di server lain.",
            "Kami tidak menjual datamu kepada pihak ketiga."
          ]
        },
        {
          title: "4. Google Sign-In",
          paragraphs: [
            "AyaKasir mendukung Google Sign-In melalui Google Credential Manager. Saat kamu masuk dengan Google, kami menerima ID akun Google dan alamat emailmu. Kami tidak mendapatkan akses ke Google Drive, Gmail, atau layanan Google lainnya."
          ]
        },
        {
          title: "5. Layanan Pihak Ketiga",
          paragraphs: ["AyaKasir menggunakan layanan pihak ketiga berikut:"],
          bullets: [
            "Supabase (supabase.com) — database, autentikasi, dan penyimpanan file.",
            "Google Sign-In — metode login opsional melalui akun Google."
          ]
        },
        {
          title: "6. Retensi Data",
          paragraphs: [
            "Kami menyimpan datamu selama akunmu aktif atau selama diperlukan untuk menyediakan layanan. Jika kamu meminta penghapusan akun, datamu akan dihapus secara permanen dari server kami dalam 7 hari kerja."
          ]
        },
        {
          title: "7. Hak-Hakmu",
          paragraphs: ["Kamu memiliki hak untuk:"],
          bullets: [
            "Mengakses data pribadi yang kami simpan tentangmu.",
            "Meminta koreksi data yang tidak akurat.",
            "Meminta penghapusan akun dan semua data yang terkait.",
            "Menarik persetujuan untuk pemrosesan data."
          ]
        },
        {
          title: "8. Penghapusan Akun",
          paragraphs: [
            "Kamu dapat meminta penghapusan akun dan semua data yang terkait dengan mengajukan permintaan melalui halaman Hapus Akun di situs ini, atau dengan mengirim email ke:"
          ],
          contactEmail: "ayakasir@petalytix.id"
        },
        {
          title: "9. Privasi Anak-Anak",
          paragraphs: [
            "AyaKasir ditujukan untuk pemilik bisnis dan staf. Kami tidak secara sadar mengumpulkan data pribadi dari anak-anak di bawah 13 tahun."
          ]
        },
        {
          title: "10. Perubahan Kebijakan",
          paragraphs: [
            "Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan akan dipublikasikan di halaman ini dengan tanggal pembaruan."
          ]
        },
        {
          title: "11. Kontak",
          paragraphs: [
            "Jika kamu memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di:"
          ],
          contactEmail: "ayakasir@petalytix.id"
        }
      ]
    },
    deleteAccount: {
      eyebrow: "Manajemen akun",
      title: "Permintaan Penghapusan Akun",
      subtitle:
        "Ajukan permintaan untuk menghapus akun AyaKasir dan semua data yang terkait secara permanen. Permintaanmu akan diproses dalam 7 hari kerja.",
      form: {
        emailLabel: "Alamat email terdaftar",
        emailPlaceholder: "email@contoh.com",
        reasonLabel: "Alasan penghapusan (opsional)",
        reasonPlaceholder: "Beritahu kami mengapa kamu ingin menghapus akun",
        submit: "Kirim permintaan penghapusan",
        success:
          "Permintaanmu telah diterima. Kami akan memproses penghapusan akunmu dalam 7 hari kerja.",
        error: "Mohon masukkan alamat emailmu.",
        deliveryError:
          "Permintaanmu tidak dapat dikirim. Silakan email kami langsung di ayakasir@petalytix.id."
      },
      manualTitle: "Lebih suka mengirim email langsung?",
      manualText:
        "Kirim permintaan penghapusan dari alamat email terdaftarmu ke:",
      note: "Catatan: Menghapus akun akan menghapus secara permanen semua data restoranmu, termasuk transaksi, produk, dan inventaris. Tindakan ini tidak dapat dibatalkan."
    },
    footer: {
      note: "AyaKasir by Petalytix | 2026",
      privacyUrl: "/id/privacy-policy",
      deleteUrl: "/id/delete-account-request",
      privacy: "Kebijakan Privasi",
      deleteAccount: "Hapus Akun"
    }
  }
};

export type AyaKasirCopyType = AyaKasirCopy;

export function getAyaKasirCopy(locale: string): AyaKasirCopy {
  if (locale === "id") return ayakasirCopy.id;
  return ayakasirCopy.en;
}

export function isAyaKasirLocale(value: string): value is AyaKasirLocale {
  return value === "en" || value === "id";
}

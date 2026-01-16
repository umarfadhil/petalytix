export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];

export const contactInfo = {
  email: "contact@petalytix.id",
  phone: "+62 856 1150 601",
  city: "Bogor",
  country: "Indonesia",
  coordinates: "-6.5699888, 106.773595"
};

export const siteCopy = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      portfolio: "Portfolio",
      contact: "Contact",
      admin: "Admin"
    },
    hero: {
      eyebrow: "Location based solutions",
      title: "Location based intelligence for modern business decisions.",
      subtitle:
        "Petalytix is a showcase portfolio focused on geo analytics, review intelligence, and mapping experiences. It turns Google Maps signals into clear actions for multi location teams.",
      ctaPrimary: "View portfolio",
      ctaSecondary: "Contact",
      badge: "Based in Bogor, Indonesia"
    },
    sections: {
      metricsTitle: "Footprint",
      metricsSubtitle:
        "Experience across multi branch businesses and high volume review data.",
      capabilitiesTitle: "Capabilities",
      capabilitiesSubtitle:
        "A focused toolset for turning location data into decisions.",
      projectsTitle: "Selected work",
      projectsSubtitle:
        "A short list of projects that blend mapping, reviews, and decision making.",
      processTitle: "Method",
      processSubtitle:
        "A clear flow from data collection to delivery."
    },
    labels: {
      email: "Email",
      phone: "Phone",
      location: "Location",
      sendEmail: "Send email",
      callNow: "Call now",
      message: "Message",
      responseNote: "Response within 1 to 2 business days.",
      noProjects: "No projects yet",
      addFirstProject: "Add the first portfolio item from the admin dashboard.",
      goToAdmin: "Go to admin",
      live: "Live",
      caseStudy: "Case study",
      backToPortfolio: "Back to portfolio",
      downloadPdf: "Download PDF",
      gallery: "Gallery",
      preview: "Preview",
      openInNewTab: "Open in new tab",
      close: "Close"
    },
    form: {
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "name@email.com",
      phoneLabel: "Phone",
      phonePlaceholder: "08xx",
      companyLabel: "Company",
      companyPlaceholder: "Company",
      messageLabel: "Message",
      messagePlaceholder: "Write your message",
      submit: "Send message",
      success: "Message received. Thank you.",
      error: "Please complete the required fields.",
      deliveryError: "Message could not be delivered yet. Please try again later."
    },
    metrics: [
      { value: "10+", label: "Businesses" },
      { value: "50+", label: "Branches" },
      { value: "5000+", label: "Reviews" },
      { value: "100%", label: "Positive feedback" }
    ],
    capabilities: [
      {
        title: "Geo data pipelines",
        description:
          "Collect, clean, and normalize location data from Google Maps and review sources."
      },
      {
        title: "Review intelligence",
        description:
          "Sentiment scoring and topic clustering that explain what drives ratings."
      },
      {
        title: "Market coverage mapping",
        description:
          "Visualize demand gaps, competitor density, and opportunity zones."
      },
      {
        title: "Decision dashboards",
        description:
          "Turn analytics into clear dashboards for teams and owners."
      }
    ],
    process: [
      {
        title: "Collect",
        description:
          "Scrape and ingest reviews, ratings, and location metadata."
      },
      {
        title: "Refine",
        description: "Clean and standardize data for analysis."
      },
      {
        title: "Model",
        description: "Score sentiment and compute geo metrics."
      },
      {
        title: "Deliver",
        description: "Publish dashboards and reports that guide action."
      }
    ],
    about: {
      title: "About Petalytix",
      subtitle:
        "A showcase of location based insight work, built from real operational problems.",
      story:
        "The founder of Petalytix holds an MSc in Business Analytics and Decision Sciences and has built dashboards for 30+ branches, plus analyzed user feedback from apps with 10M+ downloads and 1M reviews. The mission is to help businesses, especially SMEs, adopt data driven decisions in Indonesia.",
      invite:
        "If your team needs help with location analytics or review intelligence, reach out anytime."
    },
    portfolio: {
      title: "Portfolio",
      subtitle:
        "Two focused projects that translate location data into business clarity."
    },
    contact: {
      title: "Contact",
      subtitle:
        "Share your location based challenge or collaboration idea."
    },
    footer: {
      note: "Petalytix Indonesia | 2025",
      privacy: "Privacy policy",
      privacyUrl: "/en/privacy-policy"
    }
  },
  id: {
    nav: {
      home: "Beranda",
      about: "Tentang",
      portfolio: "Portofolio",
      contact: "Kontak",
      admin: "Admin"
    },
    hero: {
      eyebrow: "Solusi berbasis lokasi",
      title: "Intelijen berbasis lokasi untuk keputusan bisnis modern.",
      subtitle:
        "Petalytix adalah portofolio yang fokus pada geo analytics, review intelligence, dan pengalaman mapping. Data Google Maps diolah menjadi aksi yang jelas untuk tim multi lokasi.",
      ctaPrimary: "Lihat portofolio",
      ctaSecondary: "Kontak",
      badge: "Berbasis di Bogor, Indonesia"
    },
    sections: {
      metricsTitle: "Jejak kerja",
      metricsSubtitle:
        "Pengalaman pada bisnis multi cabang dan volume ulasan tinggi.",
      capabilitiesTitle: "Kapabilitas",
      capabilitiesSubtitle:
        "Toolset fokus untuk mengubah data lokasi menjadi keputusan.",
      projectsTitle: "Karya pilihan",
      projectsSubtitle:
        "Daftar singkat proyek yang memadukan mapping, ulasan, dan keputusan bisnis.",
      processTitle: "Metode",
      processSubtitle:
        "Alur jelas dari pengambilan data hingga penyajian."
    },
    labels: {
      email: "Email",
      phone: "Telepon",
      location: "Lokasi",
      sendEmail: "Kirim email",
      callNow: "Telepon sekarang",
      message: "Pesan",
      responseNote: "Balasan dalam 1 sampai 2 hari kerja.",
      noProjects: "Belum ada proyek",
      addFirstProject: "Tambahkan portofolio pertama lewat dashboard admin.",
      goToAdmin: "Buka admin",
      live: "Live",
      caseStudy: "Studi kasus",
      backToPortfolio: "Kembali ke portofolio",
      downloadPdf: "Unduh PDF",
      gallery: "Galeri",
      preview: "Pratinjau",
      openInNewTab: "Buka tab baru",
      close: "Tutup"
    },
    form: {
      nameLabel: "Nama",
      namePlaceholder: "Nama Anda",
      emailLabel: "Email",
      emailPlaceholder: "nama@email.com",
      phoneLabel: "Telepon",
      phonePlaceholder: "08xx",
      companyLabel: "Perusahaan",
      companyPlaceholder: "Perusahaan",
      messageLabel: "Pesan",
      messagePlaceholder: "Tulis pesan Anda",
      submit: "Kirim pesan",
      success: "Pesan diterima. Terima kasih.",
      error: "Mohon lengkapi kolom wajib.",
      deliveryError: "Pesan belum dapat dikirim. Silakan coba lagi nanti."
    },
    metrics: [
      { value: "10+", label: "Bisnis" },
      { value: "50+", label: "Cabang" },
      { value: "5000+", label: "Ulasan" },
      { value: "100%", label: "Tanggapan positif" }
    ],
    capabilities: [
      {
        title: "Pipeline data geo",
        description:
          "Mengumpulkan, membersihkan, dan menormalkan data lokasi dari Google Maps dan sumber ulasan."
      },
      {
        title: "Review intelligence",
        description:
          "Skor sentimen dan klaster topik untuk menjelaskan pemicu rating."
      },
      {
        title: "Pemetaan cakupan pasar",
        description:
          "Memetakan celah permintaan, kepadatan kompetitor, dan zona peluang."
      },
      {
        title: "Dashboard keputusan",
        description:
          "Mengubah analitik menjadi dashboard yang jelas untuk tim dan pemilik."
      }
    ],
    process: [
      {
        title: "Kumpulkan",
        description: "Scrape dan ingest ulasan, rating, dan metadata lokasi."
      },
      {
        title: "Rapikan",
        description: "Bersihkan dan standarkan data untuk analisis."
      },
      {
        title: "Modelkan",
        description: "Skor sentimen dan hitung metrik geo."
      },
      {
        title: "Sajikan",
        description: "Publikasikan dashboard dan laporan yang mudah ditindak."
      }
    ],
    about: {
      title: "Tentang Petalytix",
      subtitle:
        "Portofolio solusi berbasis lokasi yang berangkat dari kebutuhan operasional nyata.",
      story:
        "Founder Petalytix memiliki MSc Business Analytics and Decision Sciences serta pengalaman membangun dashboard untuk 30+ cabang, juga menganalisis umpan balik pengguna dari aplikasi dengan 10M+ unduhan dan 1M ulasan. Misinya membantu bisnis, terutama UMKM, memakai keputusan berbasis data di Indonesia.",
      invite:
        "Jika tim Anda membutuhkan bantuan analitik lokasi atau review intelligence, silakan kontak kapan saja."
    },
    portfolio: {
      title: "Portofolio",
      subtitle:
        "Dua proyek fokus yang menerjemahkan data lokasi menjadi kejelasan bisnis."
    },
    contact: {
      title: "Kontak",
      subtitle: "Bagikan tantangan berbasis lokasi atau ide kolaborasi."
    },
    footer: {
      note: "Petalytix Indonesia | 2025",
      privacy: "Kebijakan privasi",
      privacyUrl: "/id/kebijakan-privasi"
    }
  }
} satisfies Record<Locale, unknown>;

export type SiteCopy = typeof siteCopy.en;

export function getCopy(locale: string): SiteCopy {
  if (locale === "id") {
    return siteCopy.id;
  }
  return siteCopy.en;
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

import { Locale } from "@/lib/content";

type PrivacySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  contactEmail?: string;
};

type PrivacyPolicy = {
  title: string;
  intro: string;
  sections: PrivacySection[];
};

const privacyPolicy: Record<Locale, PrivacyPolicy> = {
  en: {
    title: "Privacy Policy",
    intro:
      "Petalytix is committed to protecting the privacy and personal data of our service users. This document explains how we collect, use, and safeguard your information.",
    sections: [
      {
        title: "1. Information We Collect",
        paragraphs: ["We may collect:"],
        bullets: [
          "Account information such as name, email, phone number, and payment details.",
          "Operational data needed to provide our services, such as report preferences or dashboard configurations.",
          "Public data available on Google Maps, including reviews, ratings, photos, and business information (we do not collect private account data)."
        ]
      },
      {
        title: "2. How We Use Information",
        paragraphs: ["The collected information is used to:"],
        bullets: [
          "Provide analysis services and reports according to your needs.",
          "Develop, improve, and customize Petalytix features.",
          "Provide customer support and send service-related information.",
          "Comply with applicable legal obligations."
        ]
      },
      {
        title: "3. Public Data from Google Maps",
        paragraphs: [
          "Petalytix only processes public data available on Google Maps and does not access or modify information protected by personal accounts. This data is used solely for analysis purposes."
        ]
      },
      {
        title: "4. Data Protection",
        paragraphs: [
          "We implement technical and administrative security measures to protect data from unauthorized access, alteration, or disclosure."
        ]
      },
      {
        title: "5. Sharing Information with Third Parties",
        paragraphs: [
          "We do not sell or share personal data with third parties for commercial purposes. Data is shared only when necessary to:"
        ],
        bullets: [
          "Comply with applicable laws and regulations.",
          "Provide services through trusted partners (for example, server providers or payment services)."
        ]
      },
      {
        title: "6. Data Storage and Retention",
        paragraphs: [
          "Data will be stored as long as needed to fulfill the collection purpose or as required by law. Users can request data deletion at any time by contacting us at:"
        ],
        contactEmail: "contact@petalytix.id"
      },
      {
        title: "7. User Rights",
        paragraphs: ["You have the right to:"],
        bullets: [
          "Access the personal data we hold.",
          "Request updates, corrections, or deletion of personal data.",
          "Withdraw consent for future data use."
        ]
      },
      {
        title: "8. Changes to the Privacy Policy",
        paragraphs: [
          "This policy may be updated from time to time. Any changes will be announced on our website."
        ]
      },
      {
        title: "9. Contact Us",
        paragraphs: [
          "If you have questions regarding this privacy policy, please contact us at:"
        ],
        contactEmail: "contact@petalytix.id"
      }
    ]
  },
  id: {
    title: "Kebijakan Privasi",
    intro:
      "Petalytix berkomitmen untuk melindungi privasi dan data pribadi pengguna layanan kami. Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.",
    sections: [
      {
        title: "1. Informasi yang Kami Kumpulkan",
        paragraphs: ["Kami dapat mengumpulkan:"],
        bullets: [
          "Informasi akun seperti nama, email, nomor telepon, dan detail pembayaran.",
          "Data operasional yang diperlukan untuk menyediakan layanan, seperti preferensi laporan atau konfigurasi dashboard.",
          "Data publik yang tersedia di Google Maps, termasuk ulasan, rating, foto, dan informasi bisnis (kami tidak mengambil data dari akun pribadi)."
        ]
      },
      {
        title: "2. Cara Kami Menggunakan Informasi",
        paragraphs: ["Informasi yang dikumpulkan digunakan untuk:"],
        bullets: [
          "Menyediakan layanan analisis dan laporan sesuai kebutuhan Anda.",
          "Mengembangkan, meningkatkan, dan menyesuaikan fitur Petalytix.",
          "Memberikan dukungan pelanggan dan mengirimkan informasi terkait layanan.",
          "Memenuhi kewajiban hukum yang berlaku."
        ]
      },
      {
        title: "3. Data Publik dari Google Maps",
        paragraphs: [
          "Petalytix hanya memproses data publik yang tersedia di Google Maps dan tidak mengakses atau mengubah informasi yang dilindungi oleh akun pribadi. Data ini digunakan murni untuk tujuan analisis."
        ]
      },
      {
        title: "4. Perlindungan Data",
        paragraphs: [
          "Kami menerapkan langkah keamanan teknis dan administratif untuk melindungi data dari akses, perubahan, atau pengungkapan yang tidak sah."
        ]
      },
      {
        title: "5. Berbagi Informasi dengan Pihak Ketiga",
        paragraphs: [
          "Kami tidak menjual atau membagikan data pribadi kepada pihak ketiga untuk kepentingan komersial. Data hanya dibagikan jika diperlukan untuk:"
        ],
        bullets: [
          "Mematuhi hukum dan peraturan yang berlaku.",
          "Menyediakan layanan melalui mitra tepercaya (misalnya penyedia server atau layanan pembayaran)."
        ]
      },
      {
        title: "6. Penyimpanan dan Retensi Data",
        paragraphs: [
          "Data akan disimpan selama diperlukan untuk memenuhi tujuan pengumpulan atau sebagaimana diwajibkan oleh hukum. Pengguna dapat meminta penghapusan data kapan saja melalui:"
        ],
        contactEmail: "contact@petalytix.id"
      },
      {
        title: "7. Hak Pengguna",
        paragraphs: ["Anda memiliki hak untuk:"],
        bullets: [
          "Mengakses data pribadi yang kami simpan.",
          "Meminta pembaruan, koreksi, atau penghapusan data pribadi.",
          "Menarik persetujuan penggunaan data di masa mendatang."
        ]
      },
      {
        title: "8. Perubahan Kebijakan Privasi",
        paragraphs: [
          "Kebijakan ini dapat diperbarui dari waktu ke waktu. Setiap perubahan akan diumumkan melalui website kami."
        ]
      },
      {
        title: "9. Kontak Kami",
        paragraphs: [
          "Jika Anda memiliki pertanyaan terkait kebijakan privasi ini, hubungi kami di:"
        ],
        contactEmail: "contact@petalytix.id"
      }
    ]
  }
};

export function getPrivacyPolicy(locale: Locale): PrivacyPolicy {
  return privacyPolicy[locale];
}

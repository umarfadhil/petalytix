import "./erp.css";

export const metadata = {
  title: {
    template: "%s | AyaKasir",
    default: "AyaKasir ERP",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="erp-root">{children}</div>;
}

import Image from "next/image";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="admin-page">
      <div className="admin-card">
        <Link href="/en">
          <Image
            src="/images/petalytix-logo.png"
            alt="Petalytix"
            width={120}
            height={40}
          />
        </Link>
        <h1 className="title" style={{ fontSize: "28px" }}>
          Admin sign in
        </h1>
        <p className="subtitle" style={{ fontSize: "14px" }}>
          Manage portfolio items and publish updates.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

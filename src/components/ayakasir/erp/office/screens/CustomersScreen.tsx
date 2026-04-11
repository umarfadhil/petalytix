"use client";

import { useState } from "react";
import { useOffice } from "../store";

const PAGE_SIZE = 10;

export default function OfficeCustomersScreen() {
  const { state, locale } = useOffice();
  const isId = locale === "id";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = state.orgCustomers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const categoryMap = Object.fromEntries(
    state.orgCustomerCategories.map((cat) => [cat.id, cat.name])
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "PELANGGAN" : "CUSTOMERS"}</h1>
          <p className="erp-screen-subtitle">
            {state.orgCustomers.length} {isId ? "pelanggan di seluruh organisasi" : "customers across the organization"}
          </p>
        </div>
        <button className="erp-btn erp-btn--primary">
          {isId ? "+ Tambah Pelanggan" : "+ Add Customer"}
        </button>
      </div>

      <div className="erp-toolbar">
        <input
          className="erp-input"
          placeholder={isId ? "Cari nama, telepon, email..." : "Search name, phone, email..."}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="erp-card" style={{ marginTop: 16 }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>{isId ? "Nama" : "Name"}</th>
              <th>{isId ? "Telepon" : "Phone"}</th>
              <th>{isId ? "Email" : "Email"}</th>
              <th>{isId ? "Kategori" : "Category"}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.category_id ? (categoryMap[c.category_id] || "—") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="erp-empty">
            {search ? (isId ? "Tidak ditemukan." : "No results found.") : (isId ? "Belum ada pelanggan." : "No customers yet.")}
          </p>
        )}
        {totalPages > 1 && (
          <div className="erp-table-pagination">
            <button
              className="erp-btn erp-btn--secondary erp-btn--sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <span className="erp-table-pagination-info">
              {page + 1} / {totalPages}
            </span>
            <button
              className="erp-btn erp-btn--secondary erp-btn--sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

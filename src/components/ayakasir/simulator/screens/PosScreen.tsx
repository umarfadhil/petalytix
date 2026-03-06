"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import { formatRupiah } from "../constants";
import ReceiptDialog from "../shared/ReceiptDialog";
import ConfirmDialog from "../shared/ConfirmDialog";
import DiscountPickerDialog from "../shared/DiscountPickerDialog";

export default function PosScreen() {
  const { state, dispatch, copy } = useSimulator();
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const menuCategories = state.categories.filter((c) => c.categoryType === "MENU");
  const menuProducts = state.products.filter(
    (p) => p.productType === "MENU_ITEM" && p.isActive
  );

  const filteredProducts = state.selectedCategoryId
    ? menuProducts.filter((p) => p.categoryId === state.selectedCategoryId)
    : menuProducts;

  const groupedProducts = (() => {
    if (state.selectedCategoryId) return null;
    const groups: Record<string, typeof menuProducts> = {};
    for (const p of menuProducts) {
      const catId = p.categoryId || "__none__";
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(p);
    }
    return groups;
  })();

  function calcItemTotal(unitPrice: number, qty: number, discountType: string, discountValue: number) {
    let disc = 0;
    if (discountType === "AMOUNT") disc = Math.min(discountValue, unitPrice * qty);
    else if (discountType === "PERCENT") disc = Math.round((unitPrice * qty * Math.min(discountValue, 100)) / 100);
    return unitPrice * qty - disc;
  }

  const cartTotal = state.cart.reduce(
    (sum, c) => sum + calcItemTotal(c.unitPrice, c.qty, c.discountType, c.discountValue),
    0
  );
  const cartCount = state.cart.reduce((sum, c) => sum + c.qty, 0);

  const cashBalance = state.ledger
    .filter((l) => l.type === "SALE" || l.type === "INITIAL_BALANCE" || l.type === "DEBT_SETTLED")
    .reduce((sum, l) => sum + l.amount, 0);

  function handleProductClick(productId: string) {
    const productVariants = state.variants.filter((v) => v.productId === productId);
    if (productVariants.length > 0) {
      dispatch({ type: "OPEN_DIALOG", dialog: { type: "variantPicker", productId } });
    } else {
      dispatch({ type: "ADD_TO_CART", productId, variantId: null });
    }
  }

  function getCategoryName(catId: string): string {
    const cat = state.categories.find((c) => c.id === catId);
    return cat?.name ?? copy.products.noCategory;
  }

  function renderProductCard(p: (typeof menuProducts)[0]) {
    return (
      <button
        key={p.id}
        className="sim-product-card"
        onClick={() => handleProductClick(p.id)}
      >
        <span className="sim-product-name">{p.name}</span>
        <span className="sim-product-price">{formatRupiah(p.price)}</span>
      </button>
    );
  }

  return (
    <div className="sim-screen" style={{ position: "relative" }}>
      {/* Saldo Kas banner */}
      <div className="sim-saldo-banner">
        <span className="sim-saldo-label">{copy.pos.saldoKas}</span>
        <span className="sim-saldo-value">{formatRupiah(cashBalance)}</span>
      </div>

      {/* Category chips */}
      <div className="sim-chips">
        <button
          className={`sim-chip${state.selectedCategoryId === null ? " active" : ""}`}
          onClick={() => dispatch({ type: "SET_CATEGORY_FILTER", categoryId: null })}
        >
          {copy.pos.all}
        </button>
        {menuCategories.map((cat) => (
          <button
            key={cat.id}
            className={`sim-chip${state.selectedCategoryId === cat.id ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_CATEGORY_FILTER", categoryId: cat.id })}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
        {state.selectedCategoryId ? (
          <div className="sim-product-grid">{filteredProducts.map(renderProductCard)}</div>
        ) : groupedProducts ? (
          Object.entries(groupedProducts).map(([catId, products]) => (
            <div key={catId}>
              <div className="sim-category-header">{getCategoryName(catId)}</div>
              <div className="sim-product-grid">{products.map(renderProductCard)}</div>
            </div>
          ))
        ) : null}
      </div>

      {/* Cart badge */}
      {cartCount > 0 && !cartOpen && (
        <button className="sim-cart-badge" onClick={() => setCartOpen(true)}>
          {cartCount}
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="sim-cart-drawer">
          <div className="sim-cart-header">
            <span className="sim-cart-title">
              {copy.pos.cart} ({cartCount} {copy.pos.items})
            </span>
            <button className="sim-cart-close" onClick={() => setCartOpen(false)}>
              &#x2715;
            </button>
          </div>
          <div className="sim-cart-items">
            {state.cart.length === 0 ? (
              <div className="sim-empty">{copy.pos.empty}</div>
            ) : (
              state.cart.map((item) => {
                const key = `${item.productId}-${item.variantId ?? ""}`;
                const hasDiscount = item.discountType !== "NONE" && item.discountValue > 0;
                const discAmount = calcItemTotal(item.unitPrice, item.qty, item.discountType, item.discountValue);
                return (
                  <div key={key} className="sim-cart-item">
                    <div className="sim-cart-item-info">
                      <div className="sim-cart-item-name">{item.productName}</div>
                      {item.variantName && (
                        <div className="sim-cart-item-variant">{item.variantName}</div>
                      )}
                      <div className="sim-cart-item-price">{formatRupiah(item.unitPrice)}</div>
                      {hasDiscount && (
                        <div className="sim-cart-item-discount">
                          -{item.discountType === "PERCENT" ? `${item.discountValue}%` : formatRupiah(item.discountValue)}
                        </div>
                      )}
                      <button
                        className="sim-cart-item-discount-btn"
                        onClick={() =>
                          dispatch({
                            type: "OPEN_DIALOG",
                            dialog: { type: "discountPicker", productId: item.productId, variantId: item.variantId },
                          })
                        }
                      >
                        {hasDiscount ? `${copy.pos.discount}: ${item.discountType === "PERCENT" ? item.discountValue + "%" : formatRupiah(item.discountValue)}` : `+ ${copy.pos.discount}`}
                      </button>
                    </div>
                    <div className="sim-cart-qty">
                      <button
                        className="sim-cart-qty-btn"
                        onClick={() =>
                          dispatch({ type: "UPDATE_CART_QTY", productId: item.productId, variantId: item.variantId, qty: item.qty - 1 })
                        }
                      >
                        &minus;
                      </button>
                      <span className="sim-cart-qty-val">{item.qty}</span>
                      <button
                        className="sim-cart-qty-btn"
                        onClick={() =>
                          dispatch({ type: "UPDATE_CART_QTY", productId: item.productId, variantId: item.variantId, qty: item.qty + 1 })
                        }
                      >
                        +
                      </button>
                    </div>
                    <span className="sim-cart-item-subtotal">{formatRupiah(discAmount)}</span>
                    <button
                      className="sim-cart-item-remove"
                      onClick={() =>
                        dispatch({ type: "REMOVE_FROM_CART", productId: item.productId, variantId: item.variantId })
                      }
                    >
                      &#x1F5D1;
                    </button>
                  </div>
                );
              })
            )}
          </div>
          {state.cart.length > 0 && (
            <div className="sim-cart-footer">
              <div className="sim-cart-total">
                <span className="sim-cart-total-label">{copy.pos.total}</span>
                <span className="sim-cart-total-value">{formatRupiah(cartTotal)}</span>
              </div>
              <div className="sim-cart-buttons">
                {state.paymentMethods.cash && (
                  <button
                    className="sim-btn sim-btn-primary"
                    onClick={() => dispatch({ type: "START_PAYMENT", method: "CASH" })}
                  >
                    {copy.pos.payCash}
                  </button>
                )}
                {state.paymentMethods.qris && (
                  <button
                    className="sim-btn sim-btn-success"
                    onClick={() => dispatch({ type: "START_PAYMENT", method: "QRIS" })}
                  >
                    {copy.pos.payQris}
                  </button>
                )}
                {state.paymentMethods.utang && (
                  <button
                    className="sim-btn sim-btn-ghost"
                    style={{ border: "1px solid #d32f2f", color: "#d32f2f" }}
                    onClick={() => dispatch({ type: "START_PAYMENT", method: "UTANG" })}
                  >
                    {copy.pos.payUtang}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discount picker dialog */}
      {state.activeDialog?.type === "discountPicker" && (
        <DiscountPickerDialog
          productId={state.activeDialog.productId}
          variantId={state.activeDialog.variantId}
        />
      )}

      {/* Variant picker dialog */}
      {state.activeDialog?.type === "variantPicker" && (
        <VariantPickerDialog productId={state.activeDialog.productId} />
      )}

      {/* UTANG customer name dialog */}
      {state.activeDialog?.type === "utangCustomer" && (
        <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
          <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="sim-dialog-title">
              {copy.pos.payUtang} — {formatRupiah(state.activeDialog.total)}
            </h3>
            <div className="sim-field" style={{ marginBottom: 14 }}>
              <label className="sim-label">{copy.pos.customerName}</label>
              <input
                className="sim-input"
                placeholder={copy.pos.customerNamePlaceholder}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="sim-dialog-actions">
              <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
                {copy.confirm.no}
              </button>
              <button
                className="sim-btn sim-btn-primary"
                onClick={() => {
                  dispatch({ type: "CONFIRM_PAYMENT", customerName });
                  setCustomerName("");
                  setCartOpen(false);
                }}
              >
                {copy.confirm.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment confirm dialog */}
      {state.activeDialog?.type === "paymentConfirm" && (
        <ConfirmDialog
          message={`${copy.confirm.payConfirm} ${formatRupiah(state.activeDialog.total)} (${state.activeDialog.method})`}
          onConfirm={() => {
            dispatch({ type: "CONFIRM_PAYMENT" });
            setCartOpen(false);
          }}
        />
      )}

      {/* Receipt dialog */}
      {state.activeDialog?.type === "receipt" && (
        <ReceiptDialog transactionId={state.activeDialog.transactionId} />
      )}
    </div>
  );
}

function VariantPickerDialog({ productId }: { productId: string }) {
  const { state, dispatch, copy } = useSimulator();
  const product = state.products.find((p) => p.id === productId);
  const productVariants = state.variants.filter((v) => v.productId === productId);
  if (!product) return null;
  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">
          {product.name} — {copy.pos.selectVariant}
        </h3>
        <div className="sim-variant-list">
          <button
            className="sim-variant-option"
            onClick={() => {
              dispatch({ type: "ADD_TO_CART", productId, variantId: null });
              dispatch({ type: "CLOSE_DIALOG" });
            }}
          >
            <span className="sim-variant-name">{product.name}</span>
            <span className="sim-variant-price">{formatRupiah(product.price)}</span>
          </button>
          {productVariants.map((v) => (
            <button
              key={v.id}
              className="sim-variant-option"
              onClick={() => {
                dispatch({ type: "ADD_TO_CART", productId, variantId: v.id });
                dispatch({ type: "CLOSE_DIALOG" });
              }}
            >
              <span className="sim-variant-name">{v.name}</span>
              <span className="sim-variant-price">{formatRupiah(product.price + v.priceAdjustment)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

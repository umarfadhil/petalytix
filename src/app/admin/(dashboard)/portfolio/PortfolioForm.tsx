"use client";

import { useFormState } from "react-dom";
import type { PortfolioItem } from "@/lib/portfolio";
import {
  ActionState,
  createPortfolioAction,
  updatePortfolioAction
} from "./actions";

const initialState: ActionState = { ok: true, message: "" };

export default function PortfolioForm({
  mode,
  item
}: {
  mode: "create" | "edit";
  item?: PortfolioItem;
}) {
  const action = mode === "create" ? createPortfolioAction : updatePortfolioAction;
  const [state, formAction] = useFormState(action, initialState);
  const hasCoverImage = Boolean(item?.coverImage);
  const imageCount = item?.images?.length || 0;
  const hasImages = imageCount > 0;
  const hasAttachment = Boolean(item?.attachment);

  return (
    <form className="admin-form" action={formAction} encType="multipart/form-data">
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="admin-grid">
        <div className="admin-column">
          <h3>English</h3>
          <label className="form-label" htmlFor="title_en">
            Title
          </label>
          <input
            id="title_en"
            name="title_en"
            type="text"
            defaultValue={item?.title.en || ""}
            required
          />
          <label className="form-label" htmlFor="summary_en">
            Summary
          </label>
          <textarea
            id="summary_en"
            name="summary_en"
            rows={3}
            defaultValue={item?.summary.en || ""}
            required
          />
          <label className="form-label" htmlFor="description_en">
            Description
          </label>
          <textarea
            id="description_en"
            name="description_en"
            rows={4}
            defaultValue={item?.description.en || ""}
          />
        </div>
        <div className="admin-column">
          <h3>Bahasa Indonesia</h3>
          <label className="form-label" htmlFor="title_id">
            Judul
          </label>
          <input
            id="title_id"
            name="title_id"
            type="text"
            defaultValue={item?.title.id || ""}
            required
          />
          <label className="form-label" htmlFor="summary_id">
            Ringkasan
          </label>
          <textarea
            id="summary_id"
            name="summary_id"
            rows={3}
            defaultValue={item?.summary.id || ""}
            required
          />
          <label className="form-label" htmlFor="description_id">
            Deskripsi
          </label>
          <textarea
            id="description_id"
            name="description_id"
            rows={4}
            defaultValue={item?.description.id || ""}
          />
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-column">
          <label className="form-label" htmlFor="slug">
            Slug
          </label>
          <input id="slug" name="slug" type="text" defaultValue={item?.slug || ""} />
          <label className="form-label" htmlFor="year">
            Year
          </label>
          <input
            id="year"
            name="year"
            type="text"
            defaultValue={item?.year || ""}
            required
          />
          <label className="form-label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={item?.location || ""}
            required
          />
        </div>
        <div className="admin-column">
          <label className="form-label" htmlFor="tags">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={item?.tags.join(", ") || ""}
          />
          <label className="form-label" htmlFor="coverImageFile">
            Cover image upload
          </label>
          <input
            id="coverImageFile"
            name="coverImageFile"
            type="file"
            accept="image/*"
          />
          {hasCoverImage ? (
            <p className="subtitle" style={{ fontSize: "13px" }}>
              Current cover image is set. Upload a new file to replace it.
            </p>
          ) : null}
          {hasCoverImage ? (
            <label className="admin-checkbox">
              <input type="checkbox" name="coverImageRemove" />
              Remove cover image
            </label>
          ) : null}
          <label className="form-label" htmlFor="imagesFiles">
            Images (max 3)
          </label>
          <input
            id="imagesFiles"
            name="imagesFiles"
            type="file"
            accept="image/*"
            multiple
          />
          {hasImages ? (
            <p className="subtitle" style={{ fontSize: "13px" }}>
              {imageCount} image{imageCount > 1 ? "s" : ""} already uploaded.
            </p>
          ) : null}
          {hasImages ? (
            <label className="admin-checkbox">
              <input type="checkbox" name="imagesRemove" />
              Remove existing images
            </label>
          ) : null}
          <label className="form-label" htmlFor="attachmentFile">
            Attachment (PDF)
          </label>
          <input
            id="attachmentFile"
            name="attachmentFile"
            type="file"
            accept="application/pdf"
          />
          {hasAttachment ? (
            <p className="subtitle" style={{ fontSize: "13px" }}>
              Attachment already uploaded.
            </p>
          ) : null}
          {hasAttachment ? (
            <label className="admin-checkbox">
              <input type="checkbox" name="attachmentRemove" />
              Remove attachment
            </label>
          ) : null}
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-column">
          <label className="form-label" htmlFor="primaryUrl">
            Primary URL
          </label>
          <input
            id="primaryUrl"
            name="primaryUrl"
            type="text"
            defaultValue={item?.primaryUrl || ""}
          />
        </div>
      </div>

      <label className="admin-checkbox">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={item?.featured || false}
        />
        Feature on home page
      </label>

      <button className="button primary" type="submit">
        {mode === "create" ? "Create project" : "Update project"}
      </button>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

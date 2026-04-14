"use client";

import { useEffect, useState } from "react";

import type { FormSection, SupportedFieldType } from "@/lib/forms";

type SectionCatalogItem = {
  id: string;
  title: string;
  description: string;
  fieldCount: number;
};

type CustomFieldDraft = {
  id: string;
  label: string;
  type: SupportedFieldType;
  placeholder: string;
  required: boolean;
};

type CustomSectionDraft = {
  id: string;
  title: string;
  description: string;
  fields: CustomFieldDraft[];
};

type SectionBuilderProps = {
  catalog: SectionCatalogItem[];
  defaultSelectedSectionIds: string[];
  defaultCustomSections?: FormSection[];
};

function createDraftId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyField(): CustomFieldDraft {
  return {
    id: createDraftId("field"),
    label: "",
    type: "text",
    placeholder: "",
    required: false,
  };
}

function createEmptySection(): CustomSectionDraft {
  return {
    id: createDraftId("custom-section"),
    title: "",
    description: "",
    fields: [createEmptyField()],
  };
}

function toDraftSection(section: FormSection): CustomSectionDraft {
  return {
    id: section.id,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field, index) => ({
      id: field.key.split(".").at(-1) || `${section.id}-field-${index + 1}`,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      required: field.required,
    })),
  };
}

export function SectionBuilder({
  catalog,
  defaultSelectedSectionIds,
  defaultCustomSections = [],
}: SectionBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedSectionIds);
  const [customSections, setCustomSections] = useState<CustomSectionDraft[]>(
    defaultCustomSections.map(toDraftSection),
  );

  useEffect(() => {
    setSelectedIds(defaultSelectedSectionIds);
  }, [defaultSelectedSectionIds]);

  useEffect(() => {
    setCustomSections(defaultCustomSections.map(toDraftSection));
  }, [defaultCustomSections]);

  const toggleSection = (sectionId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(sectionId) ? current : [...current, sectionId];
      }

      return current.filter((value) => value !== sectionId);
    });
  };

  const updateCustomSection = (sectionId: string, updates: Partial<CustomSectionDraft>) => {
    setCustomSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
    );
  };

  const removeCustomSection = (sectionId: string) => {
    setCustomSections((current) => current.filter((section) => section.id !== sectionId));
  };

  const addCustomSection = () => {
    setCustomSections((current) => [...current, createEmptySection()]);
  };

  const addField = (sectionId: string) => {
    setCustomSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, createEmptyField()] }
          : section,
      ),
    );
  };

  const updateField = (
    sectionId: string,
    fieldId: string,
    updates: Partial<CustomFieldDraft>,
  ) => {
    setCustomSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, ...updates } : field,
              ),
            }
          : section,
      ),
    );
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setCustomSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields:
                section.fields.length === 1
                  ? section.fields
                  : section.fields.filter((field) => field.id !== fieldId),
            }
          : section,
      ),
    );
  };

  return (
    <div className="section-builder-stack">
      <div className="field field-full">
        <span>Included built-in sections</span>
        <p className="builder-copy">
          Keep the reusable sections you want, then add custom sections underneath for anything the
          current library does not cover yet.
        </p>
        <div className="section-selector-grid">
          {catalog.map((section) => (
            <label key={section.id} className="section-toggle">
              <input
                type="checkbox"
                name="sectionIds"
                value={section.id}
                checked={selectedIds.includes(section.id)}
                onChange={(event) => toggleSection(section.id, event.target.checked)}
              />
              <div>
                <strong>{section.title}</strong>
                <p>
                  {section.description} · {section.fieldCount} fields
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="field field-full">
        <div className="custom-section-header">
          <div>
            <span>Custom sections</span>
            <p className="builder-copy">
              Add sections for anything unique to your workflow, then define the fields inside each
              one.
            </p>
          </div>
          <button type="button" className="button button-secondary" onClick={addCustomSection}>
            Add custom section
          </button>
        </div>

        <input type="hidden" name="customSections" value={JSON.stringify(customSections)} />

        {customSections.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "1rem" }}>
            <strong>No custom sections yet</strong>
            <p>Use this when a form needs a section that is not already in the indexed library.</p>
          </div>
        ) : (
          <div className="custom-section-stack">
            {customSections.map((section, sectionIndex) => (
              <article key={section.id} className="custom-section-card">
                <div className="custom-section-header">
                  <div>
                    <strong>Custom section {sectionIndex + 1}</strong>
                    <p className="builder-copy">
                      Titles and field labels will show up directly on the public form.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => removeCustomSection(section.id)}
                  >
                    Remove section
                  </button>
                </div>

                <div className="form-grid" style={{ marginTop: "1rem" }}>
                  <label className="field">
                    <span>Section title</span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) =>
                        updateCustomSection(section.id, { title: event.target.value })
                      }
                      placeholder="Household logistics"
                    />
                  </label>
                  <label className="field field-full">
                    <span>Section description</span>
                    <textarea
                      rows={3}
                      value={section.description}
                      onChange={(event) =>
                        updateCustomSection(section.id, { description: event.target.value })
                      }
                      placeholder="Capture anything this family or workflow needs that is not covered elsewhere."
                    />
                  </label>
                </div>

                <div className="custom-section-stack" style={{ marginTop: "1rem" }}>
                  {section.fields.map((field, fieldIndex) => (
                    <div key={field.id} className="custom-field-card">
                      <div className="custom-section-header">
                        <strong>Field {fieldIndex + 1}</strong>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => removeField(section.id, field.id)}
                          disabled={section.fields.length === 1}
                        >
                          Remove field
                        </button>
                      </div>

                      <div className="field-inline-grid">
                        <label className="field">
                          <span>Label</span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(event) =>
                              updateField(section.id, field.id, { label: event.target.value })
                            }
                            placeholder="Preferred pickup window"
                          />
                        </label>
                        <label className="field">
                          <span>Field type</span>
                          <select
                            value={field.type}
                            onChange={(event) =>
                              updateField(section.id, field.id, {
                                type: event.target.value as SupportedFieldType,
                              })
                            }
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Long text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="date">Date</option>
                            <option value="url">URL</option>
                          </select>
                        </label>
                        <label className="field field-full">
                          <span>Placeholder</span>
                          <input
                            type="text"
                            value={field.placeholder}
                            onChange={(event) =>
                              updateField(section.id, field.id, {
                                placeholder: event.target.value,
                              })
                            }
                            placeholder="Optional helper text"
                          />
                        </label>
                        <label className="field checkbox-field">
                          <span>Required</span>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) =>
                              updateField(section.id, field.id, {
                                required: event.target.checked,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="button-row" style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => addField(section.id)}
                  >
                    Add field
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

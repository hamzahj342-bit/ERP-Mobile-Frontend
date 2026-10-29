export const RAM_OPTIONS = ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "20GB"];

export const ROM_OPTIONS = [
  "16GB",
  "32GB",
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
  "2TB",
];

export const CONDITION_OPTIONS = ["Used", "New", "Referb", "Box Pack"];

export const EMPTY_DEVICE_FIELDS = {
  imei1: "",
  imei2: "",
  ram: "",
  rom: "",
  color: "",
  condition: "",
};

export const MAX_CONTACT_IMAGES = 5;

/** Parse DB value (JSON array string or legacy single URL) → string[] */
export const parseContactImages = (value) => {
  if (Array.isArray(value)) {
    return value.map((u) => String(u || "").trim()).filter(Boolean).slice(0, MAX_CONTACT_IMAGES);
  }
  if (typeof value === "string" && value.trim()) {
    const raw = value.trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((u) => String(u || "").trim()).filter(Boolean).slice(0, MAX_CONTACT_IMAGES);
      }
    } catch {
      /* legacy single URL */
    }
    return [raw];
  }
  return [];
};

export const EMPTY_CONTACT_FIELDS = {
  contact_name: "",
  contact_phone: "",
  contact_cnic: "",
  // Array of image URLs (max MAX_CONTACT_IMAGES); saved as JSON in contact_image column
  contact_image: [],
  biometric_id: null,
  biometric_verified_at: null,
};

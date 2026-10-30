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

/** Battery / overall condition band — 10% steps */
export const CONDITION_PERCENT_OPTIONS = [
  "10%",
  "20%",
  "30%",
  "40%",
  "50%",
  "60%",
  "70%",
  "80%",
  "90%",
  "100%",
];

/** Brand (UOM name) is iPhone → RAM not applicable */
export const isIphoneBrand = (brandOrUomName) =>
  /iphone/i.test(String(brandOrUomName || "").trim());

export const EMPTY_DEVICE_FIELDS = {
  imei1: "",
  imei2: "",
  ram: "",
  rom: "",
  color: "",
  condition: "",
  condition_percent: "",
};

/** Payload slice for purchase / sale / return / opening lines */
export const serializeDeviceFields = (r = {}) => {
  const iphone = isIphoneBrand(r.uom_name);
  return {
    imei1: r.imei1 ? String(r.imei1).trim() : null,
    imei2: r.imei2 ? String(r.imei2).trim() : null,
    ram: iphone ? null : r.ram || null,
    rom: r.rom || null,
    color: r.color || null,
    condition: r.condition || null,
    condition_percent: r.condition_percent || null,
  };
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

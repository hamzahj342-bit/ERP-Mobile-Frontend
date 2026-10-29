/**
 * Format one RM detail line: "Oil — 50 Tora (2000 Kg)"
 * Pack qty uses entered_qty + pack UOM; base uses quantity + base UOM.
 */
export function formatRmDetailLine(detail) {
  if (!detail) return "";
  const name = detail.rm_name || detail.product_name || detail.name || "Unknown";
  const baseQty = Math.abs(Number(detail.quantity) || 0);
  const packQty = detail.entered_qty != null
    ? Math.abs(Number(detail.entered_qty))
    : baseQty;
  const packUom = detail.pack_uom_name || detail.uom_name || detail.uom?.name || "";
  const baseUom = detail.base_uom_name || packUom;

  const packPart = packUom
    ? `${packQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${packUom}`
    : `${packQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  const basePart = baseUom
    ? `${baseQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${baseUom}`
    : `${baseQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;

  // Same UOM / no conversion: show once
  if (!packUom || packUom === baseUom || packQty === baseQty) {
    return `${name} — ${basePart}`;
  }
  return `${name} — ${packPart} (${basePart})`;
}

/**
 * List summary for Purchase / Sale / Return tables.
 * Same model (+ brand) lines are summed, e.g. "S23 Ultra - 5 Samsung; 15 Pro Max - 3 iPhone"
 * (each phone may have different IMEI/price — count is what matters in the list).
 */
export function formatRmDetailsList(details = [], max = 6) {
  if (!Array.isArray(details) || details.length === 0) return "-";

  const grouped = new Map();
  for (const d of details) {
    if (!d) continue;
    const name = d.rm_name || d.product_name || d.name || "Unknown";
    const brand =
      d.pack_uom_name || d.uom_name || d.uom?.name || d.brand || "";
    const qty =
      d.entered_qty != null
        ? Math.abs(Number(d.entered_qty) || 0)
        : Math.abs(Number(d.quantity) || 0);
    const key = `${String(d.rm_id || name).toLowerCase()}::${String(brand).toLowerCase()}`;
    const prev = grouped.get(key);
    if (prev) {
      prev.qty += qty || 1;
    } else {
      grouped.set(key, { name, brand, qty: qty || 1 });
    }
  }

  const lines = [...grouped.values()].map((g) => {
    const count = Number.isInteger(g.qty)
      ? String(g.qty)
      : g.qty.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return g.brand ? `${g.name} - ${count} ${g.brand}` : `${g.name} - ${count}`;
  });

  if (lines.length <= max) return lines.join("; ");
  const shown = lines.slice(0, max);
  return `${shown.join("; ")} +${lines.length - max} more`;
}

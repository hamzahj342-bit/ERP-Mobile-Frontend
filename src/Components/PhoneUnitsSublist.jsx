import React from "react";
import "./PhoneUnitsSublist.css";

/**
 * Expandable IMEI unit detail under a stock row.
 */
const PhoneUnitsSublist = ({
  units = [],
  loading = false,
  showSupplier = false,
  colSpan = 8,
}) => {
  return (
    <tr className="phone-units-expand-row">
      <td colSpan={colSpan}>
        <div className="phone-units-panel">
          {loading ? (
            <p className="phone-units-empty">Loading phone units…</p>
          ) : !units.length ? (
            <p className="phone-units-empty">No IMEI units in available stock for this line.</p>
          ) : (
            <table className="phone-units-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>IMEI 1</th>
                  <th>IMEI 2</th>
                  <th>Cost</th>
                  <th>Condition</th>
                  <th>%</th>
                  <th>Color</th>
                  <th>RAM</th>
                  <th>ROM</th>
                  {showSupplier ? <th>Supplier</th> : null}
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={u.source_detail_id || `${u.imei1}-${i}`}>
                    <td>{i + 1}</td>
                    <td className="mono">{u.imei1 || "—"}</td>
                    <td className="mono">{u.imei2 || "—"}</td>
                    <td>{Number(u.cost || 0).toLocaleString()}</td>
                    <td>{u.condition || "—"}</td>
                    <td>{u.condition_percent || "—"}</td>
                    <td>{u.color || "—"}</td>
                    <td>{u.ram || "—"}</td>
                    <td>{u.rom || "—"}</td>
                    {showSupplier ? <td>{u.supplier_name || "—"}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
};

export default PhoneUnitsSublist;

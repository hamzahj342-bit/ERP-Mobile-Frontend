/**
 * Calculates the Weighted Average Unit Cost based on FIFO consumption.
 * @param {Array<{current_stock: number, avg_unit_cost: number}>} batches - Array of stock batches, already sorted by FIFO (oldest first).
 * @param {number} requiredQty - The quantity the user wants to produce/consume.
 * @returns {number} - The weighted average unit cost of the consumed quantity.
 */
export const calculateDynamicFIFOCost = (batches, requiredQty) => {
    const qty = parseFloat(requiredQty);

    if (isNaN(qty) || qty <= 0) {
        return 0;
    }

    let remainingQtyToConsume = qty;
    let totalCost = 0;
    let totalQtyActuallyConsumed = 0;

    // Batches should already be sorted (createdat ASC) from the GET API
    for (const batch of batches) {
        if (remainingQtyToConsume <= 0) break; 

        const availableQty = parseFloat(batch.current_stock);
        const avgCost = parseFloat(batch.avg_unit_cost);

        if (availableQty <= 0) continue;

        const consumptionQty = Math.min(availableQty, remainingQtyToConsume);

        // Cost calculation
        totalCost += consumptionQty * avgCost;
        totalQtyActuallyConsumed += consumptionQty;
        remainingQtyToConsume -= consumptionQty;
    }


    // Final Weighted Average Cost
    if (totalQtyActuallyConsumed === 0) return 0;

    return totalCost / totalQtyActuallyConsumed;
};
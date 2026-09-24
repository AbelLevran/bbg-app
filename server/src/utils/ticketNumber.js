import prisma from '../db/prisma.js';

/**
 * Generate the next sequential ticket number.
 * Format: TICKET-NNN (starting at TICKET-101)
 * Uses a simple MAX approach — safe for low-concurrency internal tools.
 */
export async function generateTicketNumber() {
  const result = await prisma.$queryRaw`
    SELECT MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)) AS max_num
    FROM tickets
    WHERE ticket_number LIKE 'TICKET-%'
  `;

  const maxNum = result[0]?.max_num ?? 100;
  const nextNum = Number(maxNum) + 1;
  return `TICKET-${nextNum}`;
}

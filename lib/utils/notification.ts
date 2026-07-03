/**
 * Formats system-generated notification titles and messages into a clean,
 * premium Indonesian copy, removing raw markdown/emojis and formatting
 * code strings.
 */
export function formatNotificationText(title: string, message: string) {
  let displayTitle = title;
  let displayMessage = message;

  // Clean emoji/markdown symbols (e.g. ⚠️, 📦, 🔴)
  const cleanTitle = title.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
  const cleanMessage = message.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();

  const titleLower = cleanTitle.toLowerCase();

  // Pattern 1: "Deadline Sourcing Lewat: SO-xxxx"
  if (titleLower.includes("deadline sourcing") && titleLower.includes("lewat")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Batas Waktu Sourcing Terlewati";
    displayMessage = orderNum 
      ? `Batas waktu pengadaan (sourcing) barang untuk pesanan ${orderNum} telah terlewati. Harap segera diproses.` 
      : cleanMessage;
  }
  // Pattern 2: "Deadline Sourcing: SO-xxxx"
  else if (titleLower.includes("deadline sourcing")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Batas Waktu Sourcing Mendekat";
    displayMessage = orderNum 
      ? `Pesanan ${orderNum} belum memenuhi kuota stok barang. Harap segera lakukan sourcing.` 
      : cleanMessage;
  }
  // Pattern 3: "Deadline Pengiriman: SO-xxxx"
  else if (titleLower.includes("deadline pengiriman")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Batas Waktu Pengiriman";
    displayMessage = orderNum 
      ? `Pesanan ${orderNum} dijadwalkan untuk dikirim besok. Harap persiapkan barang untuk pengadaan.` 
      : cleanMessage;
  }
  // Pattern 4: "Pesanan Baru: SO-xxxx"
  else if (titleLower.includes("pesanan baru")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Pesanan Baru Masuk";
    displayMessage = orderNum 
      ? `Pesanan baru ${orderNum} dari pelanggan telah masuk dan memerlukan peninjauan admin.` 
      : cleanMessage;
  }
  // Pattern 5: "Status Pesanan: SO-xxxx" or "Update Pesanan SO-xxxx"
  else if (titleLower.includes("status pesanan") || titleLower.includes("update pesanan")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Status Pesanan Diperbarui";
    const statusMatch = cleanMessage.match(/"([^"]+)"/);
    const newStatus = statusMatch ? statusMatch[1] : "";
    displayMessage = orderNum && newStatus
      ? `Pesanan ${orderNum} kini dalam status "${newStatus}".`
      : cleanMessage;
  }
  // Pattern 6: "Pesanan SO-xxxx Dibuat"
  else if (titleLower.includes("dibuat") && titleLower.includes("pesanan")) {
    const match = cleanTitle.match(/SO-\S+/);
    const orderNum = match ? match[0] : "";
    displayTitle = "Pesanan Berhasil Dibuat";
    displayMessage = orderNum 
      ? `Pesanan ${orderNum} telah berhasil dibuat dan saat ini sedang menunggu konfirmasi admin.` 
      : cleanMessage;
  }
  // Pattern 7: "Pembayaran Diterima" / "Pembayaran Masuk"
  else if (titleLower.includes("pembayaran")) {
    displayTitle = "Pembayaran Dikonfirmasi";
    displayMessage = cleanMessage;
  }

  return { title: displayTitle, message: displayMessage };
}

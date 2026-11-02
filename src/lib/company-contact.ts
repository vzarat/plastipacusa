/** Primary US voice / SMS line (McAllen). */
export const PRIMARY_PHONE_DISPLAY = "(956) 400-3683";
export const PRIMARY_PHONE_TEL = "+19564003683";
export const PRIMARY_PHONE_HREF = `tel:${PRIMARY_PHONE_TEL}`;

/**
 * Secondary US line — WhatsApp only (do not use as tel:).
 * Display: +1 323-790-4340
 */
export const WHATSAPP_PHONE_DISPLAY = "+1 323-790-4340";
export const WHATSAPP_PHONE_E164 = "13237904340";
export const WHATSAPP_URL =
  `https://wa.me/${WHATSAPP_PHONE_E164}?text=` +
  encodeURIComponent("Hi Plastipac USA — I’d like help with stretch film.");
export const WHATSAPP_URL_BARE = `https://wa.me/${WHATSAPP_PHONE_E164}`;

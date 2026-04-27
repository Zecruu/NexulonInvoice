import { put } from "@vercel/blob";

const META_API_VERSION = "v20.0";

export type MediaCategory = "image" | "audio" | "video" | "document" | "sticker";

interface MetaMediaInfo {
  id?: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}

interface DownloadedMedia {
  url: string;
  mimeType: string;
  size: number;
  filename?: string;
}

function extToFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
  };
  return map[mime?.toLowerCase()] || "bin";
}

/**
 * Download a WhatsApp media attachment from Meta and store it in Vercel Blob.
 * Returns a permanent public URL.
 *
 * Two-step Meta flow: first GET metadata to retrieve a temporary download URL
 * (5-minute TTL), then GET that URL with the access token to fetch bytes.
 */
export async function downloadAndStoreMedia(
  mediaId: string,
  category: MediaCategory,
  conversationId: string,
  fallbackFilename?: string
): Promise<DownloadedMedia | null> {
  const token = process.env.META_GRAPH_ACCESS_TOKEN;
  if (!token) {
    console.warn("[media] META_GRAPH_ACCESS_TOKEN not set; skipping media download");
    return null;
  }

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) {
      console.error(
        `[media] meta lookup failed ${metaRes.status}:`,
        await metaRes.text()
      );
      return null;
    }
    const meta = (await metaRes.json()) as {
      url?: string;
      mime_type?: string;
      file_size?: number;
    };
    if (!meta.url) {
      console.error("[media] meta lookup returned no url:", JSON.stringify(meta));
      return null;
    }

    const mimeType = meta.mime_type || "application/octet-stream";

    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!binRes.ok) {
      console.error(
        `[media] binary fetch failed ${binRes.status}:`,
        await binRes.text()
      );
      return null;
    }
    const arrayBuf = await binRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const ext = extToFromMime(mimeType);
    const baseName = fallbackFilename
      ? fallbackFilename.replace(/\.[^.]+$/, "")
      : mediaId;
    const path = `whatsapp/${conversationId}/${category}/${baseName}.${ext}`;

    const blob = await put(path, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
      allowOverwrite: false,
    });

    return {
      url: blob.url,
      mimeType,
      size: buffer.byteLength,
      filename: fallbackFilename,
    };
  } catch (err) {
    console.error("[media] download/store threw:", err);
    return null;
  }
}

export function pickMediaFromMessage(msg: {
  type?: string;
  image?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  sticker?: { id?: string; mime_type?: string };
}): { category: MediaCategory; info: { id: string; filename?: string } } | null {
  if (msg.type === "image" && msg.image?.id)
    return { category: "image", info: { id: msg.image.id } };
  if (msg.type === "audio" && msg.audio?.id)
    return { category: "audio", info: { id: msg.audio.id } };
  if (msg.type === "video" && msg.video?.id)
    return { category: "video", info: { id: msg.video.id } };
  if (msg.type === "document" && msg.document?.id)
    return { category: "document", info: { id: msg.document.id, filename: msg.document.filename } };
  if (msg.type === "sticker" && msg.sticker?.id)
    return { category: "sticker", info: { id: msg.sticker.id } };
  return null;
}

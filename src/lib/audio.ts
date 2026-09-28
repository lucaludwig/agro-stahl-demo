export function audioDateiname(mimeType: string): string {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim();
  const endung = mime === "audio/mp4" ? "mp4" : mime === "audio/ogg" ? "ogg" : "webm";
  return `aufnahme.${endung}`;
}

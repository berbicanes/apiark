import type { ExportFormat } from "@apiark/types";
import { exportCollection } from "@/lib/tauri-api";

const FORMAT_INFO: Record<ExportFormat, { ext: string; filterName: string; filterExt: string[] }> = {
  postman: { ext: "postman_collection.json", filterName: "JSON", filterExt: ["json"] },
  openapi: { ext: "openapi.json", filterName: "JSON", filterExt: ["json"] },
  apiark: { ext: "apiark.zip", filterName: "ZIP Archive", filterExt: ["zip"] },
  bruno: { ext: "bruno", filterName: "Directory", filterExt: ["*"] },
  insomnia: { ext: "insomnia.json", filterName: "JSON", filterExt: ["json"] },
};

/**
 * Export a collection to the specified format and prompt the user to save.
 */
export async function exportCollectionToFile(
  collectionPath: string,
  collectionName: string,
  format: ExportFormat,
): Promise<void> {
  const result = await exportCollection(collectionPath, format);
  const info = FORMAT_INFO[format];

  const { save } = await import("@tauri-apps/plugin-dialog");
  const defaultName = `${collectionName.toLowerCase().replace(/\s+/g, "-")}.${info.ext}`;

  const filePath = await save({
    defaultPath: defaultName,
    filters: [{ name: info.filterName, extensions: info.filterExt }],
  });

  if (!filePath) return;

  if (format === "apiark") {
    // result is the path to the generated zip file — copy it to the user's chosen location
    const { copyFile } = await import("@tauri-apps/plugin-fs");
    await copyFile(result, filePath);
  } else if (format === "bruno") {
    // result is the path to the generated directory — copy it
    const { copyFile } = await import("@tauri-apps/plugin-fs");
    await copyFile(result, filePath);
  } else {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(filePath, result);
  }
}

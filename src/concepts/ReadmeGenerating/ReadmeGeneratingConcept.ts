import { Db } from "npm:mongodb";
import { join } from "jsr:@std/path/join";
import { exists as _exists } from "jsr:@std/fs/exists";
import { ensureDir as _ensureDir } from "jsr:@std/fs/ensure-dir";
// Use built-in Deno file IO
import { walk } from "jsr:@std/fs/walk";

type GenerateParams = {
  concept: string; // e.g. "UserAuthenticating"
  overwrite?: boolean; // regenerate even if README exists
  // Optional uploaded files from website: Record path -> content (string base64 or text)
  files?: Record<string, string> | Map<string, Uint8Array>;
  displayName?: string; // Optional friendly display name (if concept is an ID)
  actions?: string[]; // Optional action names (if frontend knows)
};

type UpdateParams = {
  concept: string;
  content: string;
};

type GetParams = {
  concept: string;
};

/**
 * ReadmeGeneratingConcept
 * - Scans concept folder files to produce a concise README.md
 * - Allows regeneration on demand
 * - Allows manual editing/persistence
 */
export default class ReadmeGeneratingConcept {
  constructor(private db: Db) {}

  /**
   * Generate README.md for a concept by summarizing spec and code locations.
   * Returns the file path and content.
   */
  async generate(
    { concept, overwrite = false, files, displayName, actions: _actions }:
      GenerateParams,
  ) {
    const readmes = this.db.collection<
      { _id: string; concept: string; content: string; updated_at: Date }
    >("Readmes");
    const existingDoc = await readmes.findOne({ concept });
    if (existingDoc && !overwrite) {
      return {
        path: `mongo://Readmes/${existingDoc._id}`,
        content: existingDoc.content,
        overwritten: false,
      };
    }

    // Collect design docs and code to construct an LLM prompt
    const designDir = join("design", "concepts", concept);
    const designSnippets: string[] = [];
    try {
      for await (const entry of walk(designDir, { includeFiles: true })) {
        if (entry.isFile && entry.path.endsWith(".md")) {
          const text = await Deno.readTextFile(entry.path).catch(() => "");
          if (text) {
            designSnippets.push(`---\n# ${entry.name}\n\n${text}\n`);
          }
        }
      }
    } catch (_) {
      // design folder may not exist
    }

    const codeFiles: string[] = [];
    const codeSnippets: string[] = [];
    // Prefer uploaded files when provided (website flow)
    if (files && (files instanceof Map || typeof files === "object")) {
      const entries: Array<[string, string]> = [];
      if (files instanceof Map) {
        for (const [p, u8] of files.entries()) {
          const text = new TextDecoder().decode(u8);
          entries.push([p, text]);
        }
      } else {
        for (const [p, content] of Object.entries(files)) {
          // content may be base64 or plain text; try base64 decode, else use as-is
          let text = content;
          try {
            const decoded = atob(content);
            text = decoded;
          } catch (_) {
            // not base64
          }
          entries.push([p, text]);
        }
      }
      for (const [p, text] of entries) {
        codeFiles.push(p);
        codeSnippets.push(`---\n# ${p}\n\n${text}\n`);
      }
    } else {
      // No uploaded files; we won't read local filesystem anymore.
      // Prefer storage-backed files via syncs; leave empty to avoid writing to disk.
    }

    // Build a prompt for Gemini that produces a concept-focused summary
    const conceptTitle = displayName ?? concept;
    const prompt = [
      `You are writing a README.md that summarizes ONLY the provided concept's files and design docs for \"${conceptTitle}\".`,
      `Do NOT describe the README generator or its API. Focus on the concept itself.`,
      `Produce:`,
      `- Overview & purpose inferred from code and docs`,
      `- Concept API: list actions/methods with inputs/outputs (infer from code)`,
      `- Minimal setup/run notes based on the repository`,
      `- File structure highlights relevant to this concept`,
      `Write clear, concise, developer-focused markdown.`,
      `\n## Design Docs\n${designSnippets.join("\n")}`,
      `\n## Source Files (${codeFiles.length})\n${
        codeFiles.map((f) => `- ${f}`).join("\n")
      }\n`,
      `\n## Source Snippets\n${codeSnippets.join("\n")}`,
    ].join("\n");

    let content = "";
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";
    const configPath = Deno.env.get("GEMINI_CONFIG");
    let generationConfig: Record<string, unknown> | undefined = {
      temperature: 0.2,
    };
    if (configPath) {
      try {
        const cfgText = await Deno.readTextFile(configPath);
        const cfgJson = JSON.parse(cfgText);
        generationConfig = {
          ...generationConfig,
          ...(cfgJson?.generationConfig ?? {}),
        };
      } catch (e) {
        console.warn("Could not read GEMINI_CONFIG:", e);
      }
    }
    if (apiKey) {
      // Prefer official SDK when available (npm:@google/generative-ai), else REST URL
      let usedSdk = false;
      try {
        const { GoogleGenerativeAI } = await import(
          "npm:@google/generative-ai"
        );
        const client = new GoogleGenerativeAI(apiKey);
        const genModel = client.getGenerativeModel({ model });
        const response = await genModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
        const text = response?.response?.text?.() ??
          response?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) {
          content = text;
          usedSdk = true;
        }
      } catch (e) {
        // SDK may not be installed or available under Deno; fall back to REST
        console.warn("Gemini SDK not available or failed, using REST:", e);
      }

      if (!usedSdk) {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const body = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig,
        };
        try {
          const resp = await fetch(`${url}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!resp.ok) throw new Error(`Gemini error ${resp.status}`);
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          content = text || content;
        } catch (e) {
          console.error("Gemini REST generation failed, falling back:", e);
        }
      }
    }

    // Fallback or post-process: if LLM empty, write a simple README
    if (!content) {
      const sections: string[] = [];
      sections.push(`# ${conceptTitle}\n`);
      sections.push(`## Overview & Purpose\n`);
      sections.push(
        `Summary derived from the concept's files and docs. Add more details as the concept evolves.\n\n`,
      );
      if (codeFiles.length) {
        sections.push("## Source files\n");
        for (const f of codeFiles) sections.push(`- ${f}`);
        sections.push("\n");
      }
      sections.push("## Concept API\n");
      sections.push(
        "Actions will be inferred from code methods and documented here.\n",
      );
      if (designSnippets.length) {
        sections.push("\n## Design notes\n" + designSnippets.join("\n"));
      }
      content = sections.join("\n");
    }

    // Upsert into Mongo collection
    const now = new Date();
    const upsert = await readmes.updateOne(
      { concept },
      { $set: { concept, content, updated_at: now } },
      { upsert: true },
    );
    const id =
      (upsert.upsertedId ??
        (await readmes.findOne({ concept }))?._id) as string;

    // Log generation event
    try {
      const col = this.db.collection("readme_generations");
      await col.insertOne({ concept, readmeId: id, ts: now });
    } catch (_) {
      // optional log insert failure ignored
    }

    return {
      path: `mongo://Readmes/${id}`,
      content,
      overwritten: !!existingDoc && overwrite,
    };
  }

  /** Fetch the README content for a concept. */
  async get({ concept }: GetParams) {
    const readmes = this.db.collection<
      { _id: string; concept: string; content: string; updated_at: Date }
    >("Readmes");
    const doc = await readmes.findOne({ concept });
    if (!doc) {
      return {
        error: "README not found. Generate it first.",
        path: `mongo://Readmes`,
      };
    }
    return { path: `mongo://Readmes/${doc._id}`, content: doc.content };
  }

  /** Update the README content explicitly. */
  async update({ concept, content }: UpdateParams) {
    const readmes = this.db.collection<
      { _id: string; concept: string; content: string; updated_at: Date }
    >("Readmes");
    const now = new Date();
    const upsert = await readmes.updateOne(
      { concept },
      { $set: { concept, content, updated_at: now } },
      { upsert: true },
    );
    const id =
      (upsert.upsertedId ??
        (await readmes.findOne({ concept }))?._id) as string;
    try {
      const col = this.db.collection("readme_edits");
      await col.insertOne({
        concept,
        readmeId: id,
        ts: now,
        size: content.length,
      });
    } catch (_) {
      // optional log insert failure ignored
    }
    return { path: `mongo://Readmes/${id}`, content };
  }
}

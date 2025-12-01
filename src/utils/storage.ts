// This import loads the `.env` file as environment variables
import "jsr:@std/dotenv/load";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL_ENV = Deno.env.get("SUPABASE_URL");
const SUPABASE_SECRET_KEY_ENV = Deno.env.get("SUPABASE_SECRET_KEY");
const SUPABASE_STORAGE_BUCKET = Deno.env.get("SUPABASE_STORAGE_BUCKET") ??
  "concepts";

if (!SUPABASE_URL_ENV) {
  throw new Error("Could not find environment variable: SUPABASE_URL");
}

if (!SUPABASE_SECRET_KEY_ENV) {
  throw new Error(
    "Could not find environment variable: SUPABASE_SECRET_KEY",
  );
}

// At this point, TypeScript knows these are defined
const SUPABASE_URL: string = SUPABASE_URL_ENV;
const SUPABASE_SECRET_KEY: string = SUPABASE_SECRET_KEY_ENV;

// ============================================================================
// Supabase Client Initialization
// ============================================================================

/**
 * Initialize Supabase client with secret key for admin operations.
 * This client has full access to storage and should be used server-side only.
 * The secret key provides enhanced security features compared to the legacy service_role key.
 */
function initSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let cachedClient: ReturnType<typeof initSupabaseClient> | null = null;

/**
 * Get or create a cached Supabase client instance.
 * @returns Supabase client instance (never null after first call)
 */
function getSupabaseClient(): ReturnType<typeof initSupabaseClient> {
  if (!cachedClient) {
    cachedClient = initSupabaseClient();
  }
  return cachedClient;
}

// ============================================================================
// Bucket Management
// ============================================================================

let bucketChecked = false;

/**
 * Ensure the storage bucket exists, creating it if it doesn't.
 * This function is idempotent and caches the check result.
 */
async function ensureBucketExists(): Promise<void> {
  if (bucketChecked) {
    return;
  }

  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  // Check if bucket exists by trying to list it
  const { data: buckets, error: listError } = await supabase.storage
    .listBuckets();

  if (listError) {
    throw new Error(
      `Failed to list storage buckets: ${listError.message}`,
    );
  }

  const bucketExists = buckets?.some((b) => b.name === bucket) ?? false;

  if (!bucketExists) {
    // Create the bucket if it doesn't exist
    // Make it public so files can be accessed via public URLs
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: null, // No file size limit
      allowedMimeTypes: null, // Allow all MIME types
    });

    if (createError) {
      throw new Error(
        `Failed to create storage bucket '${bucket}': ${createError.message}`,
      );
    }
  }

  bucketChecked = true;
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Upload a file to Supabase Storage.
 *
 * @param filePath - The path where the file should be stored in the bucket (e.g., "concepts/my-concept.ts")
 * @param fileContent - The file content as a Uint8Array or File/Blob
 * @param options - Optional upload options (contentType, upsert, etc.)
 * @returns The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadFile(
  filePath: string,
  fileContent: Uint8Array | File | Blob,
  options?: {
    contentType?: string;
    upsert?: boolean;
    cacheControl?: string;
  },
): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  // Convert Blob/File to Uint8Array if needed
  let content: Uint8Array;
  if (fileContent instanceof File || fileContent instanceof Blob) {
    const arrayBuffer = await fileContent.arrayBuffer();
    content = new Uint8Array(arrayBuffer);
  } else {
    content = fileContent;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, content, {
      contentType: options?.contentType || "application/octet-stream",
      upsert: options?.upsert ?? true,
      cacheControl: options?.cacheControl || "3600",
    });

  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  // Get the public URL (use the uploaded path from data if available, otherwise use filePath)
  const uploadedPath = data?.path || filePath;
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uploadedPath);

  return urlData.publicUrl;
}

/**
 * Download a file from Supabase Storage.
 *
 * @param filePath - The path of the file in the bucket
 * @returns The file content as a Uint8Array
 * @throws Error if download fails or file doesn't exist
 */
export async function downloadFile(filePath: string): Promise<Uint8Array> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download file from storage: ${error.message}`);
  }

  if (!data) {
    throw new Error(`File not found: ${filePath}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Delete a file from Supabase Storage.
 *
 * @param filePath - The path of the file in the bucket
 * @returns true if deletion was successful
 * @throws Error if deletion fails
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file from storage: ${error.message}`);
  }

  return true;
}

/**
 * Check if a file exists in Supabase Storage.
 *
 * @param filePath - The path of the file in the bucket
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  // Extract directory and filename manually
  const lastSlashIndex = filePath.lastIndexOf("/");
  const directory = lastSlashIndex >= 0
    ? filePath.substring(0, lastSlashIndex)
    : "";
  const filename = lastSlashIndex >= 0
    ? filePath.substring(lastSlashIndex + 1)
    : filePath;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(directory, {
      search: filename,
    });

  if (error) {
    return false;
  }

  return data
    ? data.some((file: { name: string }) => file.name === filename)
    : false;
}

/**
 * Get the public URL for a file in Supabase Storage.
 *
 * @param filePath - The path of the file in the bucket
 * @returns The public URL of the file
 */
export function getPublicUrl(filePath: string): string {
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List all files in a directory within the storage bucket.
 *
 * @param directoryPath - The directory path (use empty string for root)
 * @param options - Optional listing options (limit, offset, etc.)
 * @returns Array of file objects
 */
export async function listFiles(
  directoryPath: string = "",
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: {
      column: "name" | "created_at" | "updated_at";
      order: "asc" | "desc";
    };
  },
): Promise<
  Array<
    {
      name: string;
      id: string;
      updated_at: string;
      created_at: string;
      last_accessed_at: string;
      metadata: Record<string, unknown>;
    }
  >
> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(directoryPath, {
      limit: options?.limit,
      offset: options?.offset,
      sortBy: options?.sortBy,
    });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data || [];
}

/**
 * Upload multiple files to a directory in Supabase Storage.
 *
 * @param basePath - The base directory path where files should be stored
 * @param files - Map of relative file paths to file contents
 * @param options - Optional upload options
 * @returns Map of file paths to their public URLs
 * @throws Error if upload fails
 */
export async function uploadFiles(
  basePath: string,
  files: Map<string, Uint8Array | File | Blob>,
  options?: {
    contentType?: string;
    upsert?: boolean;
    cacheControl?: string;
  },
): Promise<Map<string, string>> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const urls = new Map<string, string>();

  // Upload all files in parallel for better performance
  const uploadPromises = Array.from(files.entries()).map(
    async ([relativePath, fileContent]) => {
      // Construct full path: basePath/relativePath
      const fullPath = basePath.endsWith("/")
        ? `${basePath}${relativePath}`
        : `${basePath}/${relativePath}`;

      // Convert Blob/File to Uint8Array if needed
      let content: Uint8Array;
      if (fileContent instanceof File || fileContent instanceof Blob) {
        const arrayBuffer = await fileContent.arrayBuffer();
        content = new Uint8Array(arrayBuffer);
      } else {
        content = fileContent;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, content, {
          contentType: options?.contentType || "application/octet-stream",
          upsert: options?.upsert ?? true,
          cacheControl: options?.cacheControl || "3600",
        });

      if (error) {
        throw new Error(
          `Failed to upload file ${relativePath} to storage: ${error.message}`,
        );
      }

      // Get the public URL
      const uploadedPath = data?.path || fullPath;
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadedPath);

      return { relativePath, publicUrl: urlData.publicUrl };
    },
  );

  // Wait for all uploads to complete
  const results = await Promise.all(uploadPromises);

  // Populate the urls map
  for (const { relativePath, publicUrl } of results) {
    urls.set(relativePath, publicUrl);
  }

  return urls;
}

/**
 * Download all files from a directory in Supabase Storage (recursively).
 *
 * @param basePath - The base directory path
 * @returns Map of relative file paths to file contents
 * @throws Error if download fails
 */
export async function downloadFiles(
  basePath: string,
): Promise<Map<string, Uint8Array>> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  const fileContents = new Map<string, Uint8Array>();

  // Recursive function to list and download all files
  async function listAndDownload(
    dirPath: string,
    relativePrefix: string = "",
  ): Promise<void> {
    const { data: items, error: listError } = await supabase.storage
      .from(bucket)
      .list(dirPath, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      throw new Error(
        `Failed to list files in directory ${dirPath}: ${listError.message}`,
      );
    }

    if (!items || items.length === 0) {
      return;
    }

    for (const item of items) {
      if (!item.name) {
        continue;
      }

      const fullPath = dirPath.endsWith("/")
        ? `${dirPath}${item.name}`
        : `${dirPath}/${item.name}`;
      const relativePath = relativePrefix
        ? `${relativePrefix}/${item.name}`
        : item.name;

      // Check if it's a directory (has no id or metadata indicates it's a folder)
      // In Supabase, directories typically don't have an id
      if (item.id === null || item.metadata === null) {
        // It's a directory, recurse into it
        await listAndDownload(fullPath, relativePath);
      } else {
        // It's a file, download it
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(fullPath);

        if (error) {
          throw new Error(
            `Failed to download file ${relativePath}: ${error.message}`,
          );
        }

        if (!data) {
          continue;
        }

        const arrayBuffer = await data.arrayBuffer();
        fileContents.set(relativePath, new Uint8Array(arrayBuffer));
      }
    }
  }

  await listAndDownload(basePath);
  return fileContents;
}

/**
 * Delete all files in a directory from Supabase Storage.
 *
 * @param basePath - The base directory path
 * @returns true if deletion was successful
 * @throws Error if deletion fails
 */
export async function deleteFiles(basePath: string): Promise<boolean> {
  await ensureBucketExists();
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_STORAGE_BUCKET;

  // List all files in the directory
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(basePath, {
      limit: 1000,
    });

  if (listError) {
    throw new Error(
      `Failed to list files in directory: ${listError.message}`,
    );
  }

  if (!files || files.length === 0) {
    return true;
  }

  // Build list of file paths to delete
  const filePaths = files
    .filter((file) => file.name && file.id !== null)
    .map((file) =>
      basePath.endsWith("/")
        ? `${basePath}${file.name}`
        : `${basePath}/${file.name}`
    );

  if (filePaths.length === 0) {
    return true;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove(filePaths);

  if (error) {
    throw new Error(
      `Failed to delete files from directory: ${error.message}`,
    );
  }

  return true;
}

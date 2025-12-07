export async function install(conceptArg: string) {
  // Parse CONCEPT_NAME@VERSION format
  const parts = conceptArg.split("@");
  const conceptName = parts[0];
  const versionStr = parts.length > 1 ? parts[1] : undefined;

  if (versionStr !== undefined) {
    // Validate that version is an integer
    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version.toString() !== versionStr) {
      console.error(`Error: Version must be an integer, got: ${versionStr}`);
      Deno.exit(1);
    }
    console.log(`Running install command for: ${conceptName}`);
    console.log(`Version: ${version}`);
  } else {
    console.log(`Running install command for: ${conceptName}`);
  }
}

export async function install(conceptArg: string) {
  // Parse USERNAME/CONCEPT_NAME@VERSION format
  const atIndex = conceptArg.indexOf("@");
  const hasVersion = atIndex !== -1;
  
  const namePart = hasVersion ? conceptArg.slice(0, atIndex) : conceptArg;
  const versionStr = hasVersion ? conceptArg.slice(atIndex + 1) : undefined;
  
  // Parse USERNAME/CONCEPT_NAME
  const slashIndex = namePart.indexOf("/");
  if (slashIndex === -1) {
    console.error(`Error: Username is required. Expected format: {USERNAME}/{CONCEPT_NAME}@{VERSION}`);
    Deno.exit(1);
  }
  
  const username = namePart.slice(0, slashIndex);
  const conceptName = namePart.slice(slashIndex + 1);
  
  if (!username || !conceptName) {
    console.error(`Error: Invalid format. Expected: {USERNAME}/{CONCEPT_NAME}@{VERSION}`);
    Deno.exit(1);
  }

  if (versionStr !== undefined) {
    // Validate that version is an integer
    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version.toString() !== versionStr) {
      console.error(`Error: Version must be an integer, got: ${versionStr}`);
      Deno.exit(1);
    }
    console.log(`Running install command for: ${username}/${conceptName}`);
    console.log(`Version: ${version}`);
  } else {
    console.log(`Running install command for: ${username}/${conceptName}`);
  }
}

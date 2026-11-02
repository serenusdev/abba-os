import { access, readFile, writeFile } from "node:fs/promises";

const generatedGradleFile = "android/capacitor-cordova-android-plugins/build.gradle";

try {
  await access(generatedGradleFile);
  const source = await readFile(generatedGradleFile, "utf8");
  const cleaned = source.replace(/\nrepositories \{\n\s+google\(\)\n\s+mavenCentral\(\)\n\s+flatDir\{\n\s+dirs 'src\/main\/libs', 'libs'\n\s+\}\n\}/, "");
  if (cleaned !== source) await writeFile(generatedGradleFile, cleaned, "utf8");
} catch {
  // The generated Cordova module is absent when no Cordova plugin is synced.
}

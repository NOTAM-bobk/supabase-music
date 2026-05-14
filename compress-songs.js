#!/usr/bin/env node
/**
 * compress-songs.js
 * ─────────────────────────────────────────────────────────────
 * Downloads every .mp3 from your Supabase bucket, re-encodes it
 * at a lower bitrate with ffmpeg, re-uploads the compressed file,
 * then deletes the original.
 *
 * USAGE
 *   node compress-songs.js                    (default: 96 kbps)
 *   node compress-songs.js --bitrate 128      (higher quality)
 *   node compress-songs.js --bitrate 64       (maximum compression)
 *   node compress-songs.js --dry-run          (preview only, no upload)
 *
 * REQUIREMENTS
 *   npm install @supabase/supabase-js node-fetch
 *   ffmpeg must be installed: https://ffmpeg.org/download.html
 *     macOS:   brew install ffmpeg
 *     Ubuntu:  sudo apt install ffmpeg
 *     Windows: https://www.gyan.dev/ffmpeg/builds/
 *
 * WHAT IT DOES
 *   • Re-encodes MP3 at target bitrate (default 96 kbps)
 *   • Strips unnecessary metadata/album art to reduce size further
 *   • Normalises audio to -14 LUFS (consistent perceived volume)
 *   • Skips files already under the target bitrate
 *   • Shows before/after file size and savings
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";
import { execSync, spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";

/* ── Config ──────────────────────────────────────────────── */
const SUPABASE_URL      = "https://efileseygykszmcudsnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaWxlc2V5Z3lrc3ptY3Vkc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTM1MDAsImV4cCI6MjA5NDE2OTUwMH0.YSDnxhkds8q4xM9W92vOvEPidl3VsYwAU87wrS-brNk";
const BUCKET            = "songs";

/* ── CLI args ────────────────────────────────────────────── */
const args      = process.argv.slice(2);
const bitrateIdx = args.indexOf("--bitrate");
const TARGET_KBPS = bitrateIdx !== -1 ? parseInt(args[bitrateIdx + 1], 10) : 96;
const DRY_RUN     = args.includes("--dry-run");

/* ── Verify ffmpeg is available ──────────────────────────── */
function checkFfmpeg() {
  const res = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (res.status !== 0 && res.error) {
    console.error("❌  ffmpeg not found. Install it first:");
    console.error("    macOS:  brew install ffmpeg");
    console.error("    Linux:  sudo apt install ffmpeg");
    console.error("    Win:    https://www.gyan.dev/ffmpeg/builds/");
    process.exit(1);
  }
}

/* ── Format bytes for display ────────────────────────────── */
function fmtBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/* ── List all files recursively in bucket ────────────────── */
async function listAll(supabase, path = "") {
  const { data, error } = await supabase.storage.from(BUCKET).list(path, {
    limit: 1000, sortBy: { column: "name", order: "asc" }
  });
  if (error) throw error;

  const files = [];
  for (const item of data) {
    if (!item.metadata) {
      // it's a folder — recurse
      const sub = await listAll(supabase, path ? `${path}/${item.name}` : item.name);
      files.push(...sub);
    } else {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      files.push({ ...item, fullPath });
    }
  }
  return files;
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  checkFfmpeg();

  console.log("\n🎵  Supabase Music Compressor");
  console.log(`    Target bitrate : ${TARGET_KBPS} kbps`);
  console.log(`    Bucket         : ${BUCKET}`);
  console.log(`    Dry run        : ${DRY_RUN ? "YES (no changes will be made)" : "NO"}`);
  console.log("─".repeat(52));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const tmpDir   = join(tmpdir(), "supabase-compress");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const all  = await listAll(supabase);
  const mp3s = all.filter(f => f.name.toLowerCase().endsWith(".mp3"));

  console.log(`\nFound ${mp3s.length} MP3 file(s) to process.\n`);

  let totalSaved   = 0;
  let skipped      = 0;
  let processed    = 0;
  let errors       = 0;

  for (const file of mp3s) {
    const label = file.fullPath;
    process.stdout.write(`  ${label} … `);

    try {
      /* Download the original file */
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(file.fullPath);
      if (dlErr) throw dlErr;

      const inputPath  = join(tmpDir, "input.mp3");
      const outputPath = join(tmpDir, "output.mp3");

      const arrBuf = await blob.arrayBuffer();
      writeFileSync(inputPath, Buffer.from(arrBuf));
      const origSize = arrBuf.byteLength;

      /* Probe existing bitrate via ffprobe */
      let existingKbps = 999;
      try {
        const probe = execSync(
          `ffprobe -v quiet -print_format json -show_streams "${inputPath}"`,
          { encoding: "utf8" }
        );
        const info   = JSON.parse(probe);
        const stream = info.streams?.find(s => s.codec_type === "audio");
        existingKbps = stream?.bit_rate ? Math.round(stream.bit_rate / 1000) : 999;
      } catch { /* ffprobe not available — skip check */ }

      if (existingKbps <= TARGET_KBPS + 5) {
        console.log(`already ≤${TARGET_KBPS} kbps, skipped`);
        skipped++;
        unlinkSync(inputPath);
        continue;
      }

      if (DRY_RUN) {
        console.log(`[dry-run] would compress ${fmtBytes(origSize)} @ ${existingKbps} kbps → ${TARGET_KBPS} kbps`);
        skipped++;
        unlinkSync(inputPath);
        continue;
      }

      /* Compress with ffmpeg
         -b:a  = audio bitrate
         -map_metadata -1 = strip all metadata tags (saves space)
         -ac 2 = force stereo
         -ar 44100 = standard sample rate
         -filter:a loudnorm = normalize loudness to -14 LUFS
      */
      const ffResult = spawnSync("ffmpeg", [
        "-y",                         // overwrite output
        "-i", inputPath,              // input
        "-codec:a", "libmp3lame",     // MP3 encoder
        "-b:a", `${TARGET_KBPS}k`,   // target bitrate
        "-ac", "2",                   // stereo
        "-ar", "44100",              // sample rate
        "-map_metadata", "-1",        // strip metadata
        "-filter:a", "loudnorm=I=-14:TP=-2:LRA=11", // normalize
        outputPath
      ], { stdio: "pipe" });

      if (ffResult.status !== 0) {
        throw new Error(`ffmpeg failed: ${ffResult.stderr?.toString()}`);
      }

      const compressed     = readFileSync(outputPath);
      const compressedSize = compressed.length;
      const saved          = origSize - compressedSize;
      const pct            = ((saved / origSize) * 100).toFixed(1);

      /* Upload compressed file back to same path */
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .update(file.fullPath, compressed, {
          contentType: "audio/mpeg",
          upsert:      true,
        });
      if (upErr) throw upErr;

      console.log(`${fmtBytes(origSize)} → ${fmtBytes(compressedSize)} (−${pct}% saved ${fmtBytes(saved)})`);
      totalSaved += saved;
      processed++;

      /* Cleanup temp files */
      unlinkSync(inputPath);
      unlinkSync(outputPath);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log("\n" + "─".repeat(52));
  console.log(`  ✅  Compressed : ${processed} file(s)`);
  console.log(`  ⏭️  Skipped    : ${skipped} file(s)`);
  if (errors > 0) console.log(`  ❌  Errors     : ${errors} file(s)`);
  console.log(`  💾  Total saved: ${fmtBytes(totalSaved)}`);
  console.log("─".repeat(52) + "\n");
}

main().catch(err => { console.error(err); process.exit(1); });

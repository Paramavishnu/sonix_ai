import { execSync } from 'child_process';
import fs from 'fs';
import { existsSync } from 'fs';
import {
  resolvedFfmpeg,
  resolvedFfprobe
} from '../utils/helpers.js';

export const ffmpegBin = resolvedFfmpeg;
export const ffprobeBin = resolvedFfprobe;


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function q(p) {
  return `"${String(p).replace(/"/g, '\\"')}"`;
}

function ffmpegExists() {
  try {
    execSync(`"${ffmpegBin}" -version`, {
      stdio: 'ignore'
    });

    return true;
  } catch {
    return false;
  }
}


// --------------------------------------------------
// GET AUDIO / VIDEO DURATION
// --------------------------------------------------

export function getDuration(file) {
  try {
    const out = execSync(
      `"${ffprobeBin}" -v error ` +
      `-show_entries format=duration ` +
      `-of default=noprint_wrappers=1:nokey=1 ` +
      `${q(file)}`,
      {
        encoding: 'utf8'
      }
    );

    const duration = parseFloat(out);

    return Number.isFinite(duration) ? duration : 0;

  } catch {
    return 0;
  }
}


// --------------------------------------------------
// MIX VOICE + BACKGROUND MUSIC + SFX
// --------------------------------------------------

export function mixAudio({
  voiceFile,
  musicFile,
  sfxFiles = [],
  musicVolume = 0.3,
  out
}) {

  if (!voiceFile) {
    throw new Error('Voice file required');
  }

  if (!existsSync(voiceFile)) {
    throw new Error(
      'Voice file not found: ' + voiceFile
    );
  }

  if (!out) {
    throw new Error('Output audio file required');
  }

  // ------------------------------------------------
  // CHECK MUSIC
  // ------------------------------------------------

  const hasMusic = Boolean(
    musicFile &&
    existsSync(musicFile) &&
    fs.statSync(musicFile).isFile()
  );


  // ------------------------------------------------
  // CHECK SFX
  // ------------------------------------------------

  const validSfx = (sfxFiles || []).filter(
    s =>
      s &&
      s.file &&
      existsSync(s.file) &&
      fs.statSync(s.file).isFile()
  );


  // ------------------------------------------------
  // GET NARRATION DURATION
  // ------------------------------------------------

  const voiceDuration = getDuration(voiceFile);

  if (!voiceDuration || voiceDuration <= 0) {
    throw new Error(
      'Could not determine narration duration'
    );
  }

  console.log(
    '[mixAudio] Voice duration:',
    voiceDuration
  );

  console.log(
    '[mixAudio] Music:',
    hasMusic ? musicFile : 'none'
  );

  console.log(
    '[mixAudio] Valid SFX:',
    validSfx.length
  );


  // ------------------------------------------------
  // NOTHING TO MIX
  // ------------------------------------------------

  if (!hasMusic && validSfx.length === 0) {

    console.log(
      '[mixAudio] No music or SFX. Converting narration only.'
    );

    execSync(
      `"${ffmpegBin}" -y ` +
      `-i ${q(voiceFile)} ` +
      `-codec:a libmp3lame ` +
      `-qscale:a 2 ` +
      `${q(out)}`,
      {
        stdio: 'inherit'
      }
    );

    if (!existsSync(out)) {
      throw new Error(
        'FFmpeg did not create the output audio file'
      );
    }

    return;
  }


  // ------------------------------------------------
  // BUILD INPUTS
  // ------------------------------------------------

  const inputs = [];
  const filters = [];
  const audioStreams = [];


  // Input 0 = narration

  inputs.push(
    `-i ${q(voiceFile)}`
  );


  // ------------------------------------------------
  // NARRATION
  // ------------------------------------------------

  filters.push(
    `[0:a]` +
    `aformat=sample_rates=44100:sample_fmts=fltp:channel_layouts=stereo,` +
    `volume=1` +
    `[voice]`
  );

  audioStreams.push('[voice]');


  let inputIndex = 1;


  // ------------------------------------------------
  // BACKGROUND MUSIC
  // ------------------------------------------------

  if (hasMusic) {

    /*
     * -stream_loop -1 makes the music repeat.
     * It is then trimmed to the narration duration.
     */

    inputs.push(
      `-stream_loop -1 -i ${q(musicFile)}`
    );


    const volume = Math.max(
      0.01,
      Math.min(
        1,
        Number(musicVolume) || 0.3
      )
    );


    filters.push(
      `[${inputIndex}:a]` +
      `aformat=sample_rates=44100:sample_fmts=fltp:channel_layouts=stereo,` +
      `volume=${volume},` +
      `atrim=duration=${voiceDuration},` +
      `asetpts=N/SR/TB` +
      `[music]`
    );


    audioStreams.push('[music]');


    console.log(
      '[mixAudio] Background music added:',
      musicFile
    );

    console.log(
      '[mixAudio] Music volume:',
      volume
    );


    inputIndex++;

  } else if (musicFile) {

    console.warn(
      '[mixAudio] Requested music file was not found:',
      musicFile
    );
  }


  // ------------------------------------------------
  // SOUND EFFECTS
  // ------------------------------------------------

  validSfx.forEach(
    (s, index) => {

      const delay = Math.max(
        0,
        Math.round(
          Number(s.at) || 0
        ) * 1000
      );


      const volume = Math.max(
        0.01,
        Math.min(
          1,
          Number(s.volume) || 0.8
        )
      );


      inputs.push(
        `-i ${q(s.file)}`
      );


      /*
       * aformat ensures the SFX has the same
       * sample rate / channel layout as narration.
       *
       * adelay moves the SFX to the requested time.
       *
       * apad makes sure the SFX doesn't end the
       * entire amix stream early.
       */

      filters.push(
        `[${inputIndex}:a]` +
        `aformat=sample_rates=44100:sample_fmts=fltp:channel_layouts=stereo,` +
        `volume=${volume},` +
        `adelay=${delay}|${delay},` +
        `apad,` +
        `atrim=duration=${voiceDuration},` +
        `asetpts=N/SR/TB` +
        `[sfx${index}]`
      );


      audioStreams.push(
        `[sfx${index}]`
      );


      console.log(
        '[mixAudio] SFX added:',
        s.file,
        'at:',
        delay,
        'ms',
        'volume:',
        volume
      );


      inputIndex++;
    }
  );


  // ------------------------------------------------
  // MIX ALL AUDIO STREAMS
  // ------------------------------------------------

  const mixCount =
    audioStreams.length;


  filters.push(
    `${audioStreams.join('')}` +
    `amix=` +
    `inputs=${mixCount}:` +
    `duration=first:` +
    `dropout_transition=0:` +
    `normalize=0` +
    `[mixed]`
  );


  // ------------------------------------------------
  // FINAL AUDIO COMMAND
  // ------------------------------------------------

  const command =
    `"${ffmpegBin}" -y ` +
    `${inputs.join(' ')} ` +
    `-filter_complex "${filters.join(';')}" ` +
    `-map "[mixed]" ` +
    `-t ${voiceDuration} ` +
    `-codec:a libmp3lame ` +
    `-qscale:a 2 ` +
    `${q(out)}`;


  console.log(
    '[mixAudio] Starting FFmpeg mix...'
  );


  try {

    execSync(
      command,
      {
        stdio: 'inherit'
      }
    );


    if (!existsSync(out)) {
      throw new Error(
        'FFmpeg finished but output audio was not created'
      );
    }


    const outputSize =
      fs.statSync(out).size;


    if (outputSize <= 0) {
      throw new Error(
        'FFmpeg created an empty output audio file'
      );
    }


    console.log(
      '[mixAudio] Mix completed successfully'
    );

    console.log(
      '[mixAudio] Output:',
      out
    );

    console.log(
      '[mixAudio] Output size:',
      outputSize,
      'bytes'
    );

  } catch (error) {

    console.error(
      '[mixAudio] FFmpeg mixing failed'
    );

    console.error(
      '[mixAudio] Command:',
      command
    );

    throw error;
  }
}


// --------------------------------------------------
// CREATE VIDEO
// --------------------------------------------------

export function makeVideo({
  audioFile,
  template = 'minimal',
  platform = 'youtube',
  script,
  subtitlesFile,
  out,
  width,
  height,
  duration
}) {

  if (!audioFile) {
    throw new Error(
      'Audio file required for video generation'
    );
  }

  if (!existsSync(audioFile)) {
    throw new Error(
      'Audio file not found: ' + audioFile
    );
  }

  if (!out) {
    throw new Error(
      'Video output file required'
    );
  }


  // ------------------------------------------------
  // CHECK FFMPEG
  // ------------------------------------------------

  if (!ffmpegExists()) {
    throw new Error(
      'FFmpeg is not available at: ' +
      ffmpegBin
    );
  }


  // ------------------------------------------------
  // TEMPLATE COLORS
  // ------------------------------------------------

  const templateColors = {

    minimal: '0x0f172a',

    educational: '0x1e3a5f',

    corporate: '0x1a1a2e',

    cinematic: '0x0a0a0f',

    bold: '0xdc2626',

    social: '0x7c3aed',

    quote: '0x111827',

    news: '0x1e293b'
  };


  const bg =
    templateColors[template] ||
    templateColors.minimal;


  // ------------------------------------------------
  // VIDEO SIZE
  // ------------------------------------------------

  const w =
    Number(width) || 1920;

  const h =
    Number(height) || 1080;


  // Prefer the supplied duration.
  // If invalid, use the actual audio duration.
  let dur =
    Number(duration) || getDuration(audioFile);


  if (!dur || dur <= 0) {
    dur = 5;
  }


  dur = Math.max(
    1,
    dur
  );


  console.log(
    '[makeVideo] Video size:',
    `${w}x${h}`
  );

  console.log(
    '[makeVideo] Duration:',
    dur
  );

  console.log(
    '[makeVideo] Template:',
    template
  );

  console.log(
    '[makeVideo] Audio:',
    audioFile
  );


  // ------------------------------------------------
  // SUBTITLE CHECK
  // ------------------------------------------------

  const hasSubs =
    subtitlesFile &&
    existsSync(subtitlesFile);


  // ------------------------------------------------
  // BASIC VIDEO
  // ------------------------------------------------

  /*
   * This generates the current SonixAI template
   * background and combines it with the narration.
   *
   * This is intentionally kept reliable rather than
   * attempting AI video generation from the script.
   */

  const baseVideoInput =
    `-f lavfi ` +
    `-i "color=c=${bg}:s=${w}x${h}:r=30:d=${dur}"`;


  // ------------------------------------------------
  // AUDIO INPUT
  // ------------------------------------------------

  const audioInput =
    `-i ${q(audioFile)}`;


  // ------------------------------------------------
  // VIDEO FILTER
  // ------------------------------------------------

  let videoFilter =
    `[0:v]format=yuv420p`;


  // ------------------------------------------------
  // SUBTITLES
  // ------------------------------------------------

  if (hasSubs) {

    /*
     * Escape the subtitle path for FFmpeg filter syntax.
     */

    let subtitlePath =
      String(subtitlesFile)
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:');


    videoFilter +=
      `,subtitles='${subtitlePath}'` +
      `:force_style=` +
      `'Fontsize=28,` +
      `PrimaryColour=&H00FFFFFF,` +
      `BackColour=&H80000000,` +
      `Alignment=2,` +
      `MarginV=60'`;
  }


  videoFilter +=
    `[v]`;


  // ------------------------------------------------
  // VIDEO COMMAND
  // ------------------------------------------------

  const command =
    `"${ffmpegBin}" -y ` +
    `${baseVideoInput} ` +
    `${audioInput} ` +
    `-filter_complex "${videoFilter}" ` +
    `-map "[v]" ` +
    `-map 1:a ` +
    `-c:v libx264 ` +
    `-preset medium ` +
    `-pix_fmt yuv420p ` +
    `-r 30 ` +
    `-c:a aac ` +
    `-b:a 192k ` +
    `-t ${dur} ` +
    `-shortest ` +
    `${q(out)}`;


  console.log(
    '[makeVideo] Starting FFmpeg video generation...'
  );


  try {

    execSync(
      command,
      {
        stdio: 'inherit'
      }
    );


    if (!existsSync(out)) {
      throw new Error(
        'FFmpeg finished but video output was not created'
      );
    }


    const outputSize =
      fs.statSync(out).size;


    if (outputSize <= 0) {
      throw new Error(
        'FFmpeg created an empty video file'
      );
    }


    console.log(
      '[makeVideo] Video generated successfully'
    );

    console.log(
      '[makeVideo] Output:',
      out
    );

    console.log(
      '[makeVideo] Output size:',
      outputSize,
      'bytes'
    );

  } catch (error) {

    console.error(
      '[makeVideo] FFmpeg video generation failed'
    );

    console.error(
      '[makeVideo] Command:',
      command
    );


    // ----------------------------------------------
    // FALLBACK WITHOUT SUBTITLES
    // ----------------------------------------------

    if (hasSubs) {

      console.warn(
        '[makeVideo] Subtitle rendering failed.'
      );

      console.warn(
        '[makeVideo] Retrying video without subtitles.'
      );


      const fallbackCommand =
        `"${ffmpegBin}" -y ` +
        `${baseVideoInput} ` +
        `${audioInput} ` +
        `-map 0:v ` +
        `-map 1:a ` +
        `-c:v libx264 ` +
        `-preset medium ` +
        `-pix_fmt yuv420p ` +
        `-r 30 ` +
        `-c:a aac ` +
        `-b:a 192k ` +
        `-t ${dur} ` +
        `-shortest ` +
        `${q(out)}`;


      try {

        execSync(
          fallbackCommand,
          {
            stdio: 'inherit'
          }
        );


        if (
          !existsSync(out) ||
          fs.statSync(out).size <= 0
        ) {
          throw new Error(
            'Fallback video was not created'
          );
        }


        console.log(
          '[makeVideo] Fallback video generated successfully'
        );

        return;

      } catch (fallbackError) {

        console.error(
          '[makeVideo] Fallback video generation failed'
        );

        throw fallbackError;
      }
    }


    throw error;
  }
}
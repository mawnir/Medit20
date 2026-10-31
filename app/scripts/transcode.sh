#!/usr/bin/env bash
# Transcode a Headspace series to web-ready m4a.
#
#   ./scripts/transcode.sh <series-id> <source-dir>
#
#   ./scripts/transcode.sh take20 "/Users/mawnirfas/Movies/Headspace/First Take 20"
#   ./scripts/transcode.sh focus  "/Users/mawnirfas/Movies/Headspace/2 - Focus"
#
# Output: $MEDIA_ROOT/<series-id>/day-NN[-part-M].m4a
# Existing outputs are skipped, so the script is resumable.

set -euo pipefail

SERIES="${1:?usage: transcode.sh <series-id> <source-dir>}"
SRC="${2:?usage: transcode.sh <series-id> <source-dir>}"
MEDIA_ROOT="${MEDIA_ROOT:-/Users/mawnirfas/Movies/Headspace/web-audio}"
OUT_DIR="$MEDIA_ROOT/$SERIES"

# 48 kbps mono is transparent for speech and ~60% smaller than the 128 kbps source.
BITRATE="${BITRATE:-48k}"
# -16 LUFS matches podcast/streaming convention and evens out the volume between rips.
LOUDNORM="${LOUDNORM:-loudnorm=I=-16:TP=-1.5:LRA=11}"

mkdir -p "$OUT_DIR"

shopt -s nullglob nocaseglob
files=("$SRC"/*.mp3)
if [ ${#files[@]} -eq 0 ]; then
  echo "error: no mp3 files in $SRC" >&2
  exit 1
fi

total=${#files[@]}
i=0
skipped=0

for f in "${files[@]}"; do
  i=$((i + 1))
  base=$(basename "$f")
  base="${base%.*}"

  # "Headspace - Focus - Day 7 - Part 2" | "Take 20 Day 7" | "Take 20 Day 7 Video"
  if [[ ! "$base" =~ Day\ ([0-9]+)(\ -\ Part\ ([0-9]+))? ]]; then
    echo "[$i/$total] skip (no day number): $base" >&2
    continue
  fi

  day=$(printf '%02d' "$((10#${BASH_REMATCH[1]}))")
  name="day-$day"
  if [ -n "${BASH_REMATCH[3]:-}" ]; then
    name="$name-part-${BASH_REMATCH[3]}"
  fi
  out="$OUT_DIR/$name.m4a"

  if [ -s "$out" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  printf '[%d/%d] %s -> %s\n' "$i" "$total" "$base" "$name.m4a"
  ffmpeg -nostdin -loglevel error -y -i "$f" \
    -ac 1 -ar 24000 \
    -af "$LOUDNORM" \
    -c:a aac -b:a "$BITRATE" \
    -movflags +faststart \
    "$out"
done

echo "done: $SERIES ($total source files, $skipped already present)"
du -sh "$OUT_DIR"

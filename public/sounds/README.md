# Sound Files Guide for TFI Music Player

## Current Status
This directory is meant to contain realistic cassette player sound effects. Currently, the app uses **synthesized fallback sounds** (generated beeps) because real audio files are missing.

## Required Sound Files
The following sound effects should be placed in this directory:

1. **click.mp3** - Button click sound
2. **insert.mp3** - Cassette insertion sound  
3. **eject.mp3** - Cassette ejection sound
4. **whir.mp3** - Motor/mechanical sound (optional)

## Recommendations
- **Format**: MP3 (widely supported)
- **Duration**: Keep short (0.1-0.5 seconds for clicks, 1-2 seconds for mechanical)
- **Quality**: 128kbps is sufficient for sound effects
- **Volume**: Normalize to consistent levels

## Sources for Sounds
Since real cassette sounds are copyrighted or hard to record, here are alternatives:

### Option 1: Generate with AI
Use tools like [ElevenLabs Sound Effects](https://elevenlabs.io/sound-effects) or similar:
- Prompt: "cassette tape insertion click"
- Prompt: "cassette eject mechanical sound"
- Prompt: "button click plastic"

### Option 2: Free Sound Libraries
- [Freesound.org](https://freesound.org) - Search for "cassette", "click", "mechanical"
- [Pixabay Audio](https://pixabay.com/sound-effects/) - Free for commercial use
- [Zapsplat](https://www.zapsplat.com/) - Requires attribution

### Option 3: Record Your Own
If you have a physical cassette player, record the actual sounds!

## Current Usage
The app will automatically use these files if they exist. If not, it falls back to synthesized beeps, which is what's happening now.

import os
import sys
from dotenv import load_dotenv
from pathlib import Path
import logging

# Load environment variables from .env file
# Assuming this config.py is in src/core/, then .parent.parent.parent is the project root.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# --- API Keys and Credentials ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "50736817-8cdaa7af7e26a15be147a2bcb")  # Default from docs
AYRSHARE_API_KEY = os.getenv("AYRSHARE_API_KEY")
GOOGLE_API_KEY_SUBSCRIBE_AND_INTERACT = os.getenv("GOOGLE_API_KEY_SUBSCRIBE_AND_INTERACT")
GOOGLE_CSE_ID_SUBSCRIBE_AND_INTERACT = os.getenv("GOOGLE_CSE_ID_SUBSCRIBE_AND_INTERACT")

CONFIG_DIR = BASE_DIR / "config"
CLIENT_SECRETS_FILE = CONFIG_DIR / os.getenv("CLIENT_SECRETS_FILE_NAME", "client_secrets.json")
TOKEN_FILE = CONFIG_DIR / os.getenv("TOKEN_FILE_NAME", "token.json")
PLAYLISTS_CACHE_FILE = CONFIG_DIR / os.getenv("PLAYLISTS_CACHE_FILE_NAME", "playlists_cache.json")

# --- Path Configurations ---
DATA_DIR = BASE_DIR / "data"

BASE_INPUT_DIR = DATA_DIR / os.getenv("BASE_INPUT_DIR_NAME", "input_videos")
DEFAULT_INPUT_SONG_DIR = DATA_DIR / os.getenv("DEFAULT_INPUT_SONG_DIR_NAME", "input_audio")
BASE_OUTPUT_DIR = DATA_DIR / os.getenv("BASE_OUTPUT_DIR_NAME", "output_videos")

ASSETS_DIR = DATA_DIR / os.getenv("ASSETS_DIR_NAME", "assets")
PRODUCED_THUMBNAILS_DIR = ASSETS_DIR / os.getenv("PRODUCED_THUMBNAILS_DIR_NAME", "Produced Thumbnails")
TEMP_IMAGES_DIR = ASSETS_DIR / os.getenv("TEMP_IMAGES_DIR_NAME", "Temporary Images")
BEST_THUMBNAILS_DIR = ASSETS_DIR / os.getenv("BEST_THUMBNAILS_DIR_NAME", "Best Thumbnails")

# Default intro/outro video paths within data/assets/
DEFAULT_INTRO_DIR = ASSETS_DIR / "Intro"
DEFAULT_OUTRO_DIR = ASSETS_DIR / "Outro"
OUTRO_DIR_1080x1920 = DEFAULT_OUTRO_DIR / "1080x1920"
OUTRO_DIR_1920x1080 = DEFAULT_OUTRO_DIR / "1920x1080"

DEFAULT_INTRO_PATH_1080_1920 = DEFAULT_INTRO_DIR / os.getenv("DEFAULT_INTRO_1080_1920_FILENAME", "default_intro_1080x1920.mp4")
DEFAULT_OUTRO_PATH_1080_1920 = OUTRO_DIR_1080x1920 / os.getenv("DEFAULT_OUTRO_1080_1920_FILENAME", "default_outro_1080x1920.mp4")
DEFAULT_INTRO_PATH_1920_1080 = DEFAULT_INTRO_DIR / os.getenv("DEFAULT_INTRO_1920_1080_FILENAME", "default_intro_1920x1080.mp4")
DEFAULT_OUTRO_PATH_1920_1080 = OUTRO_DIR_1920x1080 / os.getenv("DEFAULT_OUTRO_1920_1080_FILENAME", "default_outro_1920x1080.mp4")
FACE_IMAGE_PATH = ASSETS_DIR / os.getenv("FACE_IMAGE_FILENAME", "face.jpg") # Example, ensure your .env or filename matches

# Other project specific file paths (relative to BASE_DIR or DATA_DIR)
TOPICS_FILE = BASE_DIR / os.getenv("TOPICS_FILENAME", "topics.txt")
MYELOMA_LYRICS_FILE = BASE_DIR / os.getenv("MYELOMA_LYRICS_FILENAME", "myeloma_lyrics.txt")
WHISPER_ORIGINAL_SRT_FILE = DATA_DIR / os.getenv("WHISPER_ORIGINAL_SRT_FILENAME", "whisper_original.srt") # Or perhaps in BASE_OUTPUT_DIR / some_processing_folder

# Source movies directory (example of an absolute path that might be in .env)
# This is an example; if you use it, set SOURCE_MOVIES_DIR in your .env file
SOURCE_MOVIES_DIR_STR = os.getenv("SOURCE_MOVIES_DIR")
SOURCE_MOVIES_DIR = Path(SOURCE_MOVIES_DIR_STR) if SOURCE_MOVIES_DIR_STR else None

# Ensure base data directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
BASE_INPUT_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_INPUT_SONG_DIR.mkdir(parents=True, exist_ok=True)
BASE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
PRODUCED_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
BEST_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_INTRO_DIR.mkdir(parents=True, exist_ok=True)
OUTRO_DIR_1080x1920.mkdir(parents=True, exist_ok=True)
OUTRO_DIR_1920x1080.mkdir(parents=True, exist_ok=True)

# --- Logging Configuration ---
LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.INFO)
LOG_FORMAT = os.getenv("LOG_FORMAT", "%(asctime)s - %(levelname)s - [%(name)s:%(lineno)d] - %(message)s")

# --- Application Specifics ---
DEFAULT_CHANNEL_ID = os.getenv("DEFAULT_CHANNEL_ID", "YOUR_CHANNEL_ID_HERE") 
DEFAULT_WHISPER_MODEL = os.getenv("DEFAULT_WHISPER_MODEL", "small")
DEFAULT_TITLE_PREFIX = os.getenv("DEFAULT_TITLE_PREFIX", "")
DEFAULT_PLAYLIST_TITLE = os.getenv("DEFAULT_PLAYLIST_TITLE", "Uploaded Videos")
DEFAULT_MORNING_TIME = os.getenv("DEFAULT_MORNING_TIME", "07:00")
DEFAULT_EVENING_TIME = os.getenv("DEFAULT_EVENING_TIME", "19:00")
DEFAULT_STANDARD_TIME = os.getenv("DEFAULT_STANDARD_TIME", "14:00")
DEFAULT_BATCH_SIZE = int(os.getenv("DEFAULT_BATCH_SIZE", "10"))
DEFAULT_VIDEO_TOPIC = os.getenv("DEFAULT_VIDEO_TOPIC", "Default Topic")
MAX_SUBTITLE_LINE_LENGTH = int(os.getenv("MAX_SUBTITLE_LINE_LENGTH", "50"))
MIN_SUBTITLE_DURATION_MS = int(os.getenv("MIN_SUBTITLE_DURATION_MS", "1000"))

# --- Validate that essential keys and paths are loaded ---
essential_vars = {
    "OPENAI_API_KEY": OPENAI_API_KEY,
    "CLIENT_SECRETS_FILE": CLIENT_SECRETS_FILE,
}
# Only print critical warnings, suppress routine config messages
for var_name, var_value in essential_vars.items():
    if not var_value and var_name == "OPENAI_API_KEY":
        print(f"Warning: Configuration for '{var_name}' not found. Check .env file or environment variables.", file=sys.stderr)

# Removed verbose config loading messages - keeping console clean for debugging

if __name__ == "__main__":
    print("\n--- API Keys and Credentials ---")
    print(f"OPENAI_API_KEY: {'Set' if OPENAI_API_KEY else 'Not Set'}")
    print(f"PEXELS_API_KEY: {'Set' if PEXELS_API_KEY else 'Not Set'}")
    print(f"AYRSHARE_API_KEY: {'Set' if AYRSHARE_API_KEY else 'Not Set'}")
    print(f"GOOGLE_API_KEY_SUBSCRIBE_AND_INTERACT: {'Set' if GOOGLE_API_KEY_SUBSCRIBE_AND_INTERACT else 'Not Set'}")
    print(f"GOOGLE_CSE_ID_SUBSCRIBE_AND_INTERACT: {'Set' if GOOGLE_CSE_ID_SUBSCRIBE_AND_INTERACT else 'Not Set'}")
    print(f"CLIENT_SECRETS_FILE: {CLIENT_SECRETS_FILE} (exists: {CLIENT_SECRETS_FILE.exists()})")
    print(f"TOKEN_FILE: {TOKEN_FILE} (exists: {TOKEN_FILE.exists()})")
    print(f"PLAYLISTS_CACHE_FILE: {PLAYLISTS_CACHE_FILE} (exists: {PLAYLISTS_CACHE_FILE.exists()})")

    print("\n--- Path Configurations ---")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"DATA_DIR: {DATA_DIR} (exists: {DATA_DIR.exists()})")
    print(f"BASE_INPUT_DIR (Videos): {BASE_INPUT_DIR} (exists: {BASE_INPUT_DIR.exists()})")
    print(f"DEFAULT_INPUT_SONG_DIR (Audio): {DEFAULT_INPUT_SONG_DIR} (exists: {DEFAULT_INPUT_SONG_DIR.exists()})")
    print(f"BASE_OUTPUT_DIR (Videos): {BASE_OUTPUT_DIR} (exists: {BASE_OUTPUT_DIR.exists()})")
    print(f"ASSETS_DIR: {ASSETS_DIR} (exists: {ASSETS_DIR.exists()})")
    print(f"PRODUCED_THUMBNAILS_DIR: {PRODUCED_THUMBNAILS_DIR} (exists: {PRODUCED_THUMBNAILS_DIR.exists()})")
    print(f"TEMP_IMAGES_DIR: {TEMP_IMAGES_DIR} (exists: {TEMP_IMAGES_DIR.exists()})")
    print(f"BEST_THUMBNAILS_DIR: {BEST_THUMBNAILS_DIR} (exists: {BEST_THUMBNAILS_DIR.exists()})")
    print(f"DEFAULT_INTRO_DIR: {DEFAULT_INTRO_DIR} (exists: {DEFAULT_INTRO_DIR.exists()})")
    print(f"DEFAULT_OUTRO_DIR: {DEFAULT_OUTRO_DIR} (exists: {DEFAULT_OUTRO_DIR.exists()})")
    print(f"OUTRO_DIR_1080x1920: {OUTRO_DIR_1080x1920} (exists: {OUTRO_DIR_1080x1920.exists()})")
    print(f"OUTRO_DIR_1920x1080: {OUTRO_DIR_1920x1080} (exists: {OUTRO_DIR_1920x1080.exists()})")
    print(f"DEFAULT_INTRO_PATH_1080_1920: {DEFAULT_INTRO_PATH_1080_1920} (exists: {DEFAULT_INTRO_PATH_1080_1920.exists()})")
    print(f"DEFAULT_OUTRO_PATH_1080_1920: {DEFAULT_OUTRO_PATH_1080_1920} (exists: {DEFAULT_OUTRO_PATH_1080_1920.exists()})")
    print(f"DEFAULT_INTRO_PATH_1920_1080: {DEFAULT_INTRO_PATH_1920_1080} (exists: {DEFAULT_INTRO_PATH_1920_1080.exists()})")
    print(f"DEFAULT_OUTRO_PATH_1920_1080: {DEFAULT_OUTRO_PATH_1920_1080} (exists: {DEFAULT_OUTRO_PATH_1920_1080.exists()})")
    print(f"FACE_IMAGE_PATH: {FACE_IMAGE_PATH} (exists: {FACE_IMAGE_PATH.exists()})")
    print(f"TOPICS_FILE: {TOPICS_FILE} (exists: {TOPICS_FILE.exists()})")
    print(f"MYELOMA_LYRICS_FILE: {MYELOMA_LYRICS_FILE} (exists: {MYELOMA_LYRICS_FILE.exists()})")
    print(f"WHISPER_ORIGINAL_SRT_FILE: {WHISPER_ORIGINAL_SRT_FILE} (exists: {WHISPER_ORIGINAL_SRT_FILE.exists()})")
    if SOURCE_MOVIES_DIR:
        print(f"SOURCE_MOVIES_DIR: {SOURCE_MOVIES_DIR} (exists: {SOURCE_MOVIES_DIR.exists()})")
    else:
        print("SOURCE_MOVIES_DIR: Not Set")

    print("\n--- Logging Configuration ---")
    print(f"LOG_LEVEL: {LOG_LEVEL_STR} (Effective: {LOG_LEVEL})")
    print(f"LOG_FORMAT: {LOG_FORMAT}")

    print("\n--- Application Specifics ---")
    print(f"DEFAULT_CHANNEL_ID: {DEFAULT_CHANNEL_ID}")
    print(f"DEFAULT_WHISPER_MODEL: {DEFAULT_WHISPER_MODEL}")
    print(f"DEFAULT_TITLE_PREFIX: {DEFAULT_TITLE_PREFIX}")
    print(f"DEFAULT_PLAYLIST_TITLE: {DEFAULT_PLAYLIST_TITLE}")
    print(f"DEFAULT_MORNING_TIME: {DEFAULT_MORNING_TIME}")
    print(f"DEFAULT_EVENING_TIME: {DEFAULT_EVENING_TIME}")
    print(f"DEFAULT_STANDARD_TIME: {DEFAULT_STANDARD_TIME}")
    print(f"DEFAULT_BATCH_SIZE: {DEFAULT_BATCH_SIZE}")
    print(f"DEFAULT_VIDEO_TOPIC: {DEFAULT_VIDEO_TOPIC}")
    print(f"MAX_SUBTITLE_LINE_LENGTH: {MAX_SUBTITLE_LINE_LENGTH}")
    print(f"MIN_SUBTITLE_DURATION_MS: {MIN_SUBTITLE_DURATION_MS}") 
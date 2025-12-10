#!/usr/bin/env python3
"""
Manages and provides sound effects for video processing.
"""

import logging
from pathlib import Path
import random

from .config import ASSETS_DIR

logger = logging.getLogger(__name__)

class SoundEffects:
    """A class to manage loading and retrieving sound effects."""

    def __init__(self, effect_pack: str = 'sound-effects'):
        """
        Initializes the SoundEffects manager.

        Args:
            effect_pack (str): The name of the sound effect pack to use.
                               Now defaults to using the main 'Sound Effects' folder.
        """
        self.sound_effects_dir = ASSETS_DIR / 'Sound Effects'  # Main sound effects folder with quality swoosh sounds
        self.effects = []
        self.load_effects()

    def load_effects(self):
        """Loads the sound effect files from the Sound Effects directory."""
        # Load all sound effects from the main Sound Effects directory
        if self.sound_effects_dir.exists() and self.sound_effects_dir.is_dir():
            self.effects = list(self.sound_effects_dir.glob('*.mp3')) + list(self.sound_effects_dir.glob('*.wav'))
            if self.effects:
                logger.info(f"Loaded {len(self.effects)} sound effects from 'Sound Effects' folder.")
        
        if not self.effects:
            logger.warning("No sound effects found in Sound Effects directory.")

    def get_random_effect(self) -> Path | None:
        """
        Returns the path to a random sound effect from the loaded effects.

        Returns:
            Path | None: The path to a sound effect, or None if no effects are loaded.
        """
        if not self.effects:
            return None
        return random.choice(self.effects)

    def get_image_display_effect(self) -> Path | None:
        """
        Returns a random sound effect (all effects are now high-quality).
        
        Returns:
            Path | None: The path to a sound effect, or None if no effects are loaded.
        """
        return self.get_random_effect()

    def get_effect_for_keyword(self, keyword: str) -> Path | None:
        """
        Returns a random sound effect for any keyword.
        All effects are now from the high-quality Sound Effects folder.

        Args:
            keyword (str): The keyword to find an effect for.

        Returns:
            Path | None: The path to a sound effect, or None if no effects are loaded.
        """
        return self.get_random_effect() 
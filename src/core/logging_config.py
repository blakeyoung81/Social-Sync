import logging
import sys

class ColorFormatter(logging.Formatter):
    """
    A custom logging formatter that adds ANSI color codes to log messages based on level.
    """
    GREY = "\x1b[38;20m"
    GREEN = "\x1b[32m"
    YELLOW = "\x1b[33;20m"
    RED = "\x1b[31;20m"
    BOLD_RED = "\x1b[31;1m"
    RESET = "\x1b[0m"
    
    # Adjusted format string to be more concise for terminal output
    BASE_FORMAT = "%(asctime)s - %(levelname)s - [%(module)s:%(lineno)d] - %(message)s"

    FORMATS = {
        logging.DEBUG: GREY + BASE_FORMAT + RESET,
        logging.INFO: GREEN + BASE_FORMAT + RESET,
        logging.WARNING: YELLOW + BASE_FORMAT + RESET,
        logging.ERROR: RED + BASE_FORMAT + RESET,
        logging.CRITICAL: BOLD_RED + BASE_FORMAT + RESET,
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt, datefmt='%Y-%m-%d %H:%M:%S')
        return formatter.format(record)

def setup_colored_logging():
    """
    Sets up a colored logger for the root logger.
    """
    # Get the root logger
    root_logger = logging.getLogger()
    
    # Remove any existing handlers to avoid duplicate logs
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # Create a handler that writes to stdout (to avoid web interface stderr capture)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ColorFormatter())
    
    # Add the handler to the root logger
    root_logger.addHandler(handler)
    
    # Set the root logger's level (e.g., to INFO or DEBUG)
    root_logger.setLevel(logging.INFO) 
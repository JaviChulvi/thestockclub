from datetime import datetime
import os

def is_production() -> bool:
    """Check if running in production environment"""
    return os.getenv('NODE_ENV') == 'production' or os.getenv('PRODUCTION') == 'true'

def format_date(date_input):
    """
    Convert a date input (datetime.date, datetime.datetime, or string) to "DD/MM/YYYY".
    If input is a string, tries RFC 1123/2822 format (e.g., "Mon, 07 Mar 2022 00:00:00 GMT"),
    ISO format, or "YYYY-MM-DD". Returns the formatted date string or None if conversion fails.
    """
    if date_input is None:
        return None

    # If already a datetime or date object, just format it
    if hasattr(date_input, "strftime"):
        return date_input.strftime("%d/%m/%Y")

    # Otherwise, try to parse as string
    try:
        # Try RFC 1123/2822 format first
        input_format = "%a, %d %b %Y %H:%M:%S GMT"
        return datetime.strptime(date_input, input_format).strftime("%d/%m/%Y")
    except Exception:
        pass

    try:
        # Try ISO format (e.g., "2022-03-07" or "2022-03-07T00:00:00")
        return datetime.fromisoformat(date_input).strftime("%d/%m/%Y")
    except Exception:
        pass

    try:
        # Try "YYYY-MM-DD"
        return datetime.strptime(date_input, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        pass

    print(f"Error: Unable to parse the date input '{date_input}'.")
    return None
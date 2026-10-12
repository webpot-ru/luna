"""Run the existing Edge TTS CLI with the October 2026 synthesis endpoint.

Same package, voices and MP3 format; no installed-package files are modified.
Based on upstream rany2/edge-tts PR491. No alternate hosts or proxy retries.
"""
import sys
from datetime import timezone
from email.utils import parsedate_to_datetime


def parse_http_date(value):
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.timestamp()
    except (TypeError, ValueError, IndexError):
        return None


def configure_endpoint(constants, communicate, drm):
    url = (
        "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
        f"?Ocp-Apim-Subscription-Key={constants.TRUSTED_CLIENT_TOKEN}"
    )
    constants.WSS_URL = url
    communicate.WSS_URL = url
    drm.DRM.parse_rfc2616_date = staticmethod(parse_http_date)


def main():
    from edge_tts import communicate, constants, drm
    from edge_tts.util import main as cli_main
    configure_endpoint(constants, communicate, drm)
    try:
        cli_main()
    except Exception as error:
        # Do not expose websocket URLs, query authentication or response headers.
        status = getattr(error, "status", None)
        print(f"Edge TTS failed: {type(error).__name__}; HTTP status={status or 'unavailable'}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

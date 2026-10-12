import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("compat", Path(__file__).with_name("edge-tts-compatible.py"))
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)
constants = SimpleNamespace(TRUSTED_CLIENT_TOKEN="test-only", WSS_URL="legacy", VOICE_LIST="unchanged")
communicate = SimpleNamespace(WSS_URL="legacy")
drm = SimpleNamespace(DRM=type("DRM", (), {}))
compat.configure_endpoint(constants, communicate, drm)
assert constants.WSS_URL == communicate.WSS_URL
assert constants.WSS_URL == "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=test-only"
assert constants.VOICE_LIST == "unchanged"
assert drm.DRM.parse_rfc2616_date("Mon, 12 Oct 2026 03:16:09 GMT") == 1791774969.0
assert compat.parse_http_date("Mon, 12 Oct 2026 03:16:09 +0000") == 1791774969.0
assert compat.parse_http_date("Mon, 12 Oct 2026 03:16:09") == 1791774969.0
assert compat.parse_http_date("") is None
assert compat.parse_http_date("not a date") is None
print("Edge TTS endpoint and HTTP-date compatibility tests passed")

"""
Configuration package

This package coexists with a sibling module file `config.py` that defines
the Pydantic BaseSettings instance `settings`. To avoid import ambiguity
(`from config import settings`), we proxy-load that file here and expose
`settings` in this package's namespace.
"""

import os
import importlib.util
from types import ModuleType

_settings = None
_SettingsClass = None

try:
	# Resolve path to sibling config.py (one level up from this __init__.py)
	_module_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config.py"))
	_spec = importlib.util.spec_from_file_location("app_file_config", _module_path)
	if _spec and _spec.loader:
		_mod = importlib.util.module_from_spec(_spec)  # type: ModuleType
		_spec.loader.exec_module(_mod)
		_settings = getattr(_mod, "settings", None)
		_SettingsClass = getattr(_mod, "Settings", None)
except Exception:
	# Silently ignore; downstream code may handle missing settings
	_settings = None
	_SettingsClass = None

# Re-export for `from config import settings, Settings`
settings = _settings  # type: ignore
Settings = _SettingsClass  # type: ignore

__all__ = [
	"settings",
	"Settings",
]


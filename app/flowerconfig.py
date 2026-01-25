import logging as _logging

# Server settings
port = 5555
xheaders = True
url_prefix = "/admin/flower"

# Logging
logging = "DEBUG"

# Enable tornado access logging
_logging.getLogger("tornado.access").setLevel(_logging.INFO)
_logging.getLogger("tornado.access").addHandler(_logging.StreamHandler())

# API access
unauthenticated_api = True

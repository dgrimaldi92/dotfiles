local paths = require("hypr.omarchy.paths")
local require_all = require("hypr.omarchy.require_all")

local toggles_dir = paths.config_home .. "/hypr/omarchy/toggles"
package.path = toggles_dir .. "/?.lua;" .. package.path

require_all.files(toggles_dir, nil, { reload = true })

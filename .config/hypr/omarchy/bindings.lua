local paths = require("hypr.omarchy.paths")
local require_all = require("hypr.omarchy.require_all")

require_all.files(paths.omarchy_path .. "/hypr/omarchy/bindings", "hypr.omarchy.bindings")

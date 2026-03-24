cask "apiark" do
  version "0.3.2"

  on_arm do
    url "https://github.com/berbicanes/apiark/releases/download/v#{version}/ApiArk_aarch64.dmg",
        verified: "github.com/berbicanes/apiark/"
    sha256 ""
  end

  on_intel do
    url "https://github.com/berbicanes/apiark/releases/download/v#{version}/ApiArk_x64.dmg",
        verified: "github.com/berbicanes/apiark/"
    sha256 ""
  end

  name "ApiArk"
  desc "Local-first API development platform"
  homepage "https://github.com/berbicanes/apiark"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :monterey"

  app "ApiArk.app"

  zap trash: [
    "~/.apiark",
    "~/Library/Application Support/dev.apiark.app",
    "~/Library/Caches/dev.apiark.app",
    "~/Library/Preferences/dev.apiark.app.plist",
    "~/Library/Saved Application State/dev.apiark.app.savedState",
  ]
end

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "airbuild-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
  AirBuild Distribution SDK for React Native. Check for new binary builds
  from AirBuild install links and prompt testers to install them.
                   DESC
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = { "AirBuild" => "support@airbuild.dev" }
  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/airbuild/airbuild.git", :tag => "v#{s.version}" }
  s.source_files = "ios/**/*.{h,m}"
  s.dependency "React-Core"
end

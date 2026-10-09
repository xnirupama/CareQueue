param([string]$Architectures='arm64-v8a',[switch]$SkipPrebuild)
$ErrorActionPreference='Stop'
$taskProject=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskProject
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to your supported JDK installation.' }
if (-not $env:ANDROID_HOME) { throw 'Set ANDROID_HOME to your Android SDK installation.' }
if ($SkipPrebuild) {
 if (-not (Test-Path -LiteralPath (Join-Path $taskProject 'android/gradlew.bat'))) { throw 'Generate the Android project before using -SkipPrebuild.' }
} else {
 & npx.cmd expo prebuild --platform android --no-install
 if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
}
# Discard only the old generated resource when upgrading its corrected JPEG slot.
$taskLegacy=Join-Path $taskProject 'android/app/build/generated/res/react/release/drawable-mdpi/assets_figma_194c4ad6a8fe412b92bcba1a47732585.png'
$taskJpeg=Join-Path $taskProject 'assets/figma/194c4ad6-a8fe-412b-92bc-ba1a47732585.jpg'
if ((Test-Path -LiteralPath $taskLegacy) -and (Test-Path -LiteralPath $taskJpeg)) {
 $taskLegacyResolved=(Resolve-Path -LiteralPath $taskLegacy).Path
 if (-not $taskLegacyResolved.StartsWith($taskProject+[IO.Path]::DirectorySeparatorChar)) { throw 'Generated resource is outside the project.' }
 Remove-Item -LiteralPath $taskLegacyResolved
}
$env:NODE_ENV='production'
$env:GRADLE_USER_HOME=Join-Path $taskProject 'tmp/gradle'
Push-Location -LiteralPath (Join-Path $taskProject 'android')
try {
 $taskGradleArgs=@(':app:assembleRelease', "-PreactNativeArchitectures=$Architectures", '--no-daemon', '--max-workers=2', '--console=plain')
 if ($env:CAREQUEUE_NINJA) {
  if (-not (Test-Path -LiteralPath $env:CAREQUEUE_NINJA)) { throw 'CAREQUEUE_NINJA does not point to an executable.' }
  $taskInit=Join-Path $taskProject 'tmp/ninja-init.gradle'
  New-Item -ItemType Directory -Path (Split-Path -Parent $taskInit) -Force | Out-Null
  $taskInitText=@("allprojects {", "    afterEvaluate { p ->", "        def android = p.extensions.findByName('android')", "        def ninjaPath = System.getenv('CAREQUEUE_NINJA')", "        if (android != null && ninjaPath != null) {", "            android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_MAKE_PROGRAM=' + ninjaPath.replace('\\', '/'))", "        }", "    }", "}") -join [Environment]::NewLine
  Set-Content -Encoding ascii -LiteralPath $taskInit -Value $taskInitText
  $taskGradleArgs+=@('--init-script',$taskInit)
 }
 & ./gradlew.bat @taskGradleArgs
 if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
} finally { Pop-Location }
$taskApk=Join-Path $taskProject 'android/app/build/outputs/apk/release/app-release.apk'
if (-not (Test-Path -LiteralPath $taskApk)) { throw 'Build did not produce the expected APK.' }
$taskArtifacts=Join-Path $taskProject 'artifacts'
New-Item -ItemType Directory -Path $taskArtifacts -Force | Out-Null
$taskDestination=Join-Path $taskArtifacts 'CareQueue-preview.apk'
Copy-Item -LiteralPath $taskApk -Destination $taskDestination
Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256
Write-Output "APK: $taskDestination. Install and test on a compatible Android phone."

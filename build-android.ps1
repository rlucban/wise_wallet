# ==============================================================================
# EXPO ANDROID LOCAL COMPILER ALL-IN-ONE AUTOMATION SCRIPT
# Run this from the root directory of your project (D:\hobby\wise_wallet)
# ==============================================================================
$ErrorActionPreference = "Continue"
Clear-Host

$logFile = ".\build-android.log"

try {
    $logWriter = [System.IO.StreamWriter]::new($logFile, $false)

    Write-Host ">>> Starting All-In-One Android Release Build Pipeline..." -ForegroundColor Cyan
    $logWriter.WriteLine(">>> Starting All-In-One Android Release Build Pipeline...")

    # --- STEP 1: Kill Stubborn Background File Locks ---
    Write-Host "[1/8] Clearing background process file locks (Java, Node, ADB)..." -ForegroundColor Yellow
    Stop-Process -Name "java", "node", "adb" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $logWriter.WriteLine("[1/8] Clearing background process file locks...")

    # --- STEP 2: Clean Android Build Outputs ---
    Write-Host "[2/8] Clearing Android build cache and outputs..." -ForegroundColor Yellow
    if (Test-Path ".\android") {
        try { Remove-Item -Recurse -Force .\android } catch { cmd /c "rmdir /s /q android" }
    }
    if (Test-Path ".\package-lock.json") { Remove-Item -Force .\package-lock.json }
    if (Test-Path ".\yarn.lock") { Remove-Item -Force .\yarn.lock }
    $logWriter.WriteLine("[2/8] Clearing Android build cache and outputs...")

    # --- STEP 3: Reinstall dependencies ---
    Write-Host "[3/8] Installing dependencies..." -ForegroundColor Yellow
    $npmOutput = cmd /c "npm install 2>&1"
    $npmOutput | ForEach-Object { $logWriter.WriteLine($_) }
    Write-Host $npmOutput
    $logWriter.WriteLine("[3/8] Installing dependencies completed.")

    # --- STEP 4: Run Expo Prebuild ---
    Write-Host "[4/8] Running Expo Prebuild to generate Android code..." -ForegroundColor Yellow
    $prebuildOutput = npx expo prebuild --platform android 2>&1
    $prebuildOutput | ForEach-Object { $logWriter.WriteLine($_) }
    Write-Host $prebuildOutput
    $logWriter.WriteLine("[4/8] Running Expo Prebuild completed.")

    # --- STEP 5: Clean Gradle Cache ---
    Write-Host "[5/8] Cleaning Gradle cache and build intermediates..." -ForegroundColor Yellow
    Set-Location .\android
    $cleanOutput = .\gradlew.bat clean -q 2>&1
    $cleanOutput | ForEach-Object { $logWriter.WriteLine($_) }
    Write-Host $cleanOutput
    Set-Location ..
    $logWriter.WriteLine("[5/8] Cleaning Gradle cache completed.")

    # --- STEP 6: Build Release APK ---
    Write-Host "[6/8] Building Android Release APK..." -ForegroundColor Yellow
    Write-Host "Compiling C++ files and packaging binaries. This may take a few minutes..." -ForegroundColor Cyan
    $env:NODE_ENV = "production"
    Set-Location .\android
    $buildOutput = .\gradlew.bat assembleRelease --stacktrace 2>&1
    $buildOutput | ForEach-Object { $logWriter.WriteLine($_) }
    Write-Host $buildOutput
    Set-Location ..
    $logWriter.WriteLine("[6/8] Building Release APK completed.")

    # --- STEP 7: Verify Output ---
    Write-Host "[7/8] Verifying APK output..." -ForegroundColor Yellow
    $apkPath = ".\android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        Write-Host ""
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host "SUCCESS! Android APK built successfully!" -ForegroundColor Green
        Write-Host "APK Location: $PWD\$apkPath" -ForegroundColor Cyan
        Write-Host "=================================================================" -ForegroundColor Green
        Invoke-Item ".\android\app\build\outputs\apk\release\"
        $logWriter.WriteLine("[7/8] SUCCESS! APK built at $apkPath")
    } else {
        Write-Host ""
        Write-Host "Build failed. Check build-android.log for details." -ForegroundColor Red
        $logWriter.WriteLine("[7/8] BUILD FAILED - no APK output found.")
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $logWriter.WriteLine("ERROR: $($_.Exception.Message)")
    $logWriter.WriteLine($_.ScriptStackTrace)
} finally {
    $logWriter.Flush()
    $logWriter.Close()
    $logWriter.Dispose()
}

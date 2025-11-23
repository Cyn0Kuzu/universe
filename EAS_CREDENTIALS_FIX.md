# EAS Credentials Command Fix for PowerShell

## Problem
The `eas credentials` command fails in PowerShell with the error:
```
Input is required, but stdin is not readable. Failed to display prompt: Select platform
```

This is a known issue with PowerShell's handling of interactive prompts from Node.js CLI tools.

## Solutions

### Solution 1: Use Command Prompt (Recommended)
1. Open **Command Prompt** (cmd.exe) - not PowerShell
2. Navigate to your project:
   ```cmd
   cd C:\Users\lenovo\Desktop\Universe
   ```
3. Run the command:
   ```cmd
   eas credentials --platform ios
   ```
   or
   ```cmd
   eas credentials --platform android
   ```

### Solution 2: Use Git Bash (If Installed)
1. Open **Git Bash**
2. Navigate to your project:
   ```bash
   cd /c/Users/lenovo/Desktop/Universe
   ```
3. Run the command:
   ```bash
   eas credentials --platform ios
   ```

### Solution 3: Use WSL (Windows Subsystem for Linux)
If you have WSL installed:
1. Open your WSL terminal
2. Navigate to your project (mounted at `/mnt/c/Users/lenovo/Desktop/Universe`)
3. Run the command normally

### Solution 4: Use EAS Web Interface
You can also manage credentials through the Expo/EAS web dashboard:
1. Go to https://expo.dev
2. Navigate to your project
3. Go to Credentials section
4. Configure credentials through the web interface

### Solution 5: Use the Configure Build Subcommand
Try using the more specific subcommand with both platform and profile:
```powershell
eas credentials:configure-build --platform ios --profile production
```
Note: This may still prompt for Apple account login, so you may still need to use Command Prompt.

## Quick Reference

For **iOS** credentials:
```cmd
eas credentials --platform ios
```

For **Android** credentials:
```cmd
eas credentials --platform android
```

For specific build profile configuration:
```cmd
eas credentials:configure-build --platform ios --profile production
```

## Why This Happens
PowerShell uses a different method for handling stdin/stdout compared to Command Prompt, which can cause issues with Node.js-based CLI tools that rely on interactive prompts. Command Prompt handles these prompts more reliably.


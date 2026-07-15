# Windows Task Scheduler: weekday 08:15 Luma sales report to a file.
# Run once from an elevated-or-not PowerShell to register the task.
# Requires: `npm install -g @elnora-ai/luma` and LUMA_API_KEY stored via
#   elnora-luma auth set-key secret-XXXX
# Pause without deleting:  Disable-ScheduledTask -TaskName "LumaReport"

$eventId = "evt-XXXX"
$outFile = "$env:USERPROFILE\Documents\luma-sales.md"

# cmd.exe resolves the npm-generated elnora-luma.cmd shim via PATH+PATHEXT;
# Task Scheduler's CreateProcess launcher cannot resolve a bare extensionless name.
$action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument "/c elnora-luma report sales --event-id $eventId --format md --out `"$outFile`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At 8:15am

Register-ScheduledTask -TaskName "LumaReport" -Action $action -Trigger $trigger `
  -Description "Daily Luma sales report (read-only)"

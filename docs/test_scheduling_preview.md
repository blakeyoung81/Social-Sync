# Smart Scheduling Preview Test Guide

## What Was Fixed

1. **Scheduling Preview Position**: The `SmartSchedulingPreview` component now appears **immediately below** the advanced scheduling configuration, not in the Admin & Maintenance section.

2. **Conditional Display**: The preview now shows based on the selected scheduling mode:
   - **Smart Mode (delayed)**: Shows the Smart Scheduling Preview with configuration details
   - **Manual Mode (custom)**: Shows a Manual Scheduling Preview with different styling

3. **Automatic Triggering**: When you select "Smart Mode", it automatically calls the video discovery API with the smart scheduling parameters.

4. **Better Parameters**: The API now receives the correct parameters for scheduling strategy, posting times, and slot intervals.

## How to Test

1. **Load the Application**: The app should be running at http://localhost:3000

2. **Set Up Videos**: 
   - Set an input folder with some test videos
   - Make sure you have run "Scan Channel" first (required for smart scheduling)

3. **Test Smart Mode**:
   - In Step 2, select "Batch Upload" or "Single Upload" mode
   - In the Advanced Scheduling section, select "Smart Mode"
   - Configure your scheduling strategy (Standard, Day & Night, or Next Slot)
   - Set your posting times (morning, afternoon, evening)
   - **IMMEDIATELY** below the configuration, you should see the Smart Scheduling Preview

4. **Test Manual Mode**:
   - Switch to "Manual Date Selection"
   - Set a start date and time
   - You should see a Manual Scheduling Preview showing the schedule

5. **Verify the Preview Shows**:
   - Total videos count
   - Shorts vs Regular videos
   - Your configuration settings
   - If smart mode: scheduling days and conflict analysis

## Expected Behavior

- **Smart Mode**: Preview appears immediately when selected, shows configuration details, and attempts to generate a smart schedule
- **Manual Mode**: Preview shows a simple schedule based on your selected date and time
- **Other Modes**: No scheduling preview (only shows for batch/single upload)

## Debug Information

The console will show debug messages like:
```
🔧 [DEBUG] Schedule mode changed to: delayed
🔧 [DEBUG] Triggering smart scheduling preview...
🔧 [DEBUG] Calling discover-videos API with smart scheduling parameters: {...}
🔧 [DEBUG] Smart scheduling response: {...}
```

If smart scheduling fails, check that:
1. You have run "Scan Channel" first
2. The channel cache exists
3. Your video folder contains valid videos

## What's Different Now

- **Before**: Preview was hidden at the bottom in Admin section
- **After**: Preview appears right after configuration and is mode-specific
- **Before**: Had to manually trigger preview
- **After**: Automatically triggered when smart mode is selected
- **Before**: Unclear how each mode works
- **After**: Clear explanations and configuration details shown 
// Simplified test script for smart scheduling with a short video
const config = {
  channelId: 'UCyEJy0X-TquYLnp0siZnvog',
  preferredTime: '07:00',
  slotInterval: '24h',
};

// Global variable to track scheduled videos
const existingByDateAndTime = new Map();

// Manually create a schedule with existing videos
function setupExistingSchedule() {
  console.log('🔍 Setting up existing schedule...');
  
  // Today's date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // Day after tomorrow
  const dayAfter = new Date();
  dayAfter.setDate(today.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];
  
  // Set up today's videos
  if (!existingByDateAndTime.has(todayStr)) {
    existingByDateAndTime.set(todayStr, new Map());
  }
  const todaySlots = existingByDateAndTime.get(todayStr);
  todaySlots.set('07:00', { regularVideos: true, shorts: true });
  
  // Set up tomorrow's videos - ALREADY HAS A SHORT at 07:00
  if (!existingByDateAndTime.has(tomorrowStr)) {
    existingByDateAndTime.set(tomorrowStr, new Map());
  }
  const tomorrowSlots = existingByDateAndTime.get(tomorrowStr);
  tomorrowSlots.set('07:00', { regularVideos: false, shorts: true });
  
  console.log('✅ Schedule setup complete');
  
  // Print the existing schedule
  console.log('\n=== EXISTING SCHEDULE ===');
  console.log('Date       | Time  | Regular | Short');
  console.log('---------------------------------------');
  
  [todayStr, tomorrowStr, dayAfterStr].forEach(date => {
    const slots = existingByDateAndTime.get(date) || new Map();
    const timeSlot = slots.get('07:00');
    
    const hasRegular = timeSlot?.regularVideos ? '  ✓   ' : '      ';
    const hasShort = timeSlot?.shorts ? '  ✓  ' : '     ';
    
    console.log(`${date} | 07:00 | ${hasRegular} | ${hasShort}`);
  });
}

// Try to schedule a new short video
function scheduleNewVideo(startDate) {
  console.log('\n=== SCHEDULING NEW SHORT VIDEO ===');
  console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);
  console.log(`Preferred time: ${config.preferredTime}`);
  
  let scheduled = false;
  let attempts = 0;
  let searchDate = new Date(startDate);
  let result = null;
  
  while (!scheduled && attempts < 14) {
    const dateStr = searchDate.toISOString().split('T')[0];
    const dayData = existingByDateAndTime.get(dateStr);
    const timeSlotData = dayData?.get(config.preferredTime);
    
    // Check if this time slot is available for a short
    const hasConflict = timeSlotData?.shorts;
    
    if (hasConflict) {
      console.log(`  × ${dateStr} ${config.preferredTime}: Conflict. A SHORT video is already scheduled for this slot.`);
    } else {
      // Schedule the video
      console.log(`  → Scheduled ${dateStr} ${config.preferredTime}`);
      
      // Update the tracking for the slot
      if (!existingByDateAndTime.has(dateStr)) {
        existingByDateAndTime.set(dateStr, new Map());
      }
      const dayDataMap = existingByDateAndTime.get(dateStr);
      if (!dayDataMap.has(config.preferredTime)) {
        dayDataMap.set(config.preferredTime, { regularVideos: false, shorts: false });
      }
      const slotData = dayDataMap.get(config.preferredTime);
      slotData.shorts = true;
      
      scheduled = true;
      result = {
        name: 'My New Short Video.mp4',
        type: 'short',
        scheduledDate: dateStr,
        scheduledTime: config.preferredTime,
      };
      break;
    }
    
    // Move to next day
    searchDate.setDate(searchDate.getDate() + 1);
    attempts++;
  }
  
  if (!scheduled) {
    console.log(`  ⚠️ Could not find an available slot in ${attempts} days`);
    return null;
  }
  
  return result;
}

// Run the test
console.log('🚀 Starting Smart Scheduling Test');
console.log('=================================');

// Set up existing schedule with videos
setupExistingSchedule();

// Try to schedule a new short video starting from tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const scheduledVideo = scheduleNewVideo(tomorrow);

// Show results
console.log('\n=== SCHEDULING RESULT ===');
if (scheduledVideo) {
  console.log(`Video: ${scheduledVideo.name} (SHORT)`);
  console.log(`Scheduled for: ${scheduledVideo.scheduledDate} at ${scheduledVideo.scheduledTime}`);
  console.log('✅ Successfully scheduled without conflicts');
} else {
  console.log('❌ Failed to schedule video');
}

// Show updated schedule
console.log('\n=== UPDATED SCHEDULE ===');
console.log('Date       | Time  | Regular | Short');
console.log('---------------------------------------');

// Show a calendar view of the next 7 days
const startDay = new Date();
for (let i = 0; i < 7; i++) {
  const currentDate = new Date(startDay);
  currentDate.setDate(currentDate.getDate() + i);
  const dateStr = currentDate.toISOString().split('T')[0];
  
  const dayData = existingByDateAndTime.get(dateStr);
  const timeSlotData = dayData?.get(config.preferredTime);
  
  const hasRegular = timeSlotData?.regularVideos ? '  ✓   ' : '      ';
  const hasShort = timeSlotData?.shorts ? '  ✓  ' : '     ';
  
  console.log(`${dateStr} | ${config.preferredTime} | ${hasRegular} | ${hasShort}`);
} 
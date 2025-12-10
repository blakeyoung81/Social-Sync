// Test script that simulates the REAL scheduling situation
// with shorts already scheduled for months ahead

const config = {
  channelId: 'UCyEJy0X-TquYLnp0siZnvog',
  preferredTime: '07:00',
  slotInterval: '24h',
};

// Global variable to track scheduled videos
const existingByDateAndTime = new Map();

// Set up the real schedule based on the cache data
function setupRealSchedule() {
  console.log('🔍 Setting up schedule based on real cache data...');
  
  // Today's date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Create dates for the next 90 days
  const dates = [];
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Scheduled shorts for the next several months
  // Based on the actual cache data
  const scheduledDates = [
    "2025-06-14", "2025-06-15", "2025-06-16", "2025-06-17", "2025-06-20", 
    "2025-06-21", "2025-07-09", "2025-07-10", "2025-07-11", "2025-07-12", 
    "2025-07-13", "2025-07-14", "2025-07-15", "2025-07-16", "2025-07-17", 
    "2025-07-18", "2025-07-19", "2025-07-20", "2025-07-21", "2025-07-22", 
    "2025-07-23", "2025-07-24", "2025-07-25", "2025-08-13", "2025-08-16", 
    "2025-08-17", "2025-08-18", "2025-08-19", "2025-08-20", "2025-08-21", 
    "2025-08-22", "2025-08-23", "2025-08-27", "2025-08-30", "2025-08-31", 
    "2025-09-01", "2025-09-02", "2025-09-05", "2025-09-06", "2025-09-12", 
    "2025-09-13", "2025-09-14", "2025-09-15", "2025-09-16", "2025-09-17", 
    "2025-09-18", "2025-09-19", "2025-09-20", "2025-09-21", "2025-09-22", 
    "2025-09-23", "2025-09-24", "2025-09-25", "2025-09-26", "2025-09-27", 
    "2025-09-28", "2025-09-29"
  ];
  
  // Mark all these dates as having shorts scheduled at 07:00
  scheduledDates.forEach(date => {
    if (!existingByDateAndTime.has(date)) {
      existingByDateAndTime.set(date, new Map());
    }
    const daySlots = existingByDateAndTime.get(date);
    daySlots.set('07:00', { regularVideos: false, shorts: true });
  });
  
  console.log(`✅ Schedule setup complete with ${scheduledDates.length} scheduled shorts`);
  
  // Print the next 14 days of the schedule
  console.log('\n=== EXISTING SCHEDULE (Next 14 Days) ===');
  console.log('Date       | Time  | Regular | Short');
  console.log('---------------------------------------');
  
  for (let i = 0; i < 14; i++) {
    const date = dates[i];
    const slots = existingByDateAndTime.get(date) || new Map();
    const timeSlot = slots.get('07:00');
    
    const hasRegular = timeSlot?.regularVideos ? '  ✓   ' : '      ';
    const hasShort = timeSlot?.shorts ? '  ✓  ' : '     ';
    
    console.log(`${date} | 07:00 | ${hasRegular} | ${hasShort}`);
  }
}

// Try to schedule a new short video
function scheduleNewVideo(startDate) {
  console.log('\n=== TRYING TO SCHEDULE NEW SHORT VIDEO ===');
  console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);
  console.log(`Preferred time: ${config.preferredTime}`);
  
  let scheduled = false;
  let attempts = 0;
  let searchDate = new Date(startDate);
  let result = null;
  
  while (!scheduled && attempts < 100) { // Try up to 100 days
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

// Find the next available date with no short scheduled
function findNextAvailableDate() {
  const today = new Date();
  let nextDate = null;
  let daysChecked = 0;
  
  for (let i = 0; i < 100; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayData = existingByDateAndTime.get(dateStr);
    const timeSlotData = dayData?.get(config.preferredTime);
    
    const hasShortScheduled = timeSlotData?.shorts;
    daysChecked++;
    
    if (!hasShortScheduled) {
      nextDate = dateStr;
      break;
    }
  }
  
  console.log(`\n=== NEXT AVAILABLE DATE ===`);
  console.log(`Checked ${daysChecked} days`);
  console.log(`Next available date with no short: ${nextDate || 'None found within 100 days'}`);
  
  return nextDate;
}

// Run the test
console.log('🚀 Starting Real-World Scheduling Test');
console.log('=====================================');

// Set up existing schedule with videos
setupRealSchedule();

// Find the next available date
const nextAvailableDate = findNextAvailableDate();

// Try to schedule a new short video starting from tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const scheduledVideo = scheduleNewVideo(tomorrow);

// Show results
console.log('\n=== SCHEDULING RESULT ===');
if (scheduledVideo) {
  console.log(`Video: ${scheduledVideo.name} (SHORT)`);
  console.log(`Scheduled for: ${scheduledVideo.scheduledDate} at ${scheduledVideo.scheduledTime}`);
  console.log(`Days from now: ${Math.round((new Date(scheduledVideo.scheduledDate) - new Date()) / (1000 * 60 * 60 * 24))}`);
  console.log('✅ Successfully scheduled without conflicts');
} else {
  console.log('❌ Failed to schedule video');
} 
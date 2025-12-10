import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const data = await request.json();
        const {
            inputFolder,
            startDate,
            memberOnlyPeriod = 24, // hours
            morningTime = '07:00',
            eveningTime = '19:00',
            enableMemberOnly = false,
        } = data;

        console.log('🎬 [DUAL SHORTS SCHEDULER] Processing request:', {
            inputFolder,
            startDate,
            memberOnlyPeriod,
            morningTime,
            eveningTime,
            enableMemberOnly,
        });

        // Generate dual shorts schedule
        const schedule = await generateDualShortsSchedule({
            inputFolder,
            startDate,
            memberOnlyPeriod,
            morningTime,
            eveningTime,
            enableMemberOnly,
        });

        return NextResponse.json({
            success: true,
            schedule,
            message: `Scheduled ${schedule.length} shorts with dual daily posting`,
        });

    } catch (error) {
        console.error('❌ [DUAL SHORTS SCHEDULER] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

interface DualShortsScheduleOptions {
    inputFolder: string;
    startDate: string;
    memberOnlyPeriod: number;
    morningTime: string;
    eveningTime: string;
    enableMemberOnly: boolean;
}

async function generateDualShortsSchedule(options: DualShortsScheduleOptions) {
    const {
        inputFolder,
        startDate,
        memberOnlyPeriod,
        morningTime,
        eveningTime,
        enableMemberOnly,
    } = options;

    // Import the discover videos function
    const { discoverVideos } = await import('../discover-videos/route');
    
    // Get all shorts from the folder
    const response = await discoverVideos(inputFolder, true, false, startDate);
    const videoData = await response.json();
    
    const shorts = videoData.videos?.filter((v: any) => v.type === 'short') || [];
    console.log(`📱 Found ${shorts.length} shorts to schedule`);

    const schedule: any[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < shorts.length; i += 2) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Morning short
        if (shorts[i]) {
            const morningSchedule = {
                ...shorts[i],
                scheduledDate: dateStr,
                scheduledTime: morningTime,
                privacyStatus: enableMemberOnly ? 'private' : 'public',
                publishAt: `${dateStr}T${morningTime}:00.000Z`,
            };

            // Add public release schedule if member-only is enabled
            if (enableMemberOnly) {
                const publicDate = new Date(currentDate);
                publicDate.setDate(publicDate.getDate() + Math.floor(memberOnlyPeriod / 24));
                publicDate.setHours(publicDate.getHours() + (memberOnlyPeriod % 24));
                
                morningSchedule.publicReleaseAt = publicDate.toISOString();
                morningSchedule.memberOnlyPeriod = memberOnlyPeriod;
            }

            schedule.push(morningSchedule);
        }

        // Evening short
        if (shorts[i + 1]) {
            const eveningSchedule = {
                ...shorts[i + 1],
                scheduledDate: dateStr,
                scheduledTime: eveningTime,
                privacyStatus: enableMemberOnly ? 'private' : 'public',
                publishAt: `${dateStr}T${eveningTime}:00.000Z`,
            };

            // Add public release schedule if member-only is enabled
            if (enableMemberOnly) {
                const publicDate = new Date(currentDate);
                publicDate.setDate(publicDate.getDate() + Math.floor(memberOnlyPeriod / 24));
                publicDate.setHours(publicDate.getHours() + (memberOnlyPeriod % 24));
                
                eveningSchedule.publicReleaseAt = publicDate.toISOString();
                eveningSchedule.memberOnlyPeriod = memberOnlyPeriod;
            }

            schedule.push(eveningSchedule);
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ Generated schedule for ${schedule.length} shorts across ${Math.ceil(shorts.length / 2)} days`);
    
    return schedule;
}

// Helper function to be used by other parts of the application
export async function discoverVideos(inputFolder: string, analyzeTypes: boolean, generateSchedule: boolean, scheduleDate?: string) {
    // This is a reference to the existing discover-videos functionality
    // In a real implementation, you'd import and call the actual function
    const response = await fetch('/api/discover-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            inputFolder,
            analyzeTypes,
            generateSchedule,
            scheduleDate,
        }),
    });
    
    return response;
}

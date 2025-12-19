import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connections = await prisma.socialConnection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        platformUserId: true,
        createdAt: true,
      },
    });

    // Format for frontend
    const formattedConnections = connections.map(conn => ({
      id: conn.id,
      platform: conn.platform,
      platformUsername: conn.platformUsername,
      platformUserId: conn.platformUserId,
      connected: true,
    }));

    return NextResponse.json({
      connections: formattedConnections,
    });

  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';

export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Fetch the team
    const team = await Team.findOne({ teamId, paymentStatus: 'PAID' });
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found or payment not verified.' }, { status: 404 });
    }

    // Check if already present
    if (team.attendance?.present) {
      return NextResponse.json({ 
        error: `Team ${team.teamName} is already checked in.`,
        alreadyCheckedIn: true 
      }, { status: 400 });
    }

    // Mark as present
    team.attendance = {
      present: true,
      checkedAt: new Date()
    };
    
    await team.save();

    return NextResponse.json({
      success: true,
      teamId: team.teamId,
      teamName: team.teamName,
      leaderName: team.teamLeader.name,
      membersCount: team.teamSize,
    });

  } catch (err) {
    console.error('[attendance]', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

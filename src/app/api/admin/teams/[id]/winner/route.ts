import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Team from '@/models/Team';

// Handle POST request to toggle/set winner status
export async function POST(
    request: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const authHeader = request.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!mongoose.connections[0].readyState) {
            await mongoose.connect(process.env.MONGODB_URI as string);
        }

        const body = await request.json();
        const { isWinner, winnerTitle } = body;

        const team = await Team.findByIdAndUpdate(
            id,
            { isWinner, winnerTitle: isWinner ? winnerTitle || 'Winner' : '' },
            { new: true }
        );

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, team });
    } catch (error) {
        console.error('Error updating winner status:', error);
        return NextResponse.json(
            { error: 'Failed to update team winner status' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.ADMIN_PASSWORD}`;
  return auth === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const participants = await Participant.find().sort({ createdAt: 1 }).lean();

    const rows: string[] = [
      'Team ID,Name,Email,College Email,Reg No,Phone,Team Type,Partner Name,Partner Email,Partner College Email,Partner Reg No,Partner Phone,RSVP Status,RSVP At,Round 1 Attendance,Round 1 Checked In At,Round 2 Attendance,Round 2 Checked In At,Round 1 Score,Shortlisted,Registered At',
    ];

    for (const p of participants) {
      rows.push(
        [
          p.participantId,
          `"${p.name}"`,
          p.email,
          p.collegeEmail,
          p.regNo,
          p.phone,
          p.teamType,
          p.partner ? `"${p.partner.name}"` : '',
          p.partner ? p.partner.email : '',
          p.partner ? p.partner.collegeEmail : '',
          p.partner ? p.partner.regNo : '',
          p.partner ? p.partner.phone : '',
          p.rsvpStatus,
          p.rsvpAt ? `"${new Date(p.rsvpAt).toLocaleString('en-IN')}"` : 'N/A',
          p.attendanceRound1?.present || p.attendance?.present ? 'Present' : 'Absent',
          p.attendanceRound1?.checkedAt
            ? `"${new Date(p.attendanceRound1.checkedAt).toLocaleString('en-IN')}"`
            : p.attendance?.checkedAt
              ? `"${new Date(p.attendance.checkedAt).toLocaleString('en-IN')}"`
              : 'N/A',
          p.attendanceRound2?.present ? 'Present' : 'Absent',
          p.attendanceRound2?.checkedAt ? `"${new Date(p.attendanceRound2.checkedAt).toLocaleString('en-IN')}"` : 'N/A',
          p.round1Score ?? '',
          p.isShortlisted ? 'Yes' : 'No',
          `"${new Date(p.createdAt).toLocaleString('en-IN')}"`,
        ].join(',')
      );
    }

    const csvContent = rows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="espionage-participants-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[admin/export]', err);
    return NextResponse.json({ error: 'Failed to export.' }, { status: 500 });
  }
}
